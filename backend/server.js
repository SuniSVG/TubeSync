require("dotenv").config();
console.log("🔥 SERVER ĐANG CHẠY");

const https   = require("https");
const express = require("express");
const multer  = require("multer");
const { google } = require("googleapis");
const cors  = require("cors");
const fs    = require("fs");
const fsp   = require("fs").promises;
const path  = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

/* ============================================================
   CONFIG
   ============================================================ */

app.use(cors({
  origin: [process.env.FRONTEND_URL || "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ============================================================
   MULTER  —  lưu tạm vào /uploads
   ============================================================ */

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB
});

/* ============================================================
   SUPABASE  (service key — chỉ dùng server-side)
   ============================================================ */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ============================================================
   HELPER: lấy user từ Supabase JWT
   ============================================================ */

async function getUserFromToken(req) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) throw new Error("Thiếu Authorization header.");

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error("Token không hợp lệ hoặc đã hết hạn.");

  return data.user;
}

/* ============================================================
   HELPER: tạo Drive client từ token của user (OAuth2)
   - FIX: scope drive.file là đủ khi app TỰ tạo file
   - FIX: refresh token đúng cách, lưu lại DB sau khi refresh
   ============================================================ */

async function getDriveClient(userId) {
  // 1. Lấy channel record từ DB
  const { data: channels, error } = await supabase
    .from("youtube_channels")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  if (error) throw new Error("DB error: " + error.message);
  if (!channels || channels.length === 0)
    throw new Error("Chưa kết nối Google. Vào Settings để kết nối lại.");

  const channel = channels[0];

  if (!channel.access_token || !channel.refresh_token)
    throw new Error("Thiếu token. Vào Settings → Kết nối lại Google.");

  // 2. Tạo OAuth2 client CHO RIÊNG request này (tránh race condition)
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  const expiryDate = channel.expires_at
    ? new Date(channel.expires_at).getTime()
    : 0;

  client.setCredentials({
    access_token:  channel.access_token,
    refresh_token: channel.refresh_token,
    expiry_date:   expiryDate,
  });

  // 3. Refresh nếu token sắp hết hạn (còn < 5 phút)
  const needsRefresh = expiryDate === 0 || Date.now() > expiryDate - 5 * 60 * 1000;

  if (needsRefresh) {
    console.log(`[${userId}] Token sắp hết hạn — đang refresh...`);
    try {
      const { credentials } = await client.refreshAccessToken();

      // Lưu token mới vào DB
      const newExpiry = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null;
      await supabase
        .from("youtube_channels")
        .update({
          access_token:  credentials.access_token,
          refresh_token: credentials.refresh_token || channel.refresh_token,
          expires_at:    newExpiry,
        })
        .eq("id", channel.id);

      client.setCredentials(credentials);
      console.log(`[${userId}] Refresh token thành công.`);
    } catch (err) {
      const detail = err.response?.data?.error || err.message;
      console.error("REFRESH FAIL:", detail);

      // invalid_grant = user đã revoke hoặc token quá cũ
      if (detail === "invalid_grant") {
        throw new Error("Token đã bị thu hồi. Vào Settings → Kết nối lại Google.");
      }
      throw new Error("Không thể refresh token: " + detail);
    }
  }

  return google.drive({ version: "v3", auth: client });
}

/* ============================================================
   ROUTE: Google OAuth — bắt đầu flow
   ============================================================ */

app.get("/auth/google", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Thiếu token.");

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).send("Token không hợp lệ.");

    const userId = data.user.id;
    console.log("OAuth start — user:", userId);

    // Tạo client tạm để generate URL
    const tempClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    const url = tempClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent select_account", // consent bắt buộc để nhận refresh_token
      scope: [
        // FIX: drive.file đủ dùng (chỉ cần quyền tạo/đọc file do app tạo)
        // Nếu cần đọc file ngoài app thêm: "https://www.googleapis.com/auth/drive.readonly"
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/youtube.upload",
      ],
      state: userId,
    });

    res.redirect(url);
  } catch (err) {
    console.error("Auth start error:", err);
    res.status(500).send("Lỗi server.");
  }
});

/* ============================================================
   ROUTE: Google OAuth — callback
   ============================================================ */

