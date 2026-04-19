interface StatCardProps {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, color = 'var(--accent)', icon }: StatCardProps) {
  return (
    <div className="card p-5 relative overflow-hidden group">
      {/* Top accent bar with gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))` }} />

      {/* Subtle corner glow */}
      <div className="absolute -top-8 -right-8 w-16 h-16 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />

      <div className="flex items-start justify-between">
        <div>
          <div className="stat-value" style={{ color: 'var(--fg)' }}>
            {value}
          </div>
          <div className="stat-label">
            {label}
          </div>
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
