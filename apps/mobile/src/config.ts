/**
 * Backend address. On a physical device or simulator this must be reachable,
 * so override with your machine's LAN IP (e.g. `http://192.168.1.10:4000`):
 *   EXPO_PUBLIC_SERVER_URL=http://192.168.1.10:4000 npx expo start
 */
export const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:4000';