/**
 * PegmanButton Component
 *
 * The idle state button that sits below the hamburger menu.
 * Becomes semi-transparent when dragging to show the "grabbed" state.
 */

import { PegmanIcon } from './PegmanIcon';

interface PegmanButtonProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  isDragging: boolean;
}

export const PegmanButton = ({ onMouseDown, onTouchStart, isDragging }: PegmanButtonProps) => {
  return (
    <button
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`
        absolute top-14 right-2
        bg-yellow-400 hover:bg-yellow-500
        rounded-full shadow-md
        p-2 z-10
        transition-all duration-100
        ${isDragging ? 'opacity-30 scale-90' : 'opacity-100 scale-100'}
        cursor-grab active:cursor-grabbing
      `}
      title="Drag to view Street View"
      aria-label="Drag Pegman to map to open Street View at any location"
      style={{
        touchAction: 'none' // Prevent touch scrolling
      }}
      type="button"
    >
      <PegmanIcon
        className="w-5 h-5 text-white"
        grabbed={false}
      />
    </button>
  );
};
