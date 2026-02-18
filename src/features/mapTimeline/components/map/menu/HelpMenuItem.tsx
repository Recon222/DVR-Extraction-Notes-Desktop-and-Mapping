/**
 * HelpMenuItem Component
 *
 * Menu item that triggers the help panel.
 * Shows keyboard shortcut hint (F12).
 */

import { MenuItem } from './MenuItem';

interface HelpMenuItemProps {
  onClick: () => void;
}

export const HelpMenuItem = ({ onClick }: HelpMenuItemProps) => {
  return (
    <MenuItem
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
      label="Help"
      hint="F12"
      onClick={onClick}
    />
  );
};
