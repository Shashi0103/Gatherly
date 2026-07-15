import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const useRecorder = (localStream, remoteStreams, roomId, hostId) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioDestinationRef = useRef(null);
  const durationTimerRef = useRef(null);
  const ffmpegRef = useRef(null);

  // Initialize FFmpeg
  const initFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => {
        setConversionProgress(Math.round(progress * 100));
      });

      // Load FFmpeg from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (err) {
      console.error('Failed to load FFmpeg WASM:', err);
      return null;
    }
  };

  // Helper to start the duration counter
  const startTimer = () => {
    setRecordingDuration(0);
    durationTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    
    recordedChunksRef.current = [];
    
    try {
      // 1. Set up Audio Mixing using Web Audio API
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      audioDestinationRef.current = audioContextRef.current.createMediaStreamDestination();

      // Add local audio track
      if (localStream && localStream.getAudioTracks().length > 0) {
        const localAudioSource = audioContextRef.current.createMediaStreamSource(
          new MediaStream([localStream.getAudioTracks()[0]])
        );
        localAudioSource.connect(audioDestinationRef.current);
      }

      // Add all remote audio tracks
      Object.values(remoteStreams).forEach((peer) => {
        if (peer.stream && peer.stream.getAudioTracks().length > 0) {
          const peerAudioSource = audioContextRef.current.createMediaStreamSource(
            new MediaStream([peer.stream.getAudioTracks()[0]])
          );
          peerAudioSource.connect(audioDestinationRef.current);
        }
      });

      // 2. Set up Video Canvas Merging
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      const drawFrame = () => {
        if (!canvasRef.current) return;
        
        // Clear background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gather all active video sources
        const videoSources = [];

        // Check local video element
        const localVideoEl = document.getElementById('video-feed-local');
        if (localVideoEl && localStream && localStream.getVideoTracks().length > 0 && localStream.getVideoTracks()[0].enabled) {
          videoSources.push({ el: localVideoEl, name: 'You' });
        } else {
          videoSources.push({ name: 'You (Camera Off)', fallback: true });
        }

        // Check remote video elements
        Object.keys(remoteStreams).forEach((socketId) => {
          const peer = remoteStreams[socketId];
          const videoEl = document.getElementById(`video-feed-${socketId}`);
          
          if (videoEl && peer.stream && peer.stream.getVideoTracks().length > 0 && !peer.isCameraOff) {
            videoSources.push({ el: videoEl, name: peer.displayName });
          } else {
            videoSources.push({ name: peer.displayName || 'Participant', fallback: true });
          }
        });

        const N = videoSources.length;
        if (N > 0) {
          // Layout calculations
          let cols = 1;
          let rows = 1;

          if (N === 2) { cols = 2; rows = 1; }
          else if (N <= 4) { cols = 2; rows = 2; }
          else { cols = 3; rows = 2; }

          const w = canvas.width / cols;
          const h = canvas.height / rows;

          videoSources.forEach((src, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = col * w;
            const y = row * h;

            if (!src.fallback && src.el) {
              // Draw video frame
              ctx.drawImage(src.el, x, y, w, h);
            } else {
              // Draw placeholder avatar card
              ctx.fillStyle = '#0d2530';
              ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
              
              ctx.strokeStyle = 'rgba(255,255,255,0.08)';
              ctx.lineWidth = 1;
              ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);

              // Circular Avatar
              ctx.beginPath();
              ctx.arc(x + w / 2, y + h / 2 - 15, Math.min(w, h) * 0.15, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
              ctx.fill();
              ctx.strokeStyle = '#3B82F6';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Text Initials
              ctx.fillStyle = '#CBD5E1';
              ctx.font = `bold ${Math.min(w, h) * 0.1}px Inter`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const parts = src.name.trim().split(' ');
              const initials = parts.length === 1 
                ? parts[0].charAt(0).toUpperCase() 
                : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
              ctx.fillText(initials, x + w / 2, y + h / 2 - 15);
            }

            // Draw Participant Name Label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x + 12, y + h - 40, ctx.measureText(src.name).width + 24, 26);
            ctx.fillStyle = '#F8FAFC';
            ctx.font = '12px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(src.name, x + 24, y + h - 23);
          });
        }

        animationFrameIdRef.current = requestAnimationFrame(drawFrame);
      };

      // Start draw loop
      drawFrame();

      // 3. Combine Canvas Video + Mixed Web Audio
      const canvasStream = canvas.captureStream(30);
      const combinedTracks = [];

      if (canvasStream.getVideoTracks().length > 0) {
        combinedTracks.push(canvasStream.getVideoTracks()[0]);
      }

      if (audioDestinationRef.current.stream.getAudioTracks().length > 0) {
        combinedTracks.push(audioDestinationRef.current.stream.getAudioTracks()[0]);
      }

      const recordStream = new MediaStream(combinedTracks);

      // 4. Instantiate MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp9' };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(recordStream, options);
      } catch (e) {
        // Fallback codec
        mediaRecorder = new MediaRecorder(recordStream, { mimeType: 'video/webm' });
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      // Start Recording
      mediaRecorder.start(1000); // chunk every 1 second
      setIsRecording(true);
      setIsPaused(false);
      startTimer();

    } catch (err) {
      console.error('Error starting screen recorder:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Restart timer
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    
    stopTimer();
    setIsRecording(false);
    setIsPaused(false);

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    // Trigger processing and download once streams stop
    setTimeout(async () => {
      const webmBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const durationVal = recordingDuration;
      const sizeVal = webmBlob.size;
      const dateStr = new Date().toISOString().slice(0,10);
      const timeStr = new Date().toTimeString().slice(0,5).replace(':', '-');
      const filename = `Gatherly_Meeting_${dateStr}_${timeStr}.mp4`;
      const fallbackFilename = `Gatherly_Meeting_${dateStr}_${timeStr}.webm`;
      
      const recordingId = `rec_${Math.random().toString(36).substr(2, 9)}`;

      // Try conversion using FFmpeg WASM
      setIsConverting(true);
      setConversionProgress(0);
      
      const ffmpeg = await initFFmpeg();
      
      if (ffmpeg) {
        try {
          // Write WebM to FFmpeg memory
          await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
          
          // Execute conversion command (copies VP9 stream to MP4 container, converts audio to AAC)
          // Using fast transcoder settings
          await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'copy', '-c:a', 'aac', 'output.mp4']);
          
          // Read MP4 file
          const data = await ffmpeg.readFile('output.mp4');
          const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

          // Auto-download file locally
          triggerDownload(mp4Blob, filename);

          // Save metadata log to DB
          await saveMetadata(recordingId, filename, durationVal, mp4Blob.size);
        } catch (err) {
          console.error('FFmpeg processing error. Downloading raw WebM fallback:', err);
          triggerDownload(webmBlob, fallbackFilename);
          await saveMetadata(recordingId, fallbackFilename, durationVal, sizeVal);
        }
      } else {
        // Fallback if FFmpeg cannot load (SharedArrayBuffer or CDN issues)
        console.warn('FFmpeg core not available. Downloading raw WebM directly.');
        triggerDownload(webmBlob, fallbackFilename);
        await saveMetadata(recordingId, fallbackFilename, durationVal, sizeVal);
      }

      setIsConverting(false);
      
      // Cleanup Audio
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }, 500);
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const saveMetadata = async (recordingId, fileName, duration, size) => {
    try {
      await axios.post('/api/recordings', {
        recordingId,
        meetingId: roomId,
        fileName,
        duration,
        size
      });
      console.log('Saved recording metadata log to DB.');
    } catch (err) {
      console.error('Error saving recording metadata log to DB:', err.message);
    }
  };

  return {
    isRecording,
    isPaused,
    recordingDuration,
    isConverting,
    conversionProgress,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording
  };
};
