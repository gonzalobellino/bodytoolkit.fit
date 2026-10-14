import { useCallback, RefObject } from 'react';
import { createWatermarkedCanvas } from '../utils/watermark';

export interface UseExportShareOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  title?: string;
  filenamePrefix?: string;
}

export interface ExportShareHandlers {
  handleExport: () => Promise<void>;
  handleShare: () => Promise<void>;
}

export function useExportShare({
  canvasRef,
  title = 'Analysis',
  filenamePrefix = 'analysis',
}: UseExportShareOptions): ExportShareHandlers {

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = await createWatermarkedCanvas(canvas);
    if (!exportCanvas) return;

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filenamePrefix}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [canvasRef, filenamePrefix]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('No content to share');
      return;
    }
    
    try {
      const exportCanvas = await createWatermarkedCanvas(canvas);
      if (!exportCanvas) {
        alert('Failed to prepare image');
        return;
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, 'image/png');
      });
      
      if (!blob) {
        alert('Failed to create image');
        return;
      }
      
      const file = new File([blob], `${filenamePrefix}-${Date.now()}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title,
          text: `Check out my ${title.toLowerCase()}!`,
          files: [file]
        });
      } else {
        // Fallback: download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        alert('Failed to share. Please try again.');
      }
    }
  }, [canvasRef, filenamePrefix, title]);

  return {
    handleExport,
    handleShare,
  };
}
