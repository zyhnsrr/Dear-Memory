'use strict';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Pause, Volume2, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordComplete: (base64Audio: string | null) => void;
}

export default function VoiceRecorder({ onRecordComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Web Audio Visualizer References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // Request permission on load silently or inspect mediaDevices
    navigator.mediaDevices.enumerateDevices().then(() => {
      // Permission status checking
    }).catch(() => {});

    return () => {
      cleanupTimer();
      cleanupAudioContext();
    };
  }, []);

  const cleanupTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupAudioContext = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    streamSourceRef.current = null;
  };

  const startRecording = async () => {
    try {
      cleanupAudioContext();
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);

      // Web Audio setup for visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      streamSourceRef.current = source;

      // Start canvas visualization
      visualize();

      // Configure media recorder
      // Determine format fallback
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert blob to base64 for API
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onRecordComplete(base64data);
        };

        // Stop all tracks in the recording stream
        stream.getTracks().forEach((track) => track.stop());
        cleanupAudioContext();
      };

      mediaRecorder.start(250); // Get data slice every 250ms
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= 59) {
            // Max 60 seconds limit
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error opening microphone:', err);
      setHasMicPermission(false);
      alert('Could not access microphone. Make sure it is connected and site permission is granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      cleanupTimer();
    }
  };

  const visualize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Semi-transparent background for trails effect on cassette tape
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(11, 15, 25, 0.22)';
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal glow line in center
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const barWidth = (width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        // Calculate dynamic height based on sound volume
        const barHeight = (value / 255) * (height * 0.85);

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
        grad.addColorStop(0, '#db2777'); // Pink-600
        grad.addColorStop(0.5, '#a855f7'); // Purple-500
        grad.addColorStop(1, '#6366f1'); // Indigo-500

        ctx.fillStyle = grad;

        // Draw symmetrical vertical bars centered vertically
        const y = height / 2 - barHeight / 2;
        ctx.fillRect(x, y, barWidth - 2, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const deleteRecording = () => {
    cleanupTimer();
    cleanupAudioContext();
    setAudioUrl(null);
    setIsPlaying(false);
    setDuration(0);
    onRecordComplete(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  // Convert duration number to mm:ss format
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full bg-zinc-50 border-2 border-black p-5 shadow-[3px_3px_0_0_rgba(0,0,0,1)] rounded-md flex flex-col relative select-none">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black text-zinc-900 tracking-wider uppercase flex items-center gap-1.5 font-mono">
          <Mic className="h-4 w-4 text-zinc-900" /> Voice note recorder
        </h4>
        <span className="text-[10px] text-zinc-600 font-mono font-bold uppercase">
          {isRecording ? 'RECORDING' : audioUrl ? 'REVIEW AUDIO' : 'OPTIONAL (MAX 60S)'}
        </span>
      </div>

      {/* Hidden audio tag for playback review */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}

      {/* Visualizer cassette tape mockup */}
      <div className="relative h-24 w-full rounded-lg overflow-hidden bg-zinc-800 border-2 border-black mb-5 shadow-[inset_0_4px_6px_rgba(0,0,0,0.6)] flex items-center justify-center select-none">
        
        {/* Cassette housing outline details */}
        <div className="absolute inset-1 border border-zinc-700/40 rounded flex flex-col justify-between pointer-events-none z-0">
          <div className="flex justify-between px-2 pt-0.5 text-[8px] text-zinc-650 font-bold">
            <span>⨂</span>
            <span>⨂</span>
          </div>
          <div className="flex justify-between px-2 pb-0.5 text-[8px] text-zinc-650 font-bold">
            <span>⨂</span>
            <span>⨂</span>
          </div>
        </div>

        {/* Cassette retro paper sticker */}
        <div className="absolute inset-x-5 inset-y-3.5 bg-neutral-100 border border-black flex flex-col justify-between p-1 rounded-sm shadow-inner z-0">
          {/* Header strip */}
          <div className="h-2.5 w-full bg-gradient-to-r from-yellow-350 via-pink-400 to-cyan-400 rounded-2xs flex justify-between items-center px-1">
            <span className="text-[6px] text-black font-mono font-black tracking-wider uppercase">DEAR-MEM-C60</span>
            <span className="text-[6px] text-black font-mono font-bold">NR [X]</span>
          </div>

          {/* Window showing reels */}
          <div className="relative h-8.5 w-2/3 mx-auto bg-zinc-950 border border-black rounded flex items-center justify-between px-3.5 overflow-hidden">
            {/* Left reel */}
            <div className={`relative h-6.5 w-6.5 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center bg-zinc-900 ${
              isRecording || isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''
            }`}>
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400 border border-black" />
              <div className="absolute w-full h-[1px] bg-zinc-750" />
              <div className="absolute h-full w-[1px] bg-zinc-750" />
            </div>

            {/* Status led and name */}
            <div className="z-10 flex flex-col items-center justify-center">
              {isRecording ? (
                <div className="flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[6px] text-red-500 font-mono font-black">REC</span>
                </div>
              ) : isPlaying ? (
                <div className="flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[6px] text-emerald-400 font-mono font-black">PLAY</span>
                </div>
              ) : (
                <span className="text-[6px] text-zinc-500 font-mono font-semibold tracking-wider">TAPE</span>
              )}
            </div>

            {/* Right reel */}
            <div className={`relative h-6.5 w-6.5 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center bg-zinc-900 ${
              isRecording || isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''
            }`}>
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400 border border-black" />
              <div className="absolute w-full h-[1px] bg-zinc-750" />
              <div className="absolute h-full w-[1px] bg-zinc-750" />
            </div>
          </div>

          {/* Footer label */}
          <div className="h-3 w-full border-t border-zinc-300 flex items-center justify-center">
            <span className="text-[8px] text-zinc-600 font-serif italic tracking-tight truncate max-w-full">
              {audioUrl ? '✨ Recorded capsule note ✨' : 'Optional voice message'}
            </span>
          </div>
        </div>

        {/* Live sound visualizer canvas overlay (renders mix-blend on top of cassette sticker) */}
        {isRecording && (
          <canvas
            ref={canvasRef}
            width={380}
            height={96}
            className="absolute inset-0 w-full h-full z-10 pointer-events-none mix-blend-screen"
          />
        )}

        {/* Floating Timer Badge */}
        {(isRecording || audioUrl) && (
          <div className="absolute top-1.5 right-1.5 bg-black border border-zinc-800 text-yellow-400 font-mono text-[9px] px-1.5 py-0.5 rounded shadow-md z-20">
            {formatTime(duration)}
          </div>
        )}
      </div>

      {/* Recorder Actions Footer */}
      <div className="flex items-center justify-center gap-4">
        {!audioUrl ? (
          !isRecording ? (
            <button
              onClick={startRecording}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-md flex items-center justify-center gap-2 brutalist-btn cursor-pointer shadow-black"
            >
              <Mic className="h-4.5 w-4.5 text-zinc-900" />
              Record Voice Note
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-extrabold uppercase text-xs tracking-wider rounded-md flex items-center justify-center gap-2 brutalist-btn cursor-pointer shadow-black"
            >
              <Square className="h-4 w-4 fill-white" />
              Stop Recording
            </button>
          )
        ) : (
          <div className="flex w-full gap-3">
            <button
              onClick={togglePlayback}
              className={`flex-1 py-3 font-extrabold uppercase text-xs tracking-wider rounded-md flex items-center justify-center gap-2 brutalist-btn cursor-pointer transition-all ${
                isPlaying
                  ? 'bg-purple-400 hover:bg-purple-500 text-black border-2 border-black'
                  : 'bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black shadow-black'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 fill-zinc-900" />
                  Pause Note
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-zinc-900" />
                  Play Preview
                </>
              )}
            </button>
            <button
              onClick={deleteRecording}
              className="px-4 py-3 bg-red-550 hover:bg-red-600 text-white font-bold rounded-md brutalist-btn cursor-pointer border-2 border-black shadow-black flex items-center justify-center"
              title="Delete audio note"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
      </div>

      {hasMicPermission === false && (
        <div className="mt-3 flex items-start gap-2 bg-red-100 border-2 border-black p-2.5 rounded text-[10px] text-red-700 font-mono font-bold text-left shadow-[2px_2px_0_rgba(0,0,0,1)]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Mic access blocked. Please reset browser permission settings for this origin to capture voice capsules.</span>
        </div>
      )}
    </div>
  );
}
