import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ 
  socket: null, 
  isConnected: false 
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only create socket if user exists and we don't have one already
    if (!user?._id || !user.role || socketRef.current) {
      return;
    }

    console.log("🔄 Creating socket connection for user:", user._id);

    const s = io("http://localhost:8000", {
      transports: ["websocket", "polling"], // Add polling as fallback
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;

    s.on("connect", () => {
      console.log("✅ Connected to socket server:", s.id);
      setIsConnected(true);
      s.emit("register", { userId: user._id, role: user.role });
    });

    s.on("disconnect", (reason) => {
      console.log("⚡ Disconnected from socket server:", reason);
      setIsConnected(false);
    });

    s.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setIsConnected(false);
    });

    setSocket(s);

    // Don't disconnect on cleanup - keep the socket alive
    return () => {
      console.log("🧹 SocketProvider cleanup - keeping socket alive");
      // We're NOT disconnecting here to prevent constant reconnects
    };
  }, [user?._id, user?.role]); // Only depend on user ID and role

  // Provide socket context
  const contextValue = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);