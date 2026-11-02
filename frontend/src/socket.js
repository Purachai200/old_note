import { io } from 'socket.io-client';

let socketInstance = null;

/**
 * Initializes and returns the Socket.io client instance.
 * @param {string} token - JWT authentication token
 * @returns {Socket}
 */
export function initSocket(token) {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  // Determine origin (works in dev and production)
  const serverUrl = window.location.origin;

  socketInstance = io(serverUrl, {
    auth: { token },
    query: { token }, // Fallback in query params for legacy transport query
    // CRITICAL for iOS 9 Safari:
    // Start with long-polling (XHR is 100% stable on iOS 9.3.5),
    // then attempt WebSocket upgrade automatically.
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  return socketInstance;
}

/**
 * Returns the active socket instance.
 */
export function getSocket() {
  return socketInstance;
}

/**
 * Disconnects the socket instance.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
