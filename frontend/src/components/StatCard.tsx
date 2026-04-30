interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
}

export function StatCard({ label, value, delta, hint }: StatCardProps) {
  const showDelta = delta != null && delta !== 0;
  const deltaColor = delta != null && delta > 0 ? 'var(--success)' : 'var(--accent)';

  return (
    <div className="py-3">
      <div className="flex items-baseline gap-2">
        <span className="stat-value">{value}</span>
        {showDelta && (
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 'var(--label-size)',
            letterSpacing: '0.04em',
            color: deltaColor,
          }}>
            {delta! > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div className="stat-label">{label}</div>
      {hint && (
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: 'var(--text-disabled)',
          letterSpacing: '0.04em',
          marginTop: 2,
        }}>{hint}</div>
      )}
    </div>
  );
}
