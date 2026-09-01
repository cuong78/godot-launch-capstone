FROM python:3.11-slim

# OpenCV runtime + ffmpeg (cắt frame video cho AI review)
# Use a nearby Debian mirror; the default CDN is very slow from the production VPS.
RUN awk 'BEGIN { changed=0 } !changed && $0 == "URIs: http://deb.debian.org/debian" { $0="URIs: https://mirror.kku.ac.th/debian"; changed=1 } { print }' /etc/apt/sources.list.d/debian.sources > /tmp/debian.sources \
    && mv /tmp/debian.sources /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache model Hugging Face (CLIP, NSFW) vào /models — mount volume để khỏi tải lại mỗi lần restart
ENV HF_HOME=/models
ENV INSIGHTFACE_HOME=/models/insightface
ENV TRANSFORMERS_OFFLINE=0

# torch CPU-only TRƯỚC (index riêng của PyTorch) — tránh kéo ~3GB NVIDIA/CUDA không dùng.
# Bản CPU ~190MB thay vì ~2.5GB GPU. Service chạy CPU, không cần CUDA.
RUN pip install --default-timeout=1000 --retries 10 --no-cache-dir torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cache-bust CHỈ từ đây trở xuống — khi build cache bị lệch (COPY . . báo
# CACHED sai dù code đã đổi), truyền --build-arg CACHE_BUST=$(date +%s) để
# ép build lại code + CMD mà KHÔNG phải xây lại dependencies như
# --no-cache. Không truyền gì thì behave y hệt trước đây (build cache bình
# thường theo checksum nội dung).
ARG CACHE_BUST=0
RUN echo "cache-bust: $CACHE_BUST" > /dev/null

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
