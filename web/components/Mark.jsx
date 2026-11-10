export default function Mark({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M10.2 16.2c1.8-3.4 9.8-3.4 11.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M10.2 16.2c1.8 3.4 9.8 3.4 11.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="16" cy="16.2" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function ChainMark({ chain }) {
  const name = chain || "";
  if (name === "Solana") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <path fill="currentColor" d="M5 6.2h10.2l2.6-2H7.6L5 6.2zm3.2 6.8H18.4l-2.6-2H5.6l2.6 2zM5 19.8h10.2l2.6-2H7.6L5 19.8z" />
      </svg>
    );
  }
  if (name === "Base") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    );
  }
  if (name === "Ethereum") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <path fill="currentColor" d="M12 2.2 6 12.2l6 3.4 6-3.4L12 2.2zm0 15.1-6-3.4 6 8.1 6-8.1-6 3.4z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M5 18V5.5L13.5 18H15V5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
