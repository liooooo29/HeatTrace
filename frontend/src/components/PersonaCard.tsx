import type { Persona } from '../types';
import { t } from '../i18n';
import type { Lang } from '../i18n';

interface PersonaCardProps {
  persona: Persona;
  lang: Lang;
  totalKeys: number;
  avgWPM: number;
  activeMinutes: number;
}

export function PersonaCard({ persona, lang, totalKeys, avgWPM, activeMinutes }: PersonaCardProps) {
  const name = lang === 'zh' ? persona.name_zh : persona.name;
  const slogan = lang === 'zh' ? persona.slogan_zh : persona.slogan;

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  const formatKeys = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
  };

  return (
    <div className="persona-card" style={{
      background: `linear-gradient(135deg, color-mix(in srgb, ${persona.color} 15%, var(--card)) 0%, var(--card) 60%, color-mix(in srgb, ${persona.color} 8%, var(--card)) 100%)`,
      border: `1px solid color-mix(in srgb, ${persona.color} 25%, var(--border))`,
      borderRadius: 16,
      padding: '28px 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: `radial-gradient(circle, color-mix(in srgb, ${persona.color} 12%, transparent) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div className="flex items-start gap-5">
        {/* Emoji avatar */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: `color-mix(in srgb, ${persona.color} 12%, var(--surface))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          flexShrink: 0,
        }}>
          {persona.emoji}
        </div>

        {/* Text */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{name}</span>
            <span className="badge" style={{
              backgroundColor: `color-mix(in srgb, ${persona.color} 15%, transparent)`,
              color: persona.color,
              fontSize: 10,
            }}>
              {t('report.weeklyPersona', lang)}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{slogan}</p>
        </div>
      </div>

      {/* 3 mini stats */}
      <div className="flex gap-6 mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div>
          <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{formatKeys(totalKeys)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{t('report.keys', lang)}</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{avgWPM.toFixed(0)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{t('report.wpm', lang)}</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{formatMinutes(activeMinutes)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{t('report.active', lang)}</div>
        </div>
      </div>
    </div>
  );
}
