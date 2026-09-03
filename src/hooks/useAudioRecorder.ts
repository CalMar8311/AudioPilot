// Audio Recorder Hook: System Sound & Microphone Capture

import { useState, useRef, useCallback } from 'react';

export type RecordingType = 'system' | 'mic' | null;

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingType: RecordingType;
  recordingTime: number;
  startSystemRecording: () => Promise<void>;
  startMicRecording: () => Promise<void>;
  stopRecording: () => Promise<File | null>;
  cancelRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<RecordingType>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording timer
  const startTimer = useCallback(() => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop recording timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up resources
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    stopTimer();
  }, [stopTimer]);

  // Start system audio recording (screen/tab capture)
  const startSystemRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 } as any,
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track found. Make sure to select "Share audio" when choosing the tab/window.');
      }

      const audioStream = new MediaStream(audioTracks);
      stream.getVideoTracks().forEach((track) => track.stop());
      streamRef.current = audioStream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 128000 });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingType('system');
      startTimer();
    } catch (err) {
      console.error('System recording error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start system audio recording');
      cleanup();
    }
  }, [cleanup, startTimer]);

  // Start microphone recording
  const startMicRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingType('mic');
      startTimer();
    } catch (err) {
      console.error('Microphone recording error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start microphone recording');
      cleanup();
    }
  }, [cleanup, startTimer]);

  // Stop recording and return File
  const stopRecording = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        cleanup();
        setIsRecording(false);
        setRecordingType(null);
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        try {
          if (audioChunksRef.current.length === 0) throw new Error('No audio data recorded');

          const blob = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0].type });
          const extension = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'wav';
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = recordingType === 'system' 
            ? `system-audio-${timestamp}.${extension}`
            : `mic-recording-${timestamp}.${extension}`;

          const file = new File([blob], filename, { type: blob.type });

          cleanup();
          setIsRecording(false);
          setRecordingType(null);
          resolve(file);
        } catch (err) {
          console.error('Stop recording error:', err);
          setError(err instanceof Error ? err.message : 'Failed to process recorded audio');
          cleanup();
          setIsRecording(false);
          setRecordingType(null);
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [recordingType, cleanup]);

  // Cancel recording without saving
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
    setRecordingType(null);
    setError(null);
  }, [cleanup]);

  return {
    isRecording,
    recordingType,
    recordingTime,
    startSystemRecording,
    startMicRecording,
    stopRecording,
    cancelRecording,
    error,
  };
}