import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { isValidAction, VALID_ACTIONS } from '../types/touchportal.types';
import { TP_CONFIG, getWebSocketUrl } from '../constants/touchportalConfig';

describe('Touch Portal Types', () => {
  describe('isValidAction', () => {
    it('should return true for valid actions', () => {
      expect(isValidAction('play')).toBe(true);
      expect(isValidAction('pause')).toBe(true);
      expect(isValidAction('step_forward')).toBe(true);
      expect(isValidAction('goto_location')).toBe(true);
    });

    it('should return false for invalid actions', () => {
      expect(isValidAction('invalid_action')).toBe(false);
      expect(isValidAction('')).toBe(false);
      expect(isValidAction('PLAY')).toBe(false); // Case sensitive
    });
  });

  describe('VALID_ACTIONS', () => {
    it('should contain all required actions', () => {
      const requiredActions = [
        'play', 'pause', 'toggle_playback',
        'step_forward', 'step_backward',
        'goto_start', 'goto_end',
        'goto_location'
      ];

      for (const action of requiredActions) {
        expect(VALID_ACTIONS).toContain(action);
      }
    });

    it('should have at least 25 actions', () => {
      expect(VALID_ACTIONS.length).toBeGreaterThanOrEqual(25);
    });
  });
});

describe('Touch Portal Config', () => {
  describe('TP_CONFIG', () => {
    it('should use correct port', () => {
      expect(TP_CONFIG.WEBSOCKET_PORT).toBe(21574);
    });

    it('should have correct WebSocket path', () => {
      expect(TP_CONFIG.WEBSOCKET_PATH).toBe('/ws');
    });

    it('should throttle at 10Hz (100ms)', () => {
      expect(TP_CONFIG.STATE_BROADCAST_INTERVAL_MS).toBe(100);
    });

    it('should reconnect after 3 seconds', () => {
      expect(TP_CONFIG.RECONNECT_DELAY_MS).toBe(3000);
    });
  });

  describe('getWebSocketUrl', () => {
    it('should return correct localhost URL', () => {
      const url = getWebSocketUrl();
      expect(url).toBe('ws://127.0.0.1:21574/ws');
    });

    it('should use localhost only (security)', () => {
      const url = getWebSocketUrl();
      expect(url).toContain('127.0.0.1');
      expect(url).not.toContain('0.0.0.0');
    });
  });
});

describe('Touch Portal State Updates', () => {
  it('should create valid state update object', () => {
    const stateUpdate = {
      type: 'state' as const,
      isPlaying: false,
      currentIndex: 0,
      totalLocations: 10,
      timelinePercent: 0,
      currentLocationId: null,
      currentLocationName: '',
      currentLocationAddress: '',
      currentLocationTime: '',
      currentTiming: null,
      hasImages: false,
      hasVideos: false,
      hasStreetView: true,
      imageCount: 0,
      videoCount: 0,
      lightboxOpen: false,
      streetViewOpen: false,
      panelCollapsed: false,
    };

    expect(stateUpdate.type).toBe('state');
    expect(typeof stateUpdate.isPlaying).toBe('boolean');
    expect(typeof stateUpdate.currentIndex).toBe('number');
    expect(typeof stateUpdate.totalLocations).toBe('number');
  });

  it('should calculate timeline percent correctly', () => {
    const currentIndex = 5;
    const totalLocations = 10;
    const percent = Math.round((currentIndex / Math.max(totalLocations - 1, 1)) * 100);

    expect(percent).toBe(56); // 5/9 * 100 = 55.56 → 56
  });
});

describe('Touch Portal Command Validation', () => {
  it('should parse valid command JSON', () => {
    const validCommand = '{"action": "play"}';
    const parsed = JSON.parse(validCommand);

    expect(parsed.action).toBe('play');
    expect(isValidAction(parsed.action)).toBe(true);
  });

  it('should reject invalid action in command', () => {
    const invalidCommand = { action: 'invalid_action' };

    expect(isValidAction(invalidCommand.action)).toBe(false);
  });

  it('should handle command with parameters', () => {
    const command = {
      action: 'goto_location',
      locationId: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(isValidAction(command.action)).toBe(true);
    expect(command.locationId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
