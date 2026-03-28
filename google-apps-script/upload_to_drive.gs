/**
 * GOOGLE APPS SCRIPT (GAS) FOR TUBESYNC PRO
 * 
 * Purpose: Receives video files from the Next.js frontend and saves them to a specific Google Drive folder.
 * Returns the Google Drive File ID and URL to be saved in Supabase.
 * 
 * Deployment Instructions:
 * 1. Go to script.google.com and create a new project.
 * 2. Paste this code into Code.gs.
 * 3. Replace 'YOUR_GOOGLE_DRIVE_FOLDER_ID' with the actual ID of the folder where you want to store videos.
 * 4. Click "Deploy" -> "New deployment".
 * 5. Select type "Web app".
 * 6. Execute as: "Me" (your Google account).
 * 7. Who has access: "Anyone".
 * 8. Copy the Web App URL and use it in your Next.js frontend as the upload endpoint.
 */

// Replace with the ID of the folder where you want to store the uploaded videos
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';

function doPost(e) {
  try {
    // Check if postData exists
    if (!e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: "No data received."
      });
    }

    // Parse the incoming JSON payload
    // Expected format: { "filename": "video.mp4", "mimeType": "video/mp4", "base64Data": "..." }
    const data = JSON.parse(e.postData.contents);
    const fileContent = data.base64Data;
    const filename = data.filename;
    const mimeType = data.mimeType || 'video/mp4';

    if (!fileContent || !filename) {
      return createJsonResponse({
        success: false,
        error: "Missing file content or filename."
      });
    }

    // Decode the base64 string
    const decodedData = Utilities.base64Decode(fileContent);
    const blob = Utilities.newBlob(decodedData, mimeType, filename);

    // Get the target folder in Google Drive
    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Create the file in the folder
    const file = folder.createFile(blob);

    // Return success response with file details
    return createJsonResponse({
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      size: file.getSize(),
      name: file.getName()
    });

  } catch (error) {
    // Handle any errors during the process
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Helper function to create JSON responses with CORS headers
 */
function createJsonResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle OPTIONS request for CORS (Cross-Origin Resource Sharing)
 * Required when calling this Web App from a Next.js frontend (browser)
 */
function doOptions(e) {
  // GAS handles CORS automatically for Web Apps, but having an empty doOptions 
  // can sometimes help with preflight requests depending on the client setup.
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
