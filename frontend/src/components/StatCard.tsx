interface StatCardProps {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
  delta?: number;
}

export function StatCard({ label, value, color = 'var(--accent)', icon, delta }: StatCardProps) {
  const showDelta = delta != null && delta !== 0;
  const deltaColor = delta != null && delta > 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="card p-5 relative overflow-hidden">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: color }} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <div className="stat-value" style={{ color: 'var(--fg)' }}>
              {value}
            </div>
            {showDelta && (
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: deltaColor }}>
                {delta! > 0 ? '+' : ''}{delta}%
              </span>
            )}
          </div>
          <div className="stat-label">
            {label}
          </div>
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface-2)' }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
