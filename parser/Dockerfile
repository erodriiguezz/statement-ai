FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Native OCR dependency for scanned statements
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && tesseract --version \
    && test -x /usr/bin/tesseract

ENV TESSERACT_CMD=/usr/bin/tesseract

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

# Render sets $PORT
ENV PORT=10000
EXPOSE 10000

# Single worker keeps free-tier memory under control; timeout helps long OCR jobs.
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers 1 --timeout-keep-alive 75"]