app.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state: userId, error: oauthError } = req.query;

    if (oauthError) {
      console.error("OAuth user denied:", oauthError);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=0&reason=${oauthError}`);
    }

    if (!code || !userId) return res.status(400).send("Thiếu code hoặc state.");

    const tempClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    const { tokens } = await tempClient.getToken(code);

    if (!tokens.refresh_token) {
      // Xảy ra khi user đã authorize trước đó nhưng không có prompt=consent
      console.warn("Không nhận được refresh_token. User cần revoke app và authorize lại.");
    }

    // Lấy thêm thông tin kênh YouTube nếu muốn lưu channel_name
    let channelName = "Connected Account";
    let ytChannelId = "default";
    try {
      tempClient.setCredentials(tokens);
      const yt = google.youtube({ version: "v3", auth: tempClient });
      const { data } = await yt.channels.list({ part: "snippet", mine: true });
      if (data.items?.length > 0) {
        channelName = data.items[0].snippet.title;
        ytChannelId = data.items[0].id;
      }
    } catch (ytErr) {
      console.warn("Không lấy được channel name:", ytErr.message);
    }

    await supabase.from("youtube_channels").upsert(
      {
        user_id:            userId,
        access_token:       tokens.access_token,
        refresh_token:      tokens.refresh_token,
        expires_at:         tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        youtube_channel_id: ytChannelId,
        channel_name:       channelName,
      },
      { onConflict: "user_id" }
    );

    console.log(`OAuth callback OK — user: ${userId}, channel: ${channelName}`);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=1`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=0&reason=server_error`);
  }
});

/* ============================================================
   ROUTE: Upload file lên Google Drive
   ============================================================ */

app.post("/upload", upload.single("file"), async (req, res) => {
  const tempPath = req.file?.path;

  try {
    // 1. Xác thực user
    const user = await getUserFromToken(req);
    console.log(`[Upload] User: ${user.id}, File: ${req.file?.originalname}`);

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Không có file." });
    }

    // 2. Lấy Drive client (có refresh tự động)
    const drive = await getDriveClient(user.id);

    // 3. Upload lên Drive
    // FIX: trả về cả fileId lẫn fileUrl (frontend cần fileId để lưu DB)
    const uploadResponse = await drive.files.create({
      requestBody: {
        name:    req.file.originalname,
        // Nếu muốn upload vào folder cụ thể:
        // parents: [process.env.DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: req.file.mimetype || "video/mp4",
        body:     fs.createReadStream(tempPath),
      },
      fields: "id, name, webViewLink",
    });

    const fileId  = uploadResponse.data.id;
    const fileUrl = uploadResponse.data.webViewLink ||
                    `https://drive.google.com/file/d/${fileId}/view`;

    // 4. Set public read permission (để Python worker có thể tải về)
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    // 5. Xóa file tạm
    await fsp.unlink(tempPath);

    console.log(`[Upload] Thành công — Drive ID: ${fileId}`);

    res.json({
      success: true,
      fileId,         // ← Python worker dùng cái này để tải
      fileUrl,
    });

  } catch (err) {
    let errorMsg = err.message || "Lỗi không xác định";
    
    // Bắt lỗi thiếu scope và hướng dẫn người dùng
    if (errorMsg.includes("insufficient authentication scopes")) {
      errorMsg = "Ứng dụng thiếu quyền truy cập Drive. Vui lòng vào Settings -> Kết nối lại kênh YouTube.";
    }

    console.error("[Upload] ERROR:", errorMsg);

    // Xóa file tạm dù lỗi
    if (tempPath) {
      try { await fsp.unlink(tempPath); } catch {}
    }
    
    const status = 
      errorMsg.includes("Vui lòng") ? 403 :
      errorMsg.includes("Token") || errorMsg.includes("grant") ? 401 :
      500;

    res.status(status).json({ success: false, error: errorMsg });
  }
});

/* ============================================================
   HEALTHCHECK
   ============================================================ */

app.get("/health", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

/* ============================================================
   START
   ============================================================ */

const PORT = process.env.PORT || 3001;

// Chạy HTTPS để tương thích với frontend https://localhost:3000
// cert.pem và key.pem phải nằm cùng thư mục với server.js
let sslOptions;
try {
  sslOptions = {
    key:  fs.readFileSync(path.join(__dirname, "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert.pem")),
  };
} catch (err) {
  console.error("❌ ERROR: Missing SSL certificates (key.pem/cert.pem) in backend folder.");
  console.error("Please generate them using mkcert or openssl.");
  process.exit(1);
}

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🚀 Backend chạy tại https://localhost:${PORT}`);
});