import { useState } from 'react';
import { themePresets, morphPresets, getMorphAccent, lerpColor } from '../themes';
import type { ThemeMode, MorphPreset } from '../themes';
import { t } from '../i18n';
import type { Lang } from '../i18n';

interface ThemeSelectorProps {
  lang: Lang;
  mode: ThemeMode;
  activePresetId: string;
  morphEnabled: boolean;
  morphPresetId: string;
  currentWpm: number;
  onSelectPreset: (id: string) => void;
  onToggleMorph: () => void;
  onSelectMorphPreset: (id: string) => void;
}

/** Gradient bar showing the morph color range */
function MorphGradientBar({ preset, wpm }: { preset: MorphPreset; wpm: number }) {
  const { colors } = preset;
  const gradientStops = [colors.idle, colors.slow, colors.moderate, colors.fast, colors.intense];
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`;
  const currentColor = wpm > 0 ? getMorphAccent(wpm, colors) : colors.idle;
  const position = Math.min(wpm / 100, 1) * 100;

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <div style={{
        height: 3,
        borderRadius: 2,
        background: gradient,
        opacity: 0.5,
      }} />
      {wpm > 0 && (
        <div style={{
          position: 'absolute',
          top: -2,
          left: `${position}%`,
          transform: 'translateX(-50%)',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: currentColor,
          boxShadow: `0 0 6px ${currentColor}80`,
          transition: 'left 1.5s ease, background-color 1.5s ease',
        }} />
      )}
    </div>
  );
}

export function ThemeSelector({
  lang, mode, activePresetId, morphEnabled, morphPresetId, currentWpm,
  onSelectPreset, onToggleMorph, onSelectMorphPreset,
}: ThemeSelectorProps) {
  const [expandedMorph, setExpandedMorph] = useState(false);
  const activeMorphPreset = morphPresets.find(p => p.id === morphPresetId) || morphPresets[0];

  return (
    <div>
      {/* ── Section: Theme Presets ──────────────────────────── */}
      <div className="section-title" style={{ marginBottom: 10 }}>
        {t('theme.presets', lang)}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 20,
      }}>
        {themePresets.map(preset => {
          const isActive = !morphEnabled && activePresetId === preset.id;
          const accent = preset.accent;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: isActive ? 'var(--surface-raised)' : 'transparent',
                border: `1px solid ${isActive ? accent : 'var(--border)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              {/* Color swatch */}
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: accent,
                border: `2px solid ${isActive ? accent : 'var(--border-visible)'}`,
                flexShrink: 0,
                transition: 'border-color 0.2s',
              }} />
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: '0.06em',
                color: isActive ? 'var(--text-display)' : 'var(--text-secondary)',
                textAlign: 'left',
                lineHeight: 1.2,
                transition: 'color 0.2s',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {lang === 'zh' ? preset.nameZh : preset.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Section: Morph (dynamic) ────────────────────────── */}
      <div style={{
        border: `1px solid ${morphEnabled ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: 14,
        transition: 'border-color 0.3s',
        background: morphEnabled ? 'var(--surface-raised)' : 'transparent',
      }}>
        {/* Morph header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMorph}
              className="toggle-track"
              data-on={morphEnabled}
            >
              <div className="toggle-thumb" />
            </button>
            <div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: morphEnabled ? 'var(--text-display)' : 'var(--text-secondary)',
                letterSpacing: '0.02em',
                transition: 'color 0.2s',
              }}>
                {t('theme.morph', lang)}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginTop: 1,
              }}>
                {t('theme.morphDesc', lang)}
              </div>
            </div>
          </div>

          {/* Live WPM indicator */}
          {morphEnabled && (
            <div className="flex items-center gap-2">
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: currentWpm > 0 ? 'var(--accent)' : 'var(--text-disabled)',
                boxShadow: currentWpm > 0 ? '0 0 6px var(--accent)' : 'none',
                transition: 'background-color 1.5s ease, box-shadow 1.5s ease',
              }} />
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-display)',
                minWidth: 36,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {currentWpm}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: 'var(--text-disabled)',
                letterSpacing: '0.04em',
              }}>
                WPM
              </span>
            </div>
          )}
        </div>

        {/* Morph expanded: preset selector */}
        {morphEnabled && (
          <div style={{ marginTop: 14 }}>
            {/* Current preset name + expand toggle */}
            <button
              onClick={() => setExpandedMorph(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                width: '100%',
              }}
            >
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: activeMorphPreset.colors.moderate,
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: 'var(--text-primary)',
                letterSpacing: '0.06em',
                flex: 1,
                textAlign: 'left',
              }}>
                {lang === 'zh' ? activeMorphPreset.nameZh : activeMorphPreset.name}
                <span style={{ color: 'var(--text-disabled)', marginLeft: 6 }}>
                  {lang === 'zh' ? activeMorphPreset.descriptionZh : activeMorphPreset.description}
                </span>
              </span>
              <span style={{
                fontSize: 8,
                color: 'var(--text-disabled)',
                transform: expandedMorph ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.15s',
              }}>
                ▶
              </span>
            </button>

            {/* Gradient preview bar */}
            <MorphGradientBar preset={activeMorphPreset} wpm={currentWpm} />

            {/* Preset list (expandable) */}
            {expandedMorph && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {morphPresets.map(preset => {
                  const isActive = preset.id === morphPresetId;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onSelectMorphPreset(preset.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        background: isActive ? 'var(--surface)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--border-visible)' : 'transparent'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                    >
                      {/* Mini gradient swatch */}
                      <div style={{
                        width: 32,
                        height: 4,
                        borderRadius: 2,
                        background: `linear-gradient(to right, ${preset.colors.idle}, ${preset.colors.slow}, ${preset.colors.moderate}, ${preset.colors.fast}, ${preset.colors.intense})`,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: isActive ? 'var(--text-display)' : 'var(--text-secondary)',
                        letterSpacing: '0.06em',
                      }}>
                        {lang === 'zh' ? preset.nameZh : preset.name}
                      </span>
                      <span style={{
                        fontSize: 9,
                        color: 'var(--text-disabled)',
                        marginLeft: 'auto',
                      }}>
                        {lang === 'zh' ? preset.descriptionZh : preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
