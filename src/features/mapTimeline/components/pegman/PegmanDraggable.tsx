/**
 * PegmanDraggable Component
 *
 * Portal-rendered dragging element that follows the cursor.
 * Intelligently renders to the fullscreen container when in fullscreen mode,
 * or to document.body in normal mode.
 */

import { createPortal } from 'react-dom';
import { PegmanIcon } from './PegmanIcon';
import { ANIMATION_TIMING, EASING } from '../../constants/animations';
import { Z_INDEX } from '@config/zIndex';
import { usePortalTarget } from '../../hooks/usePortalTarget';

interface PegmanDraggableProps {
  position: { x: number; y: number };
  returning?: boolean;
  returnPosition?: { x: number; y: number };
}

export const PegmanDraggable = ({ position, returning = false, returnPosition }: PegmanDraggableProps) => {
  // Calculate final position (either cursor position or return position)
  const finalPosition = returning && returnPosition ? returnPosition : position;

  // Get the portal target (fullscreen container or document.body)
  const portalTarget = usePortalTarget();

  return createPortal(
    <div
      className={`fixed pointer-events-none z-[${Z_INDEX.PEGMAN_DRAGGING}]`}
      style={{
        left: finalPosition.x - 24, // Center on cursor (half of 48px button: 32px icon + 16px padding)
        top: finalPosition.y - 24,
        transform: returning ? 'scale(1)' : 'scale(1.1)',
        opacity: returning ? 0.7 : 0.9,
        transition: returning ? `all ${ANIMATION_TIMING.PEGMAN_RETURN}ms ${EASING.EASE_OUT}` : 'none'
      }}
    >
      <div className="bg-yellow-400 rounded-full p-2 shadow-lg">
        <PegmanIcon
          className="w-8 h-8 text-white"
          grabbed={true}
        />
      </div>
    </div>,
    portalTarget
  );
};
