/**
 * Mythic Horizon Ambient Particle Protocol
 * 
 * Provides subtle environmental immersion (frost dust or amber sparks)
 * based on the active mission theme. Optimized for 60FPS.
 */

import { appState } from '@/state/app-state';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  drift: number;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animationId: number | null = null;

export function initAtmosphericProtocol(): void {
  canvas = document.getElementById('atmoCanvas') as HTMLCanvasElement;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'atmoCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    document.body.prepend(canvas);
  }

  ctx = canvas.getContext('2d');
  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  createParticles();
  startAnimation();
}

function resizeCanvas(): void {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles(): void {
  particles = [];
  const theme = appState.settings.theme;
  const count = theme === 'vajra-shakti' ? 60 : 40; // More intense for power arena

  for (let i = 0; i < count; i++) {
    particles.push(resetParticle({} as Particle));
  }
}

function resetParticle(p: Particle): Particle {
  const theme = appState.settings.theme;
  const isShakti = theme === 'vajra-shakti';
  
  p.x = Math.random() * (canvas?.width || 1000);
  p.y = isShakti ? (canvas?.height || 1000) + 10 : -10; // Shakti rises, Himavat falls
  p.vx = (Math.random() - 0.5) * 0.5;
  p.vy = isShakti ? -(Math.random() * 0.8 + 0.2) : (Math.random() * 0.6 + 0.2);
  p.size = Math.random() * 2 + 1;
  p.maxAlpha = Math.random() * 0.4 + 0.2;
  p.alpha = 0;
  p.drift = Math.random() * 0.05;
  return p;
}

function startAnimation(): void {
  if (animationId) cancelAnimationFrame(animationId);
  
  function frame() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const theme = appState.settings.theme;
    const isShakti = theme === 'vajra-shakti';
    const color = isShakti ? '251, 191, 36' : '108, 135, 255'; // Amber vs Blue

    particles.forEach(p => {
      // Move
      p.x += p.vx + Math.sin(Date.now() * 0.001 + p.drift) * 0.2;
      p.y += p.vy;

      // Pulse Alpha
      if (p.alpha < p.maxAlpha) p.alpha += 0.005;

      // Draw
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${color}, ${p.alpha})`;
      ctx!.fill();

      // Reset if out of bounds
      if (isShakti) {
        if (p.y < -10 || p.x < -10 || p.x > canvas!.width + 10) resetParticle(p);
      } else {
        if (p.y > canvas!.height + 10 || p.x < -10 || p.x > canvas!.width + 10) resetParticle(p);
      }
    });

    animationId = requestAnimationFrame(frame);
  }

  animationId = requestAnimationFrame(frame);
}
