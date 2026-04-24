interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
}

export function StatCard({ label, value, delta }: StatCardProps) {
  const showDelta = delta != null && delta !== 0;
  const deltaColor = delta != null && delta > 0 ? 'var(--success)' : 'var(--accent)';

  return (
    <div className="py-3">
      <div className="flex items-baseline gap-2">
        <span className="stat-value">{value}</span>
        {showDelta && (
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.04em',
            color: deltaColor,
          }}>
            {delta! > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
