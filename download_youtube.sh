#!/bin/bash
# Script para descargar videos de YouTube usando Docker (sin construir imagen)

# Verificar que se proporcionó una URL
if [ -z "$1" ]; then
    echo "Uso: ./download_youtube.sh <URL_DE_YOUTUBE> [directorio_salida]"
    echo ""
    echo "Ejemplo:"
    echo "  ./download_youtube.sh https://www.youtube.com/watch?v=VIDEO_ID"
    echo "  ./download_youtube.sh https://www.youtube.com/watch?v=VIDEO_ID mis_videos"
    exit 1
fi

URL="$1"
OUTPUT_DIR="${2:-downloads}"

# Crear directorios necesarios
mkdir -p "$OUTPUT_DIR"
mkdir -p .python-packages

# Ejecutar el contenedor usando imagen Python existente
docker run --rm \
    -v "$(pwd)/.python-packages:/app/.python-packages" \
    -v "$(pwd)/$OUTPUT_DIR:/app/downloads" \
    -v "$(pwd)/youtube_downloader.py:/app/youtube_downloader.py" \
    -w /app \
    python:3.11-slim \
    bash -c "apt-get update -qq && \
             apt-get install -y -qq ffmpeg > /dev/null 2>&1 && \
             pip install --quiet --target /app/.python-packages yt-dlp && \
             PYTHONPATH=/app/.python-packages:\$PYTHONPATH python youtube_downloader.py '$URL' downloads"
