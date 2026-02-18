/**
 * MenuItem Component
 *
 * Reusable menu item wrapper with icon and label.
 * Provides consistent styling and interaction patterns.
 */

import { ReactNode } from 'react';

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}

export const MenuItem = ({
  icon,
  label,
  onClick,
  disabled = false,
  hint
}: MenuItemProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center justify-between gap-3 px-4 py-3
        text-left text-sm font-medium
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-700
        transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      role="menuitem"
      type="button"
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-500 dark:text-gray-400">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {hint && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {hint}
        </span>
      )}
    </button>
  );
};
