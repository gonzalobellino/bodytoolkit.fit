import { useCallback, useEffect, RefObject } from 'react';

export interface UseFullscreenOptions {
  elementRef: RefObject<HTMLElement>;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
}

export interface FullscreenHandlers {
  toggleFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

export function useFullscreen({
  elementRef,
  isFullscreen,
  setIsFullscreen,
}: UseFullscreenOptions): FullscreenHandlers {
  
  // Listen for fullscreen changes (e.g., user pressing Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setIsFullscreen]);
  
  const toggleFullscreen = useCallback(async () => {
    const target = elementRef.current;
    if (!target) return;
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  }, [elementRef]);
  
  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
    }
  }, []);
  
  return {
    toggleFullscreen,
    exitFullscreen,
  };
}
