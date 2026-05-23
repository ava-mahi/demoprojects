'use client';
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  const opts = {
    path: '/socket.io',
    transports: ['websocket'] as string[],
    withCredentials: true,
    autoConnect: true,
  };
  socket = url ? io(url, opts) : io(opts);
  return socket;
}
