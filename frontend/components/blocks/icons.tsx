export function Glyph({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, className: "size-6" };
  if (name === "pen") {
    return (
      <svg {...common} aria-hidden>
        <path d="M4 20h4l10-10-4-4L4 16v4z" />
        <path d="M13 7l4 4" />
      </svg>
    );
  }
  if (name === "image") {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.4" />
        <path d="M21 16l-5-4-8 7" />
      </svg>
    );
  }
  if (name === "puzzle") {
    return (
      <svg {...common} aria-hidden>
        <path d="M8 4h4v2a2 2 0 1 0 4 0V4h2v5h-2a2 2 0 1 0 0 4h2v5h-5v-2a2 2 0 1 0-4 0v2H4v-4h2a2 2 0 1 0 0-4H4V4h4z" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3l8 3v6c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V6l8-3z" />
      </svg>
    );
  }
  if (name === "globe") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2.5 2.4 2.5 13.6 0 16M12 4c-2.5 2.4-2.5 13.6 0 16" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <rect x="3" y="4" width="7" height="7" rx="1" />
      <rect x="14" y="4" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="18" height="6" rx="1" />
    </svg>
  );
}
