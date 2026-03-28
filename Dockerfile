FROM node:20

WORKDIR /app
COPY . .

# Cài Python + venv
RUN apt-get update && \
    apt-get install -y python3 python3-venv python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Tạo virtual environment
RUN python3 -m venv /venv

# Dùng venv
ENV PATH="/venv/bin:$PATH"

# Cài node deps
RUN npm install

# Cài python deps
RUN pip install --no-cache-dir -r requirements.txt

# Chạy app
CMD ["npm", "start"]