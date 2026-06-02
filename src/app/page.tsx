'use client';

import React, { useState } from 'react';
import { Camera, Calendar, User, MessageSquare, ShieldAlert, Sparkles, Send, CheckCircle2, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import Photobooth from '@/components/Photobooth';
import VoiceRecorder from '@/components/VoiceRecorder';
import EmailSandbox from '@/components/EmailSandbox';

export default function Home() {
  // Config state
  const [filter, setFilter] = useState<string>('original');
  const [template, setTemplate] = useState<string>('polaroid');
  
  // Data payload states
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [scheduleType, setScheduleType] = useState<string>('test-1-min');

  // Submit and Sandbox state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshSandbox, setRefreshSandbox] = useState<number>(0);

  const filtersList = [
    { id: 'original', name: 'Original', class: 'bg-slate-800' },
    { id: 'bw', name: 'B & W', class: 'grayscale contrast-125' },
    { id: 'vintage', name: 'Vintage', class: 'sepia contrast-95 hue-rotate-[-10deg]' },
    { id: 'warm', name: 'Warm Warm', class: 'sepia-[0.2] saturate-150' },
    { id: 'cool', name: 'Cool Slate', class: 'saturate-90 hue-rotate-[15deg]' },
  ];

  const templatesList = [
    { id: 'polaroid', name: 'Polaroid Layout', desc: 'Classic white card square frame' },
    { id: 'classic-strip', name: 'Classic Strip', desc: '4 vertical captures in a nostalgic filmstrip' },
    { id: 'quad-grid', name: 'Sticker Grid (4x)', desc: 'Retro 2x2 photo sticker grid' },
    { id: 'cinema-strip', name: 'Cinema Reel (4x)', desc: 'Nostalgic 4-frame movie filmstrip' },
    { id: 'landscape-strip', name: 'Horizontal Film (4x)', desc: 'Landscape captures side-by-side' },
    { id: 'vintage-frame', name: 'Vintage Border', desc: 'Retro gold doubles and warm background' },
    { id: 'minimal-frame', name: 'Minimal Border', desc: 'Clean translucent glass overlay line' },
  ];

  const handleCapture = (base64Image: string) => {
    setPhotoBase64(base64Image);
  };

  const handleVoiceRecord = (base64Audio: string | null) => {
    setVoiceBase64(base64Audio);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!photoBase64) {
      setErrorMessage('Please capture a photobooth snapshot first!');
      return;
    }
    if (!recipientEmail) {
      setErrorMessage('Please enter a recipient email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo: photoBase64,
          voice: voiceBase64 || undefined,
          recipient_email: recipientEmail,
          message: message || undefined,
          schedule_type: scheduleType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong saving memory.');
      }

      // Success sequence
      setSuccessMessage('Memory Capsule Successfully Scheduled and Sealed! 🔒');
      
      // Trigger gorgeous Confetti explosion
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#3b82f6'],
      });

      // Clear layout fields
      setPhotoBase64(null);
      setVoiceBase64(null);
      setMessage('');
      setRecipientEmail('');
      
      // Refresh Sandbox view logs
      setRefreshSandbox((prev) => prev + 1);

    } catch (err: any) {
      setErrorMessage(err?.message || 'Error processing request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col gap-12 relative">
      {/* Red paint spray splatter background */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-28 bg-pink-600/30 blur-3xl rounded-full -z-10 pointer-events-none" />
      <div className="absolute top-[5%] left-[8%] hidden md:block rotate-12 -z-10 pointer-events-none drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)] bg-yellow-400 border-2 border-black p-2 rounded-sm text-xs font-bold text-black font-mono animate-bounce-slow">
        ⭐️ DEAR MEMORY
      </div>

      {/* Price tag sticker (cross 30k, show FREE) */}
      <div className="absolute top-[35%] -left-12 hidden xl:flex flex-col items-center rotate-[-12deg] z-10 scale-100 select-none bg-yellow-400 border-2 border-black p-3.5 shadow-[3.5px_3.5px_0_rgba(0,0,0,1)] rounded-md font-mono">
        <span className="text-[10px] text-slate-800 font-bold uppercase tracking-wider">Booth Price</span>
        <div className="text-red-500 font-black text-lg line-through decoration-black decoration-2">30K</div>
        <div className="text-slate-900 font-extrabold text-4xl drop-shadow-[1px_1px_0_rgba(255,255,255,1)]">FREE</div>
        <span className="text-[8px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] mt-1 animate-pulse">DISKON!</span>
      </div>

      {/* OPEN Neon sticker */}
      <div className="absolute top-[52%] -left-14 hidden xl:block rotate-[6deg] z-10 text-left bg-cyan-400 border-2 border-black p-3.5 shadow-[3.5px_3.5px_0_rgba(0,0,0,1)] rounded-md">
        <div className="text-slate-900 font-black text-3xl drop-shadow-[1px_1px_0_rgba(255,255,255,0.7)] tracking-wide uppercase italic leading-none">OPEN</div>
        <div className="text-slate-900 font-mono text-[9px] font-bold mt-1.5 border-t border-black/25 pt-1">Now - Forever</div>
      </div>

      {/* Scissors cutting sticker */}
      <div className="absolute bottom-[10%] -left-16 hidden xl:flex items-center gap-1.5 rotate-[15deg] z-10 bg-rose-400 border-2 border-black p-2 shadow-[2.5px_2.5px_0_rgba(0,0,0,1)] rounded-md font-mono text-[9px] font-bold text-black select-none">
        ✂️ CUT ALONG LINE
      </div>

      {/* Retro Mode cassette sticker */}
      <div className="absolute top-[28%] -right-12 hidden xl:flex flex-col items-center rotate-[15deg] z-10 bg-pink-300 border-2 border-black p-3 shadow-[3px_3px_0_rgba(0,0,0,1)] rounded-md font-mono select-none">
        <span className="text-xs text-slate-900 font-bold uppercase">✨ Retro Mode</span>
        <span className="text-[9px] text-slate-800 mt-1 font-semibold">Est. 2026</span>
      </div>

      {/* Postage stamp sticker */}
      <div className="absolute top-[12%] -right-14 hidden xl:flex flex-col items-center rotate-[-8deg] z-10 bg-amber-100 border-2 border-dashed border-black p-2.5 shadow-[3px_3px_0_rgba(0,0,0,1)] select-none">
        <div className="border border-black p-1 bg-amber-50">
          <div className="text-[7px] text-center font-bold font-mono text-amber-900">DEAR MEMORY</div>
          <div className="w-10 h-10 bg-yellow-200 flex items-center justify-center text-xs border border-amber-900 rounded-sm my-0.5 font-serif italic text-amber-950 font-black">
            10¢
          </div>
          <div className="text-[6px] text-center font-mono text-amber-800">POSTAGE</div>
        </div>
      </div>

      {/* Say Cheese camera sticker */}
      <div className="absolute bottom-[40%] -right-16 hidden xl:block rotate-[-10deg] z-10 bg-yellow-400 border-2 border-black p-2.5 shadow-[3px_3px_0_rgba(0,0,0,1)] rounded-md">
        <span className="text-[9px] text-slate-900 font-bold tracking-widest font-mono uppercase">Say Cheese! 📸</span>
      </div>

      {/* Smile Always circular badge */}
      <div className="absolute bottom-[20%] -right-14 hidden xl:flex items-center justify-center w-16 h-16 rounded-full rotate-12 z-10 bg-emerald-400 border-2 border-black text-black font-black text-[9px] text-center font-mono shadow-[3px_3px_0_rgba(0,0,0,1)] uppercase select-none p-1 leading-tight">
        ✨ Smile Always ✨
      </div>

      {/* Header section with scrapbook tape and yellow brush text */}
      <header className="text-center flex flex-col items-center gap-3 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400 border-2 border-black rounded-sm text-[10px] text-slate-900 font-bold font-mono tracking-widest uppercase shadow-[2.5px_2.5px_0_0_rgba(0,0,0,1)] rotate-1">
          <Sparkles className="h-3.5 w-3.5 text-slate-900 fill-slate-900" />
          Capture your present, send to your future
        </div>
        <h1 className="text-5xl sm:text-7xl font-black tracking-wide bg-gradient-to-b from-yellow-300 to-yellow-500 bg-clip-text text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,1)] uppercase italic py-2">
          Dear Memory
        </h1>
        <p className="text-sm sm:text-base text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)] max-w-md font-semibold font-sans">
          A digital time capsule. Snap a retro photobooth layout, record a brief voice capsule, and schedule automatic email delivery to standard times.
        </p>
      </header>

      {/* Main Form Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side Column: Photobooth Frame - Kraft envelope background */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="relative scrapbook-manila-envelope border-2 border-black p-6 rounded-2xl flex flex-col items-center -rotate-1 hover:rotate-0 hover:scale-[1.01] transition-all duration-300">
            {/* Taped top look & paperclip */}
            <div className="masking-tape-top" />
            <svg viewBox="0 0 24 60" className="absolute -top-7 right-10 w-9 h-20 drop-shadow-[2.5px_3.5px_2px_rgba(0,0,0,0.4)] select-none pointer-events-none z-20 rotate-[15deg]">
              <path 
                d="M12,4 C17,4 19,7 19,12 L19,48 C19,53 16,56 12,56 C8,56 5,53 5,48 L5,18 C5,15 7,13 10,13 C13,13 15,15 15,18 L15,44 C15,46 14,47 12,47 C10,47 9,46 9,44 L9,22" 
                fill="none" 
                stroke="url(#viewfinderPaperclipMetal)" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              <defs>
                <linearGradient id="viewfinderPaperclipMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="25%" stopColor="#e2e8f0" />
                  <stop offset="50%" stopColor="#94a3b8" />
                  <stop offset="75%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
              </defs>
            </svg>
            
            <h3 className="text-xs font-black text-amber-950 self-start mb-4 tracking-wider uppercase font-mono flex items-center gap-2">
              <Camera className="h-4.5 w-4.5 text-amber-900 animate-pulse" /> Live Viewfinder Composition
            </h3>
            <Photobooth
              onCapture={handleCapture}
              activeFilter={filter}
              activeTemplate={template}
            />
          </div>
        </section>

        {/* Right Side Column: Controls Panel */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Layout Setup panel - Lined School Paper style */}
          <div className="relative scrapbook-lined-paper p-6 rounded-2xl flex flex-col gap-6 rotate-1 hover:rotate-0 hover:scale-[1.01] transition-all duration-300 pl-14">
            {/* Pushpin top center */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 scrapbook-pushpin" />

            <h3 className="text-xs font-black text-zinc-900 tracking-wider uppercase font-mono flex items-center gap-2 mt-2">
              <Sparkles className="h-4.5 w-4.5 text-zinc-900" /> Customizer Frame Setup
            </h3>

            {/* Template Selector Grid */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">
                Select Frame Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {templatesList.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTemplate(t.id);
                      setPhotoBase64(null); // Clear previous capture to prevent aspect ratio bugs
                    }}
                    className={`p-3 rounded-xl text-left flex flex-col gap-0.5 transition-all cursor-pointer brutalist-btn ${
                      template === t.id
                        ? 'bg-yellow-400 border-2 border-black text-slate-900 font-black shadow-none scale-[0.98] translate-x-[2px] translate-y-[2px]'
                        : 'bg-white border-2 border-black text-slate-700 font-bold hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs">{t.name}</span>
                    <span className="text-[9px] text-slate-500 line-clamp-1 leading-normal font-medium">
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Filter Selector Cards */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">
                Select Camera Filter
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                {filtersList.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`flex-none w-18 p-2 rounded-lg text-center transition-all cursor-pointer brutalist-btn ${
                      filter === f.id
                        ? 'bg-yellow-400 border-2 border-black text-slate-900 font-black shadow-none scale-[0.98] translate-x-[2px] translate-y-[2px]'
                        : 'bg-white border-2 border-black text-slate-750 font-bold hover:bg-slate-50'
                    }`}
                  >
                    <div className={`h-8 w-full rounded mb-1.5 ${f.class} border border-black`} />
                    <span className="text-[10px] block whitespace-nowrap">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Recorder module */}
            <VoiceRecorder onRecordComplete={handleVoiceRecord} />
          </div>

          {/* Envelope Scheduling Details Form - Manila Envelope style */}
          <form onSubmit={handleScheduleSubmit} className="relative scrapbook-manila-envelope p-6 rounded-3xl flex flex-col gap-5 -rotate-1 hover:rotate-0 hover:scale-[1.01] transition-all duration-300">
            {/* Solid Washi Tape and realistic Silver Paperclip */}
            <div className="absolute -top-4.5 left-10 w-32 h-8.5 bg-rose-500 border-2 border-black rotate-[4.5deg] shadow-[3px_3px_0_0_rgba(0,0,0,1)] z-10" />
            <svg viewBox="0 0 24 60" className="absolute -top-7 right-12 w-9 h-20 drop-shadow-[2.5px_3.5px_2px_rgba(0,0,0,0.4)] select-none pointer-events-none z-20 rotate-[12deg]">
              <path 
                d="M12,4 C17,4 19,7 19,12 L19,48 C19,53 16,56 12,56 C8,56 5,53 5,48 L5,18 C5,15 7,13 10,13 C13,13 15,15 15,18 L15,44 C15,46 14,47 12,47 C10,47 9,46 9,44 L9,22" 
                fill="none" 
                stroke="url(#envelopePaperclipMetal)" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              <defs>
                <linearGradient id="envelopePaperclipMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="25%" stopColor="#e2e8f0" />
                  <stop offset="50%" stopColor="#94a3b8" />
                  <stop offset="75%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
              </defs>
            </svg>

            <h3 className="text-xs font-black text-amber-950 tracking-wider uppercase font-mono flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-amber-900" /> capsule Shipping Envelope
            </h3>

            {/* Recipient Email Input */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="email" className="text-[10px] text-amber-900 font-mono uppercase tracking-wider font-bold">
                Recipient Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-800">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white brutalist-input text-slate-900 placeholder-amber-800/40 rounded-md text-sm focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Message Box Input */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="message" className="text-[10px] text-amber-900 font-mono uppercase tracking-wider font-bold">
                Letter Message (Optional)
              </label>
              <div className="relative">
                <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-amber-800">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <textarea
                  id="message"
                  maxLength={1000}
                  placeholder="Dear future self... (max 1000 chars)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full pl-9 pr-3 py-2.5 bg-white brutalist-input text-slate-900 placeholder-amber-800/40 rounded-md text-sm focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Schedule delivery timing dropdown/radio buttons */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] text-amber-900 font-mono uppercase tracking-wider font-bold">
                Delivery Schedule Interval
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '1-month', label: '1 Month Later' },
                  { id: '1-year', label: '1 Year Later' },
                  { id: 'test-1-min', label: 'Test: 1 Minute' },
                  { id: 'immediate', label: 'Test: 5 Seconds' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScheduleType(s.id)}
                    className={`py-2 px-3 rounded-md text-xs font-bold tracking-wide transition-all cursor-pointer brutalist-btn ${
                      scheduleType === s.id
                        ? 'bg-yellow-400 text-black font-black'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification messages */}
            {errorMessage && (
              <div className="bg-red-50 border-2 border-black text-red-750 p-3 rounded-md text-xs font-mono flex items-start gap-2 text-left shadow-[2px_2px_0_rgba(0,0,0,1)]">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border-2 border-black text-emerald-750 p-3.5 rounded-md text-xs font-semibold flex items-start gap-2 text-left shadow-[3px_3px_0_rgba(0,0,0,1)]">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5 animate-bounce" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submission triggers button */}
            <button
              type="submit"
              disabled={isSubmitting || !photoBase64}
              className={`w-full py-4 font-black uppercase tracking-wider rounded-xl transition-all duration-150 brutalist-btn flex items-center justify-center gap-2 ${
                !photoBase64
                  ? 'bg-slate-100 border-2 border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                  : isSubmitting
                  ? 'bg-yellow-200 border-2 border-black text-slate-500 cursor-wait'
                  : 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 cursor-pointer shadow-black'
              }`}
            >
              <Send className="h-4.5 w-4.5" />
              {isSubmitting ? 'Sealing Capsule...' : 'Seal & Send to Future'}
            </button>
          </form>
        </section>
      </div>

      {/* Developer Sandbox Log Area */}
      <footer className="mt-8 flex flex-col gap-6">
        <EmailSandbox refreshTrigger={refreshSandbox} />
        <div className="text-center text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-xs font-mono py-6 border-t border-blue-800/40 flex items-center justify-center gap-1.5">
          Made with <Heart className="h-3 w-3 text-pink-500 animate-pulse-slow fill-pink-500" /> for memory makers
        </div>
      </footer>
    </main>
  );
}
