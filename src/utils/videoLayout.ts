export interface ContainLayout {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

export function getContainLayout(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number
): ContainLayout {
  if (!containerWidth || !containerHeight || !mediaWidth || !mediaHeight) {
    return {
      drawWidth: mediaWidth || containerWidth,
      drawHeight: mediaHeight || containerHeight,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const containerRatio = containerWidth / containerHeight;
  const mediaRatio = mediaWidth / mediaHeight;

  if (mediaRatio > containerRatio) {
    const drawWidth = containerWidth;
    const drawHeight = containerWidth / mediaRatio;
    return {
      drawWidth,
      drawHeight,
      offsetX: 0,
      offsetY: (containerHeight - drawHeight) / 2,
    };
  }

  const drawHeight = containerHeight;
  const drawWidth = containerHeight * mediaRatio;
  return {
    drawWidth,
    drawHeight,
    offsetX: (containerWidth - drawWidth) / 2,
    offsetY: 0,
  };
}
