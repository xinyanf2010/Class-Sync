import { RECONNECT } from '@classsync/common';
import { io, type Socket } from 'socket.io-client';
import { getToken } from './auth';
import { SERVER_URL } from '../config';

let socket: Socket | null = null;

/**
 * Lazily create a single shared socket with exponential-backoff reconnection.
 * School networks drop frequently, so a single long-lived socket is reused
 * across the join -> session lifecycle. The JWT is attached in the handshake.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      auth: { token: getToken() },
      reconnection: true,
      reconnectionAttempts: RECONNECT.MAX_ATTEMPTS,
      reconnectionDelay: RECONNECT.INITIAL_DELAY_MS,
      reconnectionDelayMax: RECONNECT.MAX_DELAY_MS,
      randomizationFactor: 0.5,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}