import { useState, useRef, useCallback } from 'react';

interface UseVideoRecordingOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  onRecorded?: (blob: Blob, url: string) => void;
  duration?: number; // Recording duration in ms (default: 8000)
  useCountdown?: boolean;
}

export function useVideoRecording({
  videoRef,
  onRecorded,
  duration = 8000,
  useCountdown = true,
}: UseVideoRecordingOptions) {
  const [recordingActive, setRecordingActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [status, setStatus] = useState<string>('Recording idle.');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordActionLockRef = useRef(0);

  const playSound = useCallback((type: 'countdown' | 'start' | 'end') => {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch {
      return;
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    
    if (type === 'countdown') {
      osc.frequency.value = 700;
      gain.gain.value = 0.12;
    } else {
      osc.frequency.value = 1000;
      gain.gain.value = 0.2;
    }
    
    const soundDuration = type === 'start' || type === 'end' ? 0.45 : 0.18;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + soundDuration);
  }, []);

  const startCountdown = useCallback((onComplete: () => void) => {
    setCountdownActive(true);
    setCountdown(3);
    playSound('countdown');
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setCountdownActive(false);
          playSound('start');
          onComplete();
          return 0;
        }
        playSound('countdown');
        return next;
      });
    }, 1000);
  }, [playSound]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setRecordingActive(false);
    setStatus('Recording stopped.');
    recordActionLockRef.current = Date.now() + 600;
  }, []);

  const startRecording = useCallback(async () => {
    if (Date.now() < recordActionLockRef.current) return;
    if (countdownActive) return;
    if (recordingActive) {
      stopRecording();
      return;
    }

    if (!window.isSecureContext) {
      setStatus('Recording requires HTTPS or localhost.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Recording not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
      }

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordingActive(false);
        setStatus('Video ready.');
        playSound('end');
        onRecorded?.(blob, url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        recorderRef.current = null;
      };

      const doRecord = () => {
        recorder.start();
        recorderRef.current = recorder;
        setRecordingActive(true);
        setStatus(`Recording ${duration / 1000} seconds...`);
        playSound('start');
        
        stopTimerRef.current = setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, duration);
      };

      if (useCountdown) {
        startCountdown(doRecord);
      } else {
        doRecord();
      }
    } catch (error) {
      console.error('Record error:', error);
      setStatus('Unable to record video.');
    }
  }, [videoRef, duration, useCountdown, countdownActive, recordingActive, startCountdown, stopRecording, playSound, onRecorded]);

  return {
    recordingActive,
    countdown,
    countdownActive,
    status,
    startRecording,
    stopRecording,
    setStatus,
  };
}
