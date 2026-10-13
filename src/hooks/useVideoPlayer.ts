import { useState, useRef, useCallback, useEffect } from 'react';

export interface Marker {
  id: number;
  time: number;
}

interface UseVideoPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  frameRate?: number;
}

export function useVideoPlayer({ videoRef, frameRate = 30 }: UseVideoPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const renderLoopRef = useRef<number | null>(null);

  const updateTime = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration ?? 0);
  }, [videoRef]);

  const startRenderLoop = useCallback(() => {
    if (renderLoopRef.current !== null) return;
    
    const render = () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        renderLoopRef.current = requestAnimationFrame(render);
      } else {
        renderLoopRef.current = null;
      }
    };
    renderLoopRef.current = requestAnimationFrame(render);
  }, [videoRef]);

  const stopRenderLoop = useCallback(() => {
    if (renderLoopRef.current !== null) {
      cancelAnimationFrame(renderLoopRef.current);
      renderLoopRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration ?? 0);
      setCurrentTime(video.currentTime ?? 0);
    };

    const handleTimeUpdate = () => {
      updateTime();
      if (loopEnabled && loopEnd !== null && video.currentTime >= loopEnd) {
        video.currentTime = loopStart ?? 0;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      startRenderLoop();
    };

    const handlePause = () => {
      setIsPlaying(false);
      stopRenderLoop();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      stopRenderLoop();
    };
  }, [loopEnabled, loopEnd, loopStart, startRenderLoop, stopRenderLoop, updateTime, videoRef]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
    video.play();
  }, [videoRef, playbackRate]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, [videoRef]);

  const step = useCallback((direction: number) => {
    const video = videoRef.current;
    if (!video) return;
    const stepSize = 1 / frameRate;
    video.pause();
    const next = Math.max(0, video.currentTime + direction * stepSize);
    video.currentTime = next;
  }, [videoRef, frameRate]);

  const jumpToStart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, [videoRef]);

  const jumpToEnd = useCallback(() => {
    const video = videoRef.current;
    if (!video?.duration) return;
    video.pause();
    video.currentTime = Math.max(0, video.duration - 0.01);
  }, [videoRef]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
  }, [videoRef]);

  const setSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
  }, [videoRef]);

  const addMarker = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    const id = Date.now();
    setMarkers(prev => [...prev, { id, time }]);
  }, [videoRef]);

  const deleteMarker = useCallback((id: number) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  }, []);

  const jumpToMarker = useCallback((time: number) => {
    seek(time);
  }, [seek]);

  const toggleLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!loopEnabled) {
      setLoopEnabled(true);
      setLoopStart(video.currentTime);
      setLoopEnd(Math.min(video.currentTime + 3, video.duration ?? 0));
    } else {
      setLoopEnabled(false);
      setLoopStart(null);
      setLoopEnd(null);
    }
  }, [loopEnabled, videoRef]);

  const formatTime = useCallback((seconds: number): string => {
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    markers,
    loopEnabled,
    loopStart,
    loopEnd,
    play,
    pause,
    step,
    jumpToStart,
    jumpToEnd,
    seek,
    setSpeed,
    addMarker,
    deleteMarker,
    jumpToMarker,
    toggleLoop,
    formatTime,
  };
}
