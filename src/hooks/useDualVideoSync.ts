import { useState, useCallback } from 'react';

interface UseDualVideoSyncOptions {
  video1Ref: React.RefObject<HTMLVideoElement>;
  video2Ref: React.RefObject<HTMLVideoElement>;
  locked: boolean;
}

/** Only exposes control functions — video state (currentTime, duration, isPlaying)
 *  is tracked directly in the component via onTimeUpdate / onPlay / etc. handlers,
 *  which avoids the event-listener timing bug caused by conditionally rendered videos. */
export function useDualVideoSync({ video1Ref, video2Ref, locked }: UseDualVideoSyncOptions) {
  const [playbackRate, setPlaybackRate] = useState(1);

  const playBoth = useCallback(() => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (v1) { v1.playbackRate = playbackRate; v1.play().catch(() => {}); }
    if (v2) { v2.playbackRate = playbackRate; v2.play().catch(() => {}); }
  }, [video1Ref, video2Ref, playbackRate]);

  const pauseBoth = useCallback(() => {
    video1Ref.current?.pause();
    video2Ref.current?.pause();
  }, [video1Ref, video2Ref]);

  const playSingle = useCallback((num: 1 | 2) => {
    const v = num === 1 ? video1Ref.current : video2Ref.current;
    if (v) { v.playbackRate = playbackRate; v.play().catch(() => {}); }
  }, [video1Ref, video2Ref, playbackRate]);

  const pauseSingle = useCallback((num: 1 | 2) => {
    const v = num === 1 ? video1Ref.current : video2Ref.current;
    v?.pause();
  }, [video1Ref, video2Ref]);

  /** Always seeks only the specified video — positions are never auto-synced. */
  const seek = useCallback((time: number, videoNum: 1 | 2) => {
    const v = videoNum === 1 ? video1Ref.current : video2Ref.current;
    if (v) v.currentTime = time;
  }, [video1Ref, video2Ref]);

  const setSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (video1Ref.current) video1Ref.current.playbackRate = rate;
    if (video2Ref.current) video2Ref.current.playbackRate = rate;
  }, [video1Ref, video2Ref]);

  /** Step one frame. When locked both videos step; otherwise only the given video. */
  const step = useCallback((direction: number, frameRate = 30, videoNum: 1 | 2 = 1) => {
    const stepSize = direction / frameRate;
    const apply = (v: HTMLVideoElement | null) => {
      if (!v) return;
      v.pause();
      v.currentTime = Math.max(0, v.currentTime + stepSize);
    };
    if (locked) {
      apply(video1Ref.current);
      apply(video2Ref.current);
    } else {
      apply(videoNum === 1 ? video1Ref.current : video2Ref.current);
    }
  }, [video1Ref, video2Ref, locked]);

  const formatTime = useCallback((seconds: number): string => {
    const s = Math.floor(seconds || 0);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }, []);

  return { playbackRate, playBoth, pauseBoth, playSingle, pauseSingle, seek, setSpeed, step, formatTime };
}
