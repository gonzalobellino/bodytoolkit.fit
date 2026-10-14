import { useCallback, useRef, useState } from 'react';
import {
  fileLooksLikeHevc,
  noticeForDecodedVideo,
  type VideoPlaybackNotice,
} from '../utils/videoPlayback';

export function useVideoPlaybackNotice(): {
  notice: VideoPlaybackNotice | null;
  inspectFile: (file: File) => void;
  inspectVideo: (video: HTMLVideoElement | null, commit?: boolean) => void;
  reset: () => void;
} {
  const hevcRef = useRef(false);
  const decodedRef = useRef(false);
  const requestRef = useRef(0);
  const [notice, setNotice] = useState<VideoPlaybackNotice | null>(null);

  const reset = useCallback(() => {
    requestRef.current += 1;
    hevcRef.current = false;
    decodedRef.current = false;
    setNotice(null);
  }, []);

  const inspectFile = useCallback((file: File) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    hevcRef.current = false;
    decodedRef.current = false;
    setNotice(null);

    void fileLooksLikeHevc(file).then((hevc) => {
      if (requestRef.current !== requestId) return;
      hevcRef.current = hevc;
      if (hevc && !decodedRef.current) {
        setNotice(noticeForDecodedVideo(0, 0, true));
      }
    });
  }, []);

  const inspectVideo = useCallback((video: HTMLVideoElement | null, commit = false) => {
    if (!video || video.srcObject) return;
    const decoded = video.videoWidth > 0 && video.videoHeight > 0;
    if (!decoded && !commit) return;
    decodedRef.current = decoded;
    setNotice(noticeForDecodedVideo(video.videoWidth, video.videoHeight, hevcRef.current));
  }, []);

  return { notice, inspectFile, inspectVideo, reset };
}
