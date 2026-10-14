type WatermarkOptions = {
  text?: string;
  logoSrc?: string;
  textColor?: string;
  backgroundColor?: string;
  textOpacity?: number;
  backgroundOpacity?: number;
};

const defaultLogoSrc = '/images/logo.svg';
let logoPromise: Promise<HTMLImageElement | null> | null = null;

const loadLogo = (src: string): Promise<HTMLImageElement | null> => {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  return logoPromise;
};

export const drawWatermark = async (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WatermarkOptions = {}
): Promise<void> => {
  const text = options.text ?? 'CES Toolkit';
  const logoSrc = options.logoSrc ?? defaultLogoSrc;
  const textColor = options.textColor ?? '#0f172a';
  const backgroundColor = options.backgroundColor ?? '#ffffff';
  const textOpacity = options.textOpacity ?? 0.8;
  const backgroundOpacity = options.backgroundOpacity ?? 0.4;

  const minDim = Math.min(width, height);
  const padding = Math.max(8, Math.round(minDim * 0.01));
  const fontSize = Math.max(10, Math.round(minDim * 0.018));
  const logoHeight = Math.max(14, Math.round(minDim * 0.04));
  const gap = Math.round(fontSize * 0.5);

  const logo = await loadLogo(logoSrc);
  const logoWidth = logo ? (logo.width / logo.height) * logoHeight : 0;

  ctx.save();
  ctx.font = `600 ${fontSize}px sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const contentWidth = logoWidth ? logoWidth + gap + textWidth : textWidth;
  const boxHeight = Math.max(logoHeight, fontSize);

  let x = width - contentWidth - padding;
  let y = height - boxHeight - padding;
  if (x < padding) x = padding;
  if (y < padding) y = padding;

  ctx.globalAlpha = backgroundOpacity;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x - padding * 0.5, y - padding * 0.5, contentWidth + padding, boxHeight + padding);

  const centerY = y + boxHeight / 2;
  ctx.globalAlpha = textOpacity;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  if (logo) {
    ctx.drawImage(logo, x, centerY - logoHeight / 2, logoWidth, logoHeight);
  }
  ctx.fillText(text, x + (logo ? logoWidth + gap : 0), centerY);
  ctx.restore();
};

export const createWatermarkedCanvas = async (
  baseCanvas: HTMLCanvasElement,
  options?: WatermarkOptions
): Promise<HTMLCanvasElement | null> => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = baseCanvas.width;
  exportCanvas.height = baseCanvas.height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(baseCanvas, 0, 0);
  await drawWatermark(ctx, exportCanvas.width, exportCanvas.height, options);
  return exportCanvas;
};
