import { t } from '../i18n';
import type { Lang } from '../i18n';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  lang: Lang;
}

export function DateRangePicker({ startDate, endDate, onChange, lang }: DateRangePickerProps) {
  const today = new Date().toISOString().slice(0, 10);

  const presets = [
    { label: t('date.today', lang), days: 0 },
    { label: t('date.7d', lang), days: 6 },
    { label: t('date.30d', lang), days: 29 },
  ];

  const applyPreset = (days: number) => {
    if (days === 0) {
      onChange(today, today);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - days);
      onChange(d.toISOString().slice(0, 10), today);
    }
  };

  const isPreset = (days: number) => {
    if (days === 0) return startDate === today && endDate === today;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return startDate === d.toISOString().slice(0, 10) && endDate === today;
  };

  const inputStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--fg)',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
        {presets.map(p => (
          <button key={p.label} onClick={() => applyPreset(p.days)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium"
            style={{
              backgroundColor: isPreset(p.days) ? 'var(--accent-bg)' : 'transparent',
              color: isPreset(p.days) ? 'var(--accent)' : 'var(--muted)',
              fontWeight: isPreset(p.days) ? 600 : 500,
            }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 ml-1">
        <input type="date" value={startDate} max={today}
          onChange={e => onChange(e.target.value, endDate)}
          className="rounded-md px-2 py-1 text-[11px] border"
          style={inputStyle} />
        <span className="text-[11px]" style={{ color: 'var(--muted-2)' }}>/</span>
        <input type="date" value={endDate} min={startDate} max={today}
          onChange={e => onChange(startDate, e.target.value)}
          className="rounded-md px-2 py-1 text-[11px] border"
          style={inputStyle} />
      </div>
    </div>
  );
}
