/**
 * HamburgerMenu Component
 *
 * The dropdown menu container that slides down from the hamburger button.
 * Contains menu items and handles animation.
 */

import { Z_INDEX } from '@config/zIndex';

interface HamburgerMenuProps {
  children: React.ReactNode;
}

export const HamburgerMenu = ({ children }: HamburgerMenuProps) => {
  return (
    <div
      className="
        absolute top-[46px] right-0
        bg-white dark:bg-gray-800
        rounded-lg shadow-lg
        min-w-[280px]
        animate-in slide-in-from-top-2 duration-200
        border border-gray-200 dark:border-gray-700
      "
      style={{ zIndex: Z_INDEX.HAMBURGER_MENU }}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>
  );
};
