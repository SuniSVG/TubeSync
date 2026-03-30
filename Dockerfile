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
RUN pip install -r requirements.txt

# 🔥 BUILD NEXT (QUAN TRỌNG)
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN npm run build

# Run app
CMD ["npm", "start"]