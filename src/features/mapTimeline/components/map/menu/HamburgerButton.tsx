/**
 * HamburgerButton Component
 *
 * The toggle button for the hamburger menu.
 * Displays a three-line hamburger icon with hover and active states.
 */

interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  'aria-expanded': boolean;
}

export const HamburgerButton = ({
  isOpen,
  onClick,
  'aria-expanded': ariaExpanded
}: HamburgerButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800
        rounded shadow-md
        hover:bg-gray-100 dark:hover:bg-gray-700
        transition-colors p-2
        ${isOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}
      `}
      title="Menu"
      aria-label="Open map menu"
      aria-haspopup="menu"
      aria-expanded={ariaExpanded}
      type="button"
    >
      {/* Hamburger icon - three horizontal lines */}
      <svg
        className="w-5 h-5 text-gray-700 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  );
};
