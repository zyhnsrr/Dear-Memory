'use strict';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Download, RotateCcw, Video, VideoOff, Layers, Sparkles } from 'lucide-react';

interface PhotoboothProps {
  onCapture: (base64Image: string) => void;
  activeFilter: string;
  activeTemplate: string;
}

const FILTERS: Record<string, string> = {
  original: 'none',
  bw: 'grayscale(100%) contrast(120%)',
  vintage: 'sepia(50%) contrast(90%) brightness(95%) hue-rotate(-10deg)',
  warm: 'sepia(20%) saturate(140%) brightness(100%)',
  cool: 'saturate(90%) hue-rotate(15deg) brightness(100%) contrast(105%)',
};

const FOUR_SNAP_TEMPLATES = ['classic-strip', 'quad-grid', 'cinema-strip', 'landscape-strip'];

export default function Photobooth({ onCapture, activeFilter, activeTemplate }: PhotoboothProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Attach the media stream to the video element once it is mounted
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, cameraActive]);

  // Monitor template changes to clear preview if template shifts
  useEffect(() => {
    const expectedCount = FOUR_SNAP_TEMPLATES.includes(activeTemplate) ? 4 : 1;
    if (capturedImages.length === expectedCount && !isSnapping) {
      generateComposite();
    }
  }, [activeTemplate, activeFilter, capturedImages, isSnapping]);

  // Manage capture sequence loops reactively to prevent double-execution side effects inside state updaters
  useEffect(() => {
    if (!isSnapping) return;

    const expectedCount = FOUR_SNAP_TEMPLATES.includes(activeTemplate) ? 4 : 1;
    if (capturedImages.length < expectedCount) {
      const timer = setTimeout(() => {
        runCountdown();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsSnapping(false);
    }
  }, [capturedImages.length, isSnapping, activeTemplate]);

  const startCamera = async () => {
    try {
      stopCamera();
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      setStream(userStream);
      setCameraActive(true);
    } catch (err) {
      console.error('Error accessing web camera:', err);
      alert('Camera access denied or unavailable. Please enable permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const triggerShutterFlash = () => {
    setFlashActive(true);
    setTimeout(() => {
      setFlashActive(false);
    }, 400);
  };

  const captureSingleSnapshot = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flip horizontal to act like a real mirror photobooth
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png');
  };

  const runCountdown = () => {
    let count = 3;
    setCountdown(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        
        // Trigger capture
        triggerShutterFlash();
        const snap = captureSingleSnapshot();
        if (snap) {
          setCapturedImages((prev) => [...prev, snap]);
        }
      }
    }, 900);
  };

  const startCaptureSequence = () => {
    if (!cameraActive) return;
    setIsSnapping(true);
    setCapturedImages([]);
    setCompositeUrl(null);
  };

  const generateComposite = () => {
    if (capturedImages.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const filterVal = FILTERS[activeFilter] || 'none';
    const dateText = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (activeTemplate === 'classic-strip') {
      // Classic Strip: 4 vertical photos, white frame
      // Output: 300 x 1000
      canvas.width = 300;
      canvas.height = 1000;

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawPhotos = async () => {
        for (let i = 0; i < 4; i++) {
          const imgUrl = capturedImages[i] || capturedImages[0]; // Fallback if missing
          const img = await loadImage(imgUrl);
          
          ctx.save();
          ctx.filter = filterVal;
          // Calculate destination
          const px = 16;
          const py = 16 + i * 220; // 200px photo height + 20px gap
          const pw = 268;
          const ph = 200;
          
          // Source crop to fit 4:3 input ratio (640x480) into a 268x200 area (approx 4:3)
          ctx.drawImage(img, 0, 0, img.width, img.height, px, py, pw, ph);
          ctx.restore();

          // Border around each photo
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, pw, ph);
        }

        // Draw branding / text at the bottom
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DEAR MEMORY', canvas.width / 2, 930);
        
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Courier New';
        ctx.fillText(dateText, canvas.width / 2, 955);

        const dataUrl = canvas.toDataURL('image/png');
        setCompositeUrl(dataUrl);
        onCapture(dataUrl);
      };

      drawPhotos();
    } else if (activeTemplate === 'quad-grid') {
      // Quad-grid: 2x2 grid layout
      canvas.width = 600;
      canvas.height = 680;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawPhotos = async () => {
        const cellWidth = 270;
        const cellHeight = 202.5; // 4:3 crop
        const startX = 20;
        const startY = 20;
        const gap = 20;

        const coords = [
          { x: startX, y: startY },
          { x: startX + cellWidth + gap, y: startY },
          { x: startX, y: startY + cellHeight + gap },
          { x: startX + cellWidth + gap, y: startY + cellHeight + gap },
        ];

        for (let i = 0; i < 4; i++) {
          const imgUrl = capturedImages[i] || capturedImages[0];
          const img = await loadImage(imgUrl);

          ctx.save();
          ctx.filter = filterVal;
          ctx.drawImage(img, 0, 0, img.width, img.height, coords[i].x, coords[i].y, cellWidth, cellHeight);
          ctx.restore();

          // Cell border
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(coords[i].x, coords[i].y, cellWidth, cellHeight);
        }

        // Branding and date footer
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('DEAR MEMORY', canvas.width / 2, 530);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Courier New';
        ctx.fillText(dateText, canvas.width / 2, 570);

        const dataUrl = canvas.toDataURL('image/png');
        setCompositeUrl(dataUrl);
        onCapture(dataUrl);
      };

      drawPhotos();
    } else if (activeTemplate === 'cinema-strip') {
      // Cinema strip: film reel vertical, black background, sprocket holes on side
      canvas.width = 300;
      canvas.height = 1000;

      ctx.fillStyle = '#09090b'; // Zinc-950/pure black
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw sprocket holes
      ctx.fillStyle = '#27272a'; // Zinc-800
      for (let y = 15; y < canvas.height; y += 30) {
        // Left sprockets
        ctx.fillRect(10, y, 10, 15);
        // Right sprockets
        ctx.fillRect(280, y, 10, 15);
      }

      const drawPhotos = async () => {
        const pw = 220;
        const ph = 165; // 4:3 aspect
        const px = 40;
        const startY = 35;
        const gap = 35;

        for (let i = 0; i < 4; i++) {
          const imgUrl = capturedImages[i] || capturedImages[0];
          const img = await loadImage(imgUrl);

          const py = startY + i * (ph + gap);

          ctx.save();
          ctx.filter = filterVal;
          ctx.drawImage(img, 0, 0, img.width, img.height, px, py, pw, ph);
          ctx.restore();

          // Photo border
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, pw, ph);
        }

        // Branding and date footer at the bottom film segment
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DEAR MEMORY', canvas.width / 2, 885);

        ctx.fillStyle = '#71717a';
        ctx.font = '11px Courier New';
        ctx.fillText(dateText, canvas.width / 2, 915);

        const dataUrl = canvas.toDataURL('image/png');
        setCompositeUrl(dataUrl);
        onCapture(dataUrl);
      };

      drawPhotos();
    } else if (activeTemplate === 'landscape-strip') {
      // Landscape strip: 4 vertical photos side by side, white frame, brand on right
      canvas.width = 1080;
      canvas.height = 320;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawPhotos = async () => {
        const pw = 200;
        const ph = 266.6; // 3:4 crop vertical
        const py = 26.7;
        const startX = 25;
        const gap = 20;

        for (let i = 0; i < 4; i++) {
          const imgUrl = capturedImages[i] || capturedImages[0];
          const img = await loadImage(imgUrl);

          const px = startX + i * (pw + gap);

          ctx.save();
          ctx.filter = filterVal;
          // Crop source to vertical aspect 3:4 (e.g. crop center width)
          const srcW = img.height * (3 / 4);
          const srcX = (img.width - srcW) / 2;
          ctx.drawImage(img, srcX, 0, srcW, img.height, px, py, pw, ph);
          ctx.restore();

          // Border around photo
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, pw, ph);
        }

        // Write branding vertically on the right margin
        ctx.save();
        ctx.translate(995, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DEAR MEMORY', 0, -5);

        ctx.fillStyle = '#6b7280';
        ctx.font = '11px Courier New';
        ctx.fillText(dateText, 0, 15);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        setCompositeUrl(dataUrl);
        onCapture(dataUrl);
      };

      drawPhotos();
    } else if (activeTemplate === 'polaroid') {
      // Polaroid: 1 photo, white frame, wide bottom margin
      // Output: 500 x 600
      canvas.width = 500;
      canvas.height = 600;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawPhoto = async () => {
        const img = await loadImage(capturedImages[0]);
        ctx.save();
        ctx.filter = filterVal;
        
        const px = 25;
        const py = 25;
        const pw = 450;
        const ph = 405; // 10:9 ratio

        // Crop center of 640x480 input to draw onto 450x405 canvas
        ctx.drawImage(img, 0, 0, img.width, img.height, px, py, pw, ph);
        ctx.restore();

        // Border around photo
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        // Handwritten styled text at the bottom
        ctx.fillStyle = '#1f2937';
        ctx.font = 'italic 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Captured Memory', canvas.width / 2, 500);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Courier New';
        ctx.fillText(dateText, canvas.width / 2, 545);

        const dataUrl = canvas.toDataURL('image/png');
        setCompositeUrl(dataUrl);
        onCapture(dataUrl);
      };

      drawPhoto();
    } else if (activeTemplate === 'vintage-frame') {
      // Vintage Frame: Retro gold double borders, warm background
      // Output: 500 x 500
      canvas.width = 500;
      canvas.height = 500;

      // Dark warm background
      ctx.fillStyle = '#f5efe1';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gold ornate border
      ctx.strokeStyle = '#7c5329';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      ctx.strokeStyle = '#c6a052';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      const drawPhoto = async () => {
        const img = await loadImage(capturedImages[0]);
        ctx.save();
        ctx.filter = filterVal;

        const px = 30;
        const py = 30;
        const pw = 440;
        const ph = 380;

        // Draw photo
        ctx.drawImage(img, 0, 0, img.width, img.height, px, py, pw, ph);
        ctx.restore();

        // Bottom text
        ctx.fillStyle = '#3a230f';
        ctx.font = 'italic bold 16px "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.fillText(`✨ MEMORIES - ${dateText} ✨`, canvas.width / 2, 455);

        const dataUrl = canvas.toDataURL('image/png');
        setCompositeUrl(dataUrl);
        onCapture(dataUrl);
      };

      drawPhoto();
    } else {
      // Minimal Frame
      // Output: 500 x 500
      canvas.width = 500;
      canvas.height = 500;

      // Glass dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawPhoto = async () => {
        const img = await loadImage(capturedImages[0]);
        ctx.save();
        ctx.filter = filterVal;
        // Center crop
        const px = 20;
        const py = 20;
        const pw = 460;
        const ph = 410;
        ctx.drawImage(img, 0, 0, img.width, img.height, px, py, pw, ph);
        ctx.restore();

        // Minimal fine border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, 460, 410);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`TIME CAPSULE // ${dateText}`, canvas.width / 2, 465);

        const dataUrl = canvas.toDataURL('image/png');
        setCompositeUrl(dataUrl);
        onCapture(dataUrl);
      };

      drawPhoto();
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  const downloadComposite = () => {
    if (!compositeUrl) return;
    const a = document.createElement('a');
    a.href = compositeUrl;
    a.download = `future-booth-${activeTemplate}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const retakePhotos = () => {
    setCapturedImages([]);
    setCompositeUrl(null);
    startCamera();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Canvas Hidden for rendering composite layout */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewfinder / Result Screen wrapped in Polaroid Frame */}
      <div className="polaroid-viewfinder w-full max-w-md border-2 border-black rotate-1 hover:rotate-0 hover:scale-[1.01] transition-all duration-300 flex flex-col items-center relative select-none cursor-pointer">
        {/* Shutter Flash Animation overlay */}
        {flashActive && <div className="absolute inset-0 z-50 animate-flash rounded-sm pointer-events-none" />}

        {/* Live Feed Status Tag - Styled like a physical Dymo tape maker sticker */}
        {cameraActive && (isSnapping || capturedImages.length === 0) && (
          <div className="absolute -top-3.5 left-6 z-20 bg-black text-white font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rotate-[-1.5deg] border-2 border-black shadow-[2.5px_2.5px_0_rgba(0,0,0,1)]">
            📼 LIVE FEED // {activeFilter.toUpperCase()}
          </div>
        )}

        {/* Inner screen frame */}
        <div className="relative w-full aspect-[4/3] bg-zinc-950 border-2 border-black overflow-hidden flex items-center justify-center">
          {/* Live Camera Stream */}
          {cameraActive && (isSnapping || capturedImages.length === 0) && (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover scale-x-[-1] filter-${activeFilter}`}
              />
              {/* Template Outline Indicator Overlay */}
              <div className="absolute inset-0 border border-purple-500/20 pointer-events-none flex flex-col items-center justify-between p-4">
                <div />
                {(activeTemplate === 'classic-strip' || activeTemplate === 'cinema-strip') && (
                  <div className="grid grid-rows-4 gap-1 w-20 h-[80%] border-2 border-dashed border-white/20 p-1 rounded-sm bg-black/35 backdrop-blur-xs">
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">1</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">2</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">3</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">4</div>
                  </div>
                )}
                {activeTemplate === 'quad-grid' && (
                  <div className="grid grid-cols-2 grid-rows-2 gap-1 w-20 h-20 border-2 border-dashed border-white/20 p-1 rounded-sm bg-black/35 backdrop-blur-xs">
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">1</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">2</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">3</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">4</div>
                  </div>
                )}
                {activeTemplate === 'landscape-strip' && (
                  <div className="grid grid-cols-4 gap-1 w-[80%] h-10 border-2 border-dashed border-white/20 p-1 rounded-sm bg-black/35 backdrop-blur-xs">
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">1</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">2</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">3</div>
                    <div className="border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">4</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Capturing Sequence Overlay */}
          {isSnapping && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
              {countdown !== null ? (
                <div className="text-8xl font-black text-white animate-bounce scale-110 tracking-tighter filter drop-shadow-[0_0_20px_rgba(250,204,21,0.7)]">
                  {countdown}
                </div>
              ) : (
                <div className="text-xl font-bold text-yellow-405 tracking-wider flex items-center gap-2 font-mono">
                  <Sparkles className="animate-spin text-yellow-400 h-5 w-5" />
                  SAY CHEESE!
                </div>
              )}
              {FOUR_SNAP_TEMPLATES.includes(activeTemplate) && (
                <div className="mt-8 text-sm text-slate-300 font-mono">
                  Taking photo {capturedImages.length + 1} of 4
                </div>
              )}
            </div>
          )}

          {/* Displaying Rendered Composite Image (After Cap) */}
          {compositeUrl && (
            <div className="relative w-full h-full bg-zinc-900 flex items-center justify-center p-4 overflow-y-auto">
              <img
                src={compositeUrl}
                alt="Memory capsule composition"
                className="max-h-[95%] max-w-[95%] rounded shadow-lg object-contain border border-black/20"
              />
            </div>
          )}

          {/* Camera Inactive Placeholders */}
          {!cameraActive && capturedImages.length === 0 && (
            <div className="flex flex-col items-center text-center p-8">
              <VideoOff className="h-12 w-12 text-slate-500 mb-3" />
              <p className="text-slate-400 font-medium mb-4 text-xs font-mono">CAMERA FEED IS OFFLINE</p>
              <button
                onClick={startCamera}
                className="brutalist-btn px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs flex items-center gap-2 rounded-md cursor-pointer shadow-black"
              >
                <Video className="h-4 w-4" /> Start Web Camera
              </button>
            </div>
          )}
        </div>

        {/* Handwriting Styled caption at the bottom margin of polaroid frame */}
        <div className="absolute bottom-2.5 font-mono font-extrabold text-[11px] sm:text-xs tracking-widest text-zinc-700 uppercase italic opacity-90 select-none">
          {isSnapping ? '📸 Capturing memory...' : compositeUrl ? '🔒 Capsule sealed!' : '✨ Dear Memory Booth ✨'}
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center w-full max-w-md">
        {cameraActive && capturedImages.length === 0 && !isSnapping && (
          <button
            onClick={startCaptureSequence}
            className="flex-1 min-w-[140px] px-6 py-3.5 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-md brutalist-btn cursor-pointer shadow-black flex items-center justify-center gap-2 group"
          >
            <Camera className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            {FOUR_SNAP_TEMPLATES.includes(activeTemplate) ? 'Take 4 Snaps' : 'Take Photo'}
          </button>
        )}

        {compositeUrl && (
          <>
            <button
              onClick={retakePhotos}
              className="flex-1 min-w-[120px] px-5 py-3 bg-red-400 hover:bg-red-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-md brutalist-btn cursor-pointer shadow-black flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <button
              onClick={downloadComposite}
              className="flex-1 min-w-[120px] px-5 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold uppercase text-xs tracking-wider rounded-md brutalist-btn cursor-pointer shadow-black flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </>
        )}

        {cameraActive && !isSnapping && (
          <button
            onClick={stopCamera}
            className="p-3 bg-white hover:bg-slate-50 text-black border-2 border-black rounded-md brutalist-btn cursor-pointer shadow-black flex items-center justify-center"
            title="Toggle camera offline"
          >
            <VideoOff className="h-5 w-5" />
          </button>
        )}
        {!cameraActive && capturedImages.length === 0 && (
          <p className="text-[10px] text-slate-300 font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] tracking-wide">
            Enable web camera to snap photo capsules
          </p>
        )}
      </div>
    </div>
  );
}
