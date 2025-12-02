import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (userId: string, role: string): Socket => {
  if (!socket) {
    socket = io("http://127.0.0.1:8000", {  // force IPv4
      transports: ["websocket", "polling"], // fallback
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to socket server with id:", socket.id);
      socket?.emit("register", { userId, role });
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚡ Socket disconnected:", reason);
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
