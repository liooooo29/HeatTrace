import type { WeatherDay } from '../types';
import type { Lang } from '../i18n';

interface WeatherRowProps {
  days: WeatherDay[];
  lang: Lang;
}

export function WeatherRow({ days, lang }: WeatherRowProps) {
  if (days.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto">
      {days.map((day) => {
        const label = lang === 'zh' ? day.label_zh : day.label;
        const weather = lang === 'zh' ? day.weather_zh : day.weather;
        const dow = new Date(day.date + 'T00:00:00').getDay();
        const dowLabels = lang === 'zh'
          ? ['日', '一', '二', '三', '四', '五', '六']
          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
          <div key={day.date} className="card flex-1 p-3 text-center min-w-[72px]"
            style={{ cursor: 'default' }}>
            <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--muted)' }}>
              {dowLabels[dow]}
            </div>
            <div className="text-2xl mb-1" style={{ lineHeight: 1.2 }}>{day.icon}</div>
            <div className="text-[10px] font-semibold" style={{ color: 'var(--fg-2)' }}>
              {label}
            </div>
            <div className="text-[9px] mt-0.5" style={{ color: 'var(--muted-2)' }}>
              {weather}
            </div>
          </div>
        );
      })}
    </div>
  );
}
