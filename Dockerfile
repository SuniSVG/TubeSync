FROM node:20

WORKDIR /app
COPY . .

# Cài Python
RUN apt-get update && \
    apt-get install -y python3 python3-pip

# Cài node deps
RUN npm install

# Cài python deps (nếu có)
RUN pip install -r requirements.txt

# Chạy tất cả (cần tool như concurrently)
CMD ["npm", "start"]