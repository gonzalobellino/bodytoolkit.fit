#!/usr/bin/env python3
"""
Script simple para descargar videos de YouTube usando yt-dlp
"""

import sys
from pathlib import Path

try:
    import yt_dlp
except ImportError:
    print("Error: yt-dlp no está instalado.")
    print("Instálalo con: pip install -U yt-dlp")
    sys.exit(1)


def download_video(url, output_dir='downloads'):
    """
    Descarga un video de YouTube en la mejor calidad disponible
    
    Args:
        url: URL del video de YouTube
        output_dir: Directorio donde guardar el video
    """
    # Crear directorio de salida si no existe
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Configurar opciones de yt-dlp
    ydl_opts = {
        'outtmpl': str(output_path / '%(title)s.%(ext)s'),
        'format': 'bestvideo+bestaudio/best',
        'merge_output_format': 'mp4',
    }
    
    # Descargar el video
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Descargando: {url}")
            ydl.download([url])
        print("\n✓ Video descargado exitosamente!")
    except Exception as e:
        print(f"\n✗ Error al descargar: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("Uso: python youtube_downloader.py <URL_DE_YOUTUBE> [directorio_salida]")
        print("\nEjemplo:")
        print("  python youtube_downloader.py https://www.youtube.com/watch?v=VIDEO_ID")
        print("  python youtube_downloader.py https://www.youtube.com/watch?v=VIDEO_ID mis_videos")
        sys.exit(1)
    
    url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'downloads'
    
    download_video(url, output_dir)


if __name__ == '__main__':
    main()
