// Brand mark: a form card with three entry lines, the first in the accent colour.
export function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#18181b" />
      <rect x="6" y="6.5" width="12" height="2.5" rx="1.25" fill="#2dd4bf" />
      <rect x="6" y="11" width="9" height="2.5" rx="1.25" fill="#fff" />
      <rect x="6" y="15.5" width="6" height="2.5" rx="1.25" fill="#fff" opacity=".55" />
    </svg>
  );
}

export default function Logo({ href = '#/', label = true }) {
  return (
    <a href={href} className="logo-link" aria-label="WpForms home">
      <LogoMark />
      {label && <span className="logo-name">WpForms</span>}
    </a>
  );
}
