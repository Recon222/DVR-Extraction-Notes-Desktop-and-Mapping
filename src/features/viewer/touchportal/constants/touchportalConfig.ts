/**
 * Touch Portal Configuration Constants
 */

export const TP_CONFIG = {
  // WebSocket
  WEBSOCKET_PORT: 21574,
  WEBSOCKET_PATH: '/ws',

  // State broadcast throttling
  STATE_BROADCAST_INTERVAL_MS: 100, // 10Hz max

  // Reconnection
  RECONNECT_DELAY_MS: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,

  // Debug
  DEBUG_LOGGING: process.env.NODE_ENV === 'development',
} as const;

export function getWebSocketUrl(): string {
  return `ws://127.0.0.1:${TP_CONFIG.WEBSOCKET_PORT}${TP_CONFIG.WEBSOCKET_PATH}`;
}
