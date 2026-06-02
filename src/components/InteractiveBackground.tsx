'use client';

import React, { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null; radius: number }>({
    x: null,
    y: null,
    radius: 170,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    const particleCount = 80;

    // Helper to draw a star
    const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fillStyle = color;
      c.fill();
    };

    // Handle viewport resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Track mouse coordinates
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    // Track touch coordinates
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    // Particle object representing stars or nodes
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      isStar: boolean;
      spikes: number;
      outerRadius: number;
      innerRadius: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        // Slow wandering velocities
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.size = Math.random() * 2.5 + 1.5;
        this.isStar = Math.random() > 0.65; // 35% stars, 65% circles
        this.spikes = 5;
        this.outerRadius = Math.random() * 6 + 4;
        this.innerRadius = this.outerRadius / 2;
      }

      update() {
        // Wandering motion
        this.x += this.vx;
        this.y += this.vy;

        // Bounce on borders
        if (this.x < 0 || this.x > canvas!.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas!.height) this.vy = -this.vy;

        // Cursor attraction/repulsion
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        if (mx !== null && my !== null) {
          const dx = mx - this.x;
          const dy = my - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < mouseRef.current.radius) {
            // Gently pull towards mouse
            const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
            this.x += (dx / dist) * force * 0.65;
            this.y += (dy / dist) * force * 0.65;
          }
        }
      }

      draw() {
        if (!ctx) return;
        if (this.isStar) {
          drawStar(ctx, this.x, this.y, this.spikes, this.outerRadius, this.innerRadius, 'rgba(253, 224, 71, 0.7)'); // Soft glowing yellow star
        } else {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.55)'; // Glowing yellow circle node
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Populate particles array
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Render loop
    const animate = () => {
      // 1. Draw Locker Room Door background grid directly on Canvas
      const lockerColWidth = 320;
      const tierCount = 2;
      const colCount = Math.ceil(canvas.width / lockerColWidth);
      const lockerRowHeight = canvas.height / tierCount;

      ctx.fillStyle = '#006ab3'; // Main frame electric blue base
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let col = 0; col < colCount; col++) {
        const x = col * lockerColWidth;
        
        for (let tier = 0; tier < tierCount; tier++) {
          const y = tier * lockerRowHeight;
          const w = lockerColWidth;
          const h = lockerRowHeight;

          // Draw frame gap border lines (shadow)
          ctx.strokeStyle = '#00477a';
          ctx.lineWidth = 3.5;
          ctx.strokeRect(x, y, w, h);

          // Bevel highlights for 3D look
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

          // Inset door panel
          const margin = 16;
          const doorX = x + margin;
          const doorY = y + margin;
          const doorW = w - margin * 2;
          const doorH = h - margin * 2;

          // Door background (slightly lighter than frame)
          ctx.fillStyle = '#0075c7';
          ctx.fillRect(doorX, doorY, doorW, doorH);

          // Door bevel borders
          ctx.strokeStyle = '#005d9e'; // Inner dark shadow border
          ctx.lineWidth = 2;
          ctx.strokeRect(doorX, doorY, doorW, doorH);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Inner light highlight
          ctx.beginPath();
          ctx.moveTo(doorX + 1, doorY + doorH - 1);
          ctx.lineTo(doorX + 1, doorY + 1);
          ctx.lineTo(doorX + doorW - 1, doorY + 1);
          ctx.stroke();

          // 1. Top Vents (3 horizontal slits)
          const ventW = Math.min(80, doorW * 0.45);
          const ventH = 6;
          const ventX = doorX + (doorW - ventW) / 2;
          const ventGap = 8;
          const topVentsY = doorY + 24;

          ctx.fillStyle = '#003a63'; // Vent shadow (cutout look)
          for (let i = 0; i < 3; i++) {
            const vy = topVentsY + i * (ventH + ventGap);
            
            // Draw dark vent slot
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(ventX, vy, ventW, ventH, 2.5);
            } else {
              ctx.rect(ventX, vy, ventW, ventH);
            }
            ctx.fill();

            // Vent metal bevel highlight (under the vent slot)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ventX, vy + ventH + 0.5);
            ctx.lineTo(ventX + ventW, vy + ventH + 0.5);
            ctx.stroke();
          }

          // 2. Bottom Vents (4 horizontal slits)
          const bottomVentsY = doorY + doorH - 75;
          for (let i = 0; i < 4; i++) {
            const vy = bottomVentsY + i * (ventH + ventGap);
            
            ctx.fillStyle = '#003a63';
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(ventX, vy, ventW, ventH, 2.5);
            } else {
              ctx.rect(ventX, vy, ventW, ventH);
            }
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ventX, vy + ventH + 0.5);
            ctx.lineTo(ventX + ventW, vy + ventH + 0.5);
            ctx.stroke();
          }

          // 3. Handle latch box on the left side of the door panel
          const handleW = 22;
          const handleH = 60;
          const handleX = doorX + 16;
          const handleY = doorY + (doorH - handleH) / 2.3; // offset from center

          // Handle indentation box (cutout look)
          ctx.fillStyle = '#00477a';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(handleX, handleY, handleW, handleH, 3);
          } else {
            ctx.rect(handleX, handleY, handleW, handleH);
          }
          ctx.fill();

          // Shadow inner border
          ctx.strokeStyle = '#002f52';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Steel Lock Dial / Lock button inside handle
          const lockX = handleX + handleW / 2;
          const lockY = handleY + handleH - 12;
          const lockRad = 4.5;
          
          // Outer circle
          ctx.fillStyle = '#b0c7db'; // Silver lock metal
          ctx.beginPath();
          ctx.arc(lockX, lockY, lockRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#002f52';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Center keyhole notch
          ctx.fillStyle = '#001829';
          ctx.beginPath();
          ctx.arc(lockX, lockY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Render mouse-following warm spotlight glow
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      if (mx !== null && my !== null) {
        const glowRad = mouseRef.current.radius * 1.5;
        const radialGrad = ctx.createRadialGradient(mx, my, 0, mx, my, glowRad);
        // Sunburst orange/pink glow on the blue planks
        radialGrad.addColorStop(0, 'rgba(250, 204, 21, 0.18)'); // Yellow spotlight
        radialGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.09)'); // Orange dispersion
        radialGrad.addColorStop(0.8, 'rgba(236, 72, 153, 0.03)'); // Pink halo
        radialGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(mx, my, glowRad, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Update and draw particles, connecting nearby nodes
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect with neighboring particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.28;
            ctx.strokeStyle = `rgba(253, 224, 71, ${alpha})`; // Soft glowing yellow connector line
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // Draw connections directly to the cursor
        if (mx !== null && my !== null) {
          const dx = particles[i].x - mx;
          const dy = particles[i].y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRef.current.radius) {
            const alpha = (1 - dist / mouseRef.current.radius) * 0.45;
            ctx.strokeStyle = `rgba(253, 224, 71, ${alpha})`; // Gold pointer connection
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mx, my);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanups
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 bg-slate-900 pointer-events-none block"
    />
  );
}
