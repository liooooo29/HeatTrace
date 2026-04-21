import { useEffect, useRef, useState, useCallback } from 'react';
import { GetMouseTrail } from '../wails-bindings';
import { t } from '../i18n';
import type { Lang } from '../i18n';

interface TrailPoint {
  x: number;
  y: number;
  screen_w: number;
  screen_h: number;
}

interface MouseTrailProps {
  lang: Lang;
}

const HOUR_OPTIONS = [1, 3, 6, 24];

export function MouseTrail({ lang }: MouseTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [hours, setHours] = useState(1);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadTrail = useCallback(async () => {
    setLoading(true);
    setPlaying(false);
    setProgress(0);
    try {
      const data = await GetMouseTrail(hours);
      setTrail(data || []);
    } catch {
      setTrail([]);
    }
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    loadTrail();
  }, [loadTrail]);

  // Draw static trail
  const drawStatic = useCallback((pts: TrailPoint[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (pts.length === 0) return;

    // Use first point's screen dimensions for normalization
    const sw = pts[0].screen_w || 1;
    const sh = pts[0].screen_h || 1;

    // Background
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(61, 53, 48, 0.4)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Full trail path
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < pts.length; i++) {
      const px = (pts[i].x / sw) * w;
      const py = (pts[i].y / sh) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }, []);

  // Draw animated progress
  const drawAnimated = useCallback((pts: TrailPoint[], idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (pts.length === 0) return;

    const sw = pts[0].screen_w || 1;
    const sh = pts[0].screen_h || 1;

    // Background
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(61, 53, 48, 0.4)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Faded full trail
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const px = (pts[i].x / sw) * w;
        const py = (pts[i].y / sh) * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Animated trail with gradient (bright at head)
    if (idx > 0) {
      const head = Math.min(idx, pts.length - 1);
      const tailStart = Math.max(0, head - 60);

      for (let i = tailStart; i < head; i++) {
        const alpha = ((i - tailStart) / (head - tailStart)) * 0.8 + 0.1;
        const px = (pts[i].x / sw) * w;
        const py = (pts[i].y / sh) * h;
        const nx = (pts[i + 1].x / sw) * w;
        const ny = (pts[i + 1].y / sh) * h;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
        ctx.lineWidth = 1.5 + alpha * 1.5;
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }

      // Head dot
      const hx = (pts[head].x / sw) * w;
      const hy = (pts[head].y / sh) * h;
      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 16);
      glow.addColorStop(0, 'rgba(99, 102, 241, 0.9)');
      glow.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
      glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(hx, hy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#818CF8';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // Redraw on trail change
  useEffect(() => {
    if (!playing) drawStatic(trail);
  }, [trail, playing, drawStatic, drawStatic]);

  // Animation loop
  useEffect(() => {
    if (!playing || trail.length < 2) return;
    let idx = 0;
    const step = Math.max(1, Math.floor(trail.length / 300)); // ~5s animation
    const tick = () => {
      drawAnimated(trail, idx);
      setProgress(idx / (trail.length - 1));
      idx += step;
      if (idx < trail.length) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
        drawStatic(trail);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, trail, drawAnimated, drawStatic]);

  const handlePlay = () => {
    if (trail.length < 2) return;
    setProgress(0);
    setPlaying(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {HOUR_OPTIONS.map(h => (
            <button key={h} onClick={() => setHours(h)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150"
              style={{
                backgroundColor: hours === h ? 'var(--accent-bg)' : 'var(--surface)',
                color: hours === h ? 'var(--accent)' : 'var(--muted)',
              }}>
              {t(`act.trail${h}h`, lang)}
            </button>
          ))}
        </div>
        {trail.length > 0 && (
          <button onClick={playing ? undefined : handlePlay} disabled={playing}
            className="px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150"
            style={{
              backgroundColor: playing ? 'var(--surface-2)' : 'var(--accent-bg)',
              color: 'var(--accent)',
              opacity: playing ? 0.6 : 1,
            }}>
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21"/>
              </svg>
            )}
            {playing ? t('act.pause', lang) : t('act.play', lang)}
          </button>
        )}
      </div>

      {loading ? (
        <div className="chart-card">
          <div className="skeleton h-48" />
        </div>
      ) : trail.length === 0 ? (
        <div className="chart-card p-8 flex items-center justify-center"
          style={{ color: 'var(--muted)', fontSize: 13, minHeight: 192 }}>
          {t('act.noTrail', lang)}
        </div>
      ) : (
        <div className="chart-card">
          <canvas ref={canvasRef} width={600} height={200} className="w-full rounded-lg" />
          {playing && (
            <div className="h-[2px] mt-0" style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-full transition-all duration-75"
                style={{ width: `${progress * 100}%`, backgroundColor: 'var(--accent)' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
