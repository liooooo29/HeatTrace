interface SegmentedBarProps {
  value: number;
  max: number;
  segments?: number;
  status?: 'default' | 'accent' | 'warning';
}

export function SegmentedBar({ value, max, segments = 24, status = 'default' }: SegmentedBarProps) {
  const ratio = Math.min(value / max, 1);
  const filledCount = value > 0 ? Math.max(Math.round(ratio * segments), 1) : 0;

  return (
    <div className="segmented-bar" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className="segmented-bar-segment"
          data-filled={i < filledCount ? 'true' : 'false'}
          data-status={status}
        />
      ))}
    </div>
  );
}
