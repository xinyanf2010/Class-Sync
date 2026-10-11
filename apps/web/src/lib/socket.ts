import { io } from 'socket.io-client';
import { getToken, SERVER_URL } from './api';

export function createSocket() {
  return io(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: getToken() },
  });
}
