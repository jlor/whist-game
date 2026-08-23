import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

/** One shared socket for the whole app, connected lazily once the user is
 * authenticated (auth is the `token` httpOnly cookie, sent automatically). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ withCredentials: true, autoConnect: true });
  }
  return socket;
}
