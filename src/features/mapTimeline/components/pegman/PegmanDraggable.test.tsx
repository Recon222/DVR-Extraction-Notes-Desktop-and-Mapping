/**
 * Tests for PegmanDraggable Component
 *
 * Focuses on portal target selection based on fullscreen state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PegmanDraggable } from './PegmanDraggable';

describe('PegmanDraggable', () => {
  let fullscreenContainer: HTMLDivElement;

  beforeEach(() => {
    // Create fullscreen container in DOM
    fullscreenContainer = document.createElement('div');
    fullscreenContainer.id = 'map-timeline-fullscreen-container';
    document.body.appendChild(fullscreenContainer);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(fullscreenContainer);
    vi.restoreAllMocks();
  });

  describe('Portal Target Selection', () => {
    it('should portal to document.body in normal mode', () => {
      // Arrange: Not in fullscreen mode
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true
      });

      // Act
      render(<PegmanDraggable position={{ x: 100, y: 100 }} />);

      // Assert: Pegman should be in document.body
      const pegmanInBody = document.body.querySelector('.bg-yellow-400');
      expect(pegmanInBody).toBeTruthy();

      // Should NOT be in fullscreen container
      const pegmanInContainer = fullscreenContainer.querySelector('.bg-yellow-400');
      expect(pegmanInContainer).toBeFalsy();
    });

    it('should portal to fullscreen container when in fullscreen mode', () => {
      // Arrange: In fullscreen mode
      Object.defineProperty(document, 'fullscreenElement', {
        value: fullscreenContainer,
        writable: true,
        configurable: true
      });

      // Act
      render(<PegmanDraggable position={{ x: 100, y: 100 }} />);

      // Assert: Pegman should be in fullscreen container
      const pegmanInContainer = fullscreenContainer.querySelector('.bg-yellow-400');
      expect(pegmanInContainer).toBeTruthy();
    });

    it('should fallback to document.body if fullscreen container is missing', () => {
      // Arrange: In fullscreen mode but container doesn't exist
      document.body.removeChild(fullscreenContainer);

      Object.defineProperty(document, 'fullscreenElement', {
        value: document.createElement('div'), // Some other element
        writable: true,
        configurable: true
      });

      // Act
      render(<PegmanDraggable position={{ x: 100, y: 100 }} />);

      // Assert: Should fallback to document.body
      const pegmanInBody = document.body.querySelector('.bg-yellow-400');
      expect(pegmanInBody).toBeTruthy();
    });
  });

  describe('Positioning', () => {
    it('should render at correct position', () => {
      const position = { x: 250, y: 350 };

      render(<PegmanDraggable position={position} />);

      const pegmanElement = document.body.querySelector('.fixed') as HTMLElement;
      expect(pegmanElement).toBeTruthy();

      // Position should be offset by -24 (half of button size)
      expect(pegmanElement.style.left).toBe('226px');
      expect(pegmanElement.style.top).toBe('326px');
    });

    it('should use return position when returning', () => {
      const position = { x: 250, y: 350 };
      const returnPosition = { x: 100, y: 100 };

      render(
        <PegmanDraggable
          position={position}
          returning={true}
          returnPosition={returnPosition}
        />
      );

      const pegmanElement = document.body.querySelector('.fixed') as HTMLElement;

      // Should use return position, not current position
      expect(pegmanElement.style.left).toBe('76px');
      expect(pegmanElement.style.top).toBe('76px');
    });
  });

  describe('Visual States', () => {
    it('should have normal scale when dragging', () => {
      render(<PegmanDraggable position={{ x: 100, y: 100 }} returning={false} />);

      const pegmanElement = document.body.querySelector('.fixed') as HTMLElement;
      expect(pegmanElement.style.transform).toBe('scale(1.1)');
      expect(pegmanElement.style.opacity).toBe('0.9');
      expect(pegmanElement.style.transition).toBe('none');
    });

    it('should have return animation when returning', () => {
      render(<PegmanDraggable position={{ x: 100, y: 100 }} returning={true} />);

      const pegmanElement = document.body.querySelector('.fixed') as HTMLElement;
      expect(pegmanElement.style.transform).toBe('scale(1)');
      expect(pegmanElement.style.opacity).toBe('0.7');
      expect(pegmanElement.style.transition).toContain('300ms');
    });

    it('should have pointer-events-none class', () => {
      render(<PegmanDraggable position={{ x: 100, y: 100 }} />);

      const pegmanElement = document.body.querySelector('.fixed') as HTMLElement;
      expect(pegmanElement.className).toContain('pointer-events-none');
    });

    it('should have high z-index', () => {
      render(<PegmanDraggable position={{ x: 100, y: 100 }} />);

      const pegmanElement = document.body.querySelector('.fixed') as HTMLElement;
      expect(pegmanElement.className).toContain('z-[9999]');
    });
  });

  describe('Rendering', () => {
    it('should render PegmanIcon with grabbed state', () => {
      render(<PegmanDraggable position={{ x: 100, y: 100 }} />);

      // Icon should be rendered
      const icon = document.body.querySelector('.w-6.h-6');
      expect(icon).toBeTruthy();
    });

    it('should render yellow background circle', () => {
      render(<PegmanDraggable position={{ x: 100, y: 100 }} />);

      const yellowCircle = document.body.querySelector('.bg-yellow-400');
      expect(yellowCircle).toBeTruthy();
      expect(yellowCircle?.className).toContain('rounded-full');
    });
  });
});
