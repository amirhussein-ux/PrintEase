// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (userId: string, role: string): Socket => {
  if (!socket) {
    socket = io("http://localhost:8000", {
      transports: ["websocket", "polling"], // allow fallback
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    socket.on("connect", () => {
      const s = socket!;
      console.log("✅ Connected to socket server with id:", s.id);
      s.emit("register", { userId, role });
    });

    socket.on("disconnect", (reason) => {
      console.log("⚡ Disconnected from socket server:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });
  }

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) throw new Error("Socket not initialized. Call initSocket first.");
  return socket;
};
