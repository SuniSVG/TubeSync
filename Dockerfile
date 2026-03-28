FROM node:20

WORKDIR /app
COPY . .

# Cài Python
RUN apt-get update && \
    apt-get install -y python3 python3-venv python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Tạo venv
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Cài dependencies
RUN npm install
RUN pip install --no-cache-dir -r requirements.txt

# 🔥 BUILD NEXT (QUAN TRỌNG)
RUN npm run build

# Run app
CMD ["npm", "start"]