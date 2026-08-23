import type { Server as HttpServer } from "node:http";
import { parse as parseCookie } from "cookie";
import { Server } from "socket.io";
import { decodeCard } from "@whist/shared";
import { verifyToken } from "../auth/token.js";
import { IllegalActionError } from "../game/handStateMachine.js";
import { IllegalBidError } from "../game/bidding.js";
import { createAndRegisterTable, getTableByCode, getTableById, listTableSummaries } from "../lobby/tableRegistry.js";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, { cors: { origin: true, credentials: true } });

  io.use((socket, next) => {
    try {
      // The login cookie is httpOnly (not readable by client JS), but the
      // browser attaches it automatically to the WS upgrade request — so
      // auth is read from there rather than a handshake.auth payload.
      const cookieHeader = socket.handshake.headers.cookie;
      const token = cookieHeader ? parseCookie(cookieHeader).token : undefined;
      if (!token) throw new Error("missing token");
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId: string = socket.data.userId;

    const guard = (fn: () => void) => {
      try {
        fn();
      } catch (err) {
        const message = err instanceof IllegalActionError || err instanceof IllegalBidError
          ? err.message
          : "internal error";
        socket.emit("error", { message });
      }
    };

    socket.on("lobby:list", (_payload, ack) => {
      ack?.(listTableSummaries());
    });

    socket.on("lobby:createTable", ({ name }, ack) => {
      guard(() => {
        const runtime = createAndRegisterTable(io, name, userId);
        ack?.({ tableId: runtime.table.id, code: runtime.table.code });
      });
    });

    socket.on("lobby:joinTable", ({ code }, ack) => {
      guard(() => {
        const runtime = getTableByCode(io, code);
        if (!runtime) throw new IllegalActionError("no table with that code");
        socket.join(`table:${runtime.table.id}`);
        socket.data.tableId = runtime.table.id;
        const existingSeat = runtime.attachSocket(userId, socket.id);
        ack?.({ tableId: runtime.table.id, code: runtime.table.code, seatIndex: existingSeat });
        runtime.broadcastTableState();
      });
    });

    socket.on("table:takeSeat", ({ seatIndex }) => {
      guard(() => {
        const runtime = requireTable();
        runtime.takeSeat(userId, seatIndex, socket.id);
      });
    });

    socket.on("table:leaveSeat", () => {
      guard(() => requireTable().leaveSeat(userId));
    });

    socket.on("table:startSession", () => {
      guard(() => requireTable().startSession(userId));
    });

    socket.on("bid:place", ({ contractCode }) => {
      guard(() => requireTable().placeBid(userId, contractCode ?? null));
    });

    socket.on("contract:declare", (input) => {
      guard(() => {
        const parsed = {
          contractCode: input.contractCode,
          subMethod: input.subMethod,
          trumpSuit: input.trumpSuit,
          partnerCard: input.partnerCard,
        };
        requireTable().declareContract(userId, parsed);
      });
    });

    socket.on("trump:stopReveal", () => {
      guard(() => requireTable().stopTipReveal(userId));
    });

    socket.on("trump:revealNext", () => {
      guard(() => requireTable().revealNextTipCard(userId));
    });

    socket.on("trump:choose", ({ suit }) => {
      guard(() => requireTable().choosePartnerTrump(userId, suit));
    });

    socket.on("kitty:decision", ({ exchange, discard }) => {
      guard(() => {
        const cards = exchange ? (discard as string[]).map(decodeCard) : null;
        requireTable().performKittyExchange(userId, cards);
      });
    });

    socket.on("play:card", ({ card }) => {
      guard(() => requireTable().playCard(userId, decodeCard(card)));
    });

    socket.on("table:hostAction", ({ action }) => {
      guard(() => requireTable().hostAction(userId, action));
    });

    function requireTable() {
      const tableId: string | undefined = socket.data.tableId;
      if (!tableId) throw new IllegalActionError("not joined to a table");
      const runtime = getTableById(tableId);
      if (!runtime) throw new IllegalActionError("table no longer exists");
      return runtime;
    }
  });

  return io;
}
