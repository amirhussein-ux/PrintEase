import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user?._id || !user.role) return;

    const s = io("http://localhost:8000", {
      transports: ["websocket"],
    });

    s.on("connect", () => {
      console.log("✅ Connected to socket server:", s.id);
      s.emit("register", { userId: user._id, role: user.role });
    });

    s.on("disconnect", () => {
      console.log("⚡ Disconnected from socket server");
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
