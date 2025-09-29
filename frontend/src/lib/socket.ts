// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (userId: string, role: string): Socket => {
  if (!socket) {
    socket = io("http://localhost:8000", {
      transports: ["websocket"],
    });

    // Register user only once when connected
    socket.on("connect", () => {
      console.log("✅ Connected to socket server with id:", socket?.id);
      socket?.emit("register", { userId, role });
    });

    socket.on("disconnect", () => {
      console.log("⚡ Disconnected from socket server");
    });
  }

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initSocket first.");
  }
  return socket;
};
