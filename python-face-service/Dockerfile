FROM python:3.11-slim

# dlib build dependencies + ffmpeg (cắt frame video cho AI review)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache model Hugging Face (CLIP, NSFW) vào /models — mount volume để khỏi tải lại mỗi lần restart
ENV HF_HOME=/models
ENV TRANSFORMERS_OFFLINE=0

# torch CPU-only TRƯỚC (index riêng của PyTorch) — tránh kéo ~3GB NVIDIA/CUDA không dùng.
# Bản CPU ~190MB thay vì ~2.5GB GPU. Service chạy CPU, không cần CUDA.
RUN pip install --no-cache-dir torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
