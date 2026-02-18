/**
 * HamburgerMenuControl Component
 *
 * Main orchestrating component for the hamburger menu.
 * Manages menu state, keyboard interactions, and click-outside behavior.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { HamburgerButton } from './HamburgerButton';
import { HamburgerMenu } from './HamburgerMenu';
import { HelpMenuItem } from './HelpMenuItem';
import { SearchMenuItem } from './SearchMenuItem';
import { EditPOVToggleMenuItem } from './EditPOVToggleMenuItem';
import { useIsViewerMode } from '@/contexts/AppModeContext';

interface HamburgerMenuControlProps {
  mapRef: React.RefObject<MapRef>;
  onHelpOpen: () => void;
}

export const HamburgerMenuControl = ({
  mapRef,
  onHelpOpen
}: HamburgerMenuControlProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isViewerMode = useIsViewerMode();

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleHelpClick = useCallback(() => {
    onHelpOpen();
    setIsOpen(false); // Close menu after opening help
  }, [onHelpOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div ref={menuRef} className="absolute top-28 right-2 z-10">
      <HamburgerButton
        isOpen={isOpen}
        onClick={handleToggle}
        aria-expanded={isOpen}
      />

      {isOpen && (
        <HamburgerMenu>
          {/* Search location */}
          <SearchMenuItem mapRef={mapRef} onClose={handleClose} />

          {/* Edit POVs toggle - HIDDEN IN VIEWER MODE */}
          {!isViewerMode && <EditPOVToggleMenuItem />}

          {/* Help panel */}
          <HelpMenuItem onClick={handleHelpClick} />

          {/* Future items section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">
              More options coming soon...
            </div>
          </div>
        </HamburgerMenu>
      )}
    </div>
  );
};
