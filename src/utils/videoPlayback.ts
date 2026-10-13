export const VIDEO_LONG_EDGE_LIMIT = 4096;

export const UNDECODABLE_VIDEO_MESSAGE =
  'This browser cannot show the picture in this video (often HEVC/H.265 from phones). Audio may still play. Export it as H.264 MP4 and load it again.';

export const OVERSIZED_VIDEO_MESSAGE =
  'This video is larger than 4096px on the long side, which can make the picture disappear while audio keeps playing. It is shown fitted to the screen.';

const HEVC_TOKENS = ['hvc1', 'hev1', 'hvcC', 'dvh1', 'dvhe'];

export type VideoPlaybackNotice = {
  tone: 'error' | 'info';
  message: string;
};

function bytesLookLikeHevc(bytes: Uint8Array): boolean {
  const text = new TextDecoder('latin1').decode(bytes);
  return HEVC_TOKENS.some((token) => text.includes(token));
}

/** Read only the head and tail of the file. Does not decode the video. */
export async function fileLooksLikeHevc(file: File): Promise<boolean> {
  const windowSize = 2 * 1024 * 1024;
  const ranges: Array<[number, number]> = [[0, Math.min(file.size, windowSize)]];
  if (file.size > windowSize) {
    ranges.push([Math.max(0, file.size - windowSize), file.size]);
  }

  for (const [start, end] of ranges) {
    if (end <= start) continue;
    const bytes = new Uint8Array(await file.slice(start, end).arrayBuffer());
    if (bytesLookLikeHevc(bytes)) return true;
  }
  return false;
}

export function noticeForDecodedVideo(
  videoWidth: number,
  videoHeight: number,
  hevc: boolean
): VideoPlaybackNotice | null {
  const decoded = videoWidth > 0 && videoHeight > 0;
  if (!decoded || (hevc && !decoded)) {
    return { tone: 'error', message: UNDECODABLE_VIDEO_MESSAGE };
  }
  if (Math.max(videoWidth, videoHeight) > VIDEO_LONG_EDGE_LIMIT) {
    return { tone: 'info', message: OVERSIZED_VIDEO_MESSAGE };
  }
  return null;
}
