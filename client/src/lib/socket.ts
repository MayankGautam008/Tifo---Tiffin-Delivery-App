import { io, type Socket } from "socket.io-client";

// ✅ One shared connection for the whole app (same origin as the API, so
// no separate URL/env var is needed — matches how apiRequest() already
// calls relative "/api/..." paths).
let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/**
 * Opens (or reuses) the realtime connection, authenticated with the same
 * JWT already used for REST calls. Safe to call repeatedly — it only
 * reconnects when the token actually changes.
 */
export function connectSocket(token: string): Socket {
  if (socket) {
    if (socket.connected && (socket.auth as any)?.token === token) {
      return socket;
    }
    socket.disconnect();
    socket = null;
  }

  socket = io({
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    // ✅ Keep retrying quietly in the background — this is what lets a
    // seller leave the dashboard open all day without ever needing to
    // reopen or refresh it.
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
