import { useEffect, useRef, useState } from 'react';
import type { MouseHeatPoint } from '../types';

/** Read the current --accent CSS variable and return [r, g, b] */
function getAccentRgb(): [number, number, number] {
  const val = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  if (!val) return [215, 25, 33]; // fallback Nothing Red
  // Handle hex (#RRGGBB or #RGB)
  const hex = val.replace('#', '');
  if (hex.length === 6) {
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  return [215, 25, 33];
}

export function MouseHeatmap({ points }: { points: MouseHeatPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [accentKey, setAccentKey] = useState(0);

  // Re-render when accent color changes (morph mode)
  useEffect(() => {
    const observer = new MutationObserver(() => setAccentKey(k => k + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const isDark = document.documentElement.classList.contains('light') === false;
    const [r, g, b] = getAccentRgb();

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
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, accentKey]);

  if (points.length === 0) return null;

  return (
    <div className="chart-card">
      <canvas ref={canvasRef} width={600} height={300}
        className="w-full rounded-lg" />
    </div>
  );
}
