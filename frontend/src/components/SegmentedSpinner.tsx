import { useEffect, useState } from 'react';

interface SegmentedSpinnerProps {
  count?: number;
}

export function SegmentedSpinner({ count = 5 }: SegmentedSpinnerProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % count);
    }, 200);
    return () => clearInterval(interval);
  }, [count]);

  return (
    <div className="segmented-spinner" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="segmented-spinner-dot"
          style={{
            opacity: i === active ? 1 : 0.2,
            transition: 'opacity 0.15s ease-out',
          }}
        />
      ))}
    </div>
  );
}
