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
    ctx.clearRect(0, 0, w, h);

    // Background — warm dark tone
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(61, 53, 48, 0.6)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Normalize points to canvas space
    const maxX = Math.max(...points.map(p => p.x), 1);
    const maxY = Math.max(...points.map(p => p.y), 1);

    points.forEach(p => {
      const x = (p.x / maxX) * w;
      const y = (p.y / maxY) * h;
      const radius = 8 + p.value * 16;
      const alpha = 0.2 + p.value * 0.3;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(245, 158, 11, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(245, 158, 11, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
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
