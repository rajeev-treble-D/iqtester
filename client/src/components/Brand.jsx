import { APP_NAME } from '../lib/brand';

export function Brand() {
  return (
    <span className="brand">
      <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <rect x="8" y="8" width="7" height="7" rx="1.5" fill="var(--on-accent)" />
        <rect x="17" y="8" width="7" height="7" rx="1.5" fill="var(--on-accent)" opacity=".55" />
        <rect x="8" y="17" width="7" height="7" rx="1.5" fill="var(--on-accent)" opacity=".55" />
        <rect
          x="17.75"
          y="17.75"
          width="5.5"
          height="5.5"
          rx="1.2"
          fill="none"
          stroke="var(--on-accent)"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
      </svg>
      <span className="brand__name">{APP_NAME}</span>
    </span>
  );
}
