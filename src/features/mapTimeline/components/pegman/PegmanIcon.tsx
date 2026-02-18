/**
 * PegmanIcon Component
 *
 * Custom SVG icon for the Pegman control - a legal alternative to Google's trademarked design.
 * Shows a simple stick figure person with two states: idle and grabbed (with arms raised).
 */

interface PegmanIconProps {
  className?: string;
  grabbed?: boolean;
}

export const PegmanIcon = ({ className, grabbed = false }: PegmanIconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Head */}
    <circle cx="12" cy="6" r="2.5" fill="currentColor" stroke="none" />

    {/* Body */}
    <path d="M12 8.5 L12 15" strokeWidth="2" />

    {/* Arms - raised if grabbed, down if idle */}
    {grabbed ? (
      <>
        {/* Arms up - celebrating/grabbed pose */}
        <path d="M12 10 L9 7" strokeWidth="2" />
        <path d="M12 10 L15 7" strokeWidth="2" />
      </>
    ) : (
      <>
        {/* Arms down - idle pose */}
        <path d="M12 11 L9 13" strokeWidth="2" />
        <path d="M12 11 L15 13" strokeWidth="2" />
      </>
    )}

    {/* Legs */}
    <path d="M12 15 L10 19" strokeWidth="2" />
    <path d="M12 15 L14 19" strokeWidth="2" />
  </svg>
);
