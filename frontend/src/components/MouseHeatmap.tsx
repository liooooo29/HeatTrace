import { useEffect, useRef } from 'react';
import type { MouseHeatPoint } from '../types';

export function MouseHeatmap({ points }: { points: MouseHeatPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const isDark = document.documentElement.classList.contains('light') === false;
    ctx.clearRect(0, 0, w, h);

    // Background — nothing surface
    ctx.fillStyle = isDark ? '#111111' : '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // Subtle dot grid
    ctx.fillStyle = isDark ? 'rgba(51, 51, 51, 0.3)' : 'rgba(204, 204, 204, 0.3)';
    for (let x = 0; x < w; x += 60) {
      for (let y = 0; y < h; y += 60) {
        ctx.beginPath();
        ctx.arc(x, y, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Normalize points to canvas space
    const maxX = Math.max(...points.map(p => p.x), 1);
    const maxY = Math.max(...points.map(p => p.y), 1);

    points.forEach(p => {
      const x = (p.x / maxX) * w;
      const y = (p.y / maxY) * h;
      const radius = 8 + p.value * 16;
      const alpha = 0.15 + p.value * 0.35;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      // Accent red tint — Nothing monochrome system
      gradient.addColorStop(0, `rgba(215, 25, 33, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(215, 25, 33, ${alpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(215, 25, 33, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div className="chart-card">
      <canvas ref={canvasRef} width={600} height={300}
        className="w-full rounded-lg" />
    </div>
  );
}
