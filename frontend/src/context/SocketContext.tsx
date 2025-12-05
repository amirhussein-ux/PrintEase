import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

// Define types for auto-reply events
interface QuickReplyOption {
  text: string;
  value: string;
}

interface AutoReplyMessage {
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  payloadType?: string;
  payload?: {
    faqId?: string;
    question?: string;
    category?: string;
    isAutoReply?: boolean;
    escalateToHuman?: boolean;
  };
  isAutoReply?: boolean;
  senderName?: string;
}

interface QuickRepliesData {
  type: 'quick_replies';
  chatId: string;
  options: QuickReplyOption[];
}

interface ChatEscalatedData {
  chatId: string;
  customerId: string;
  storeId: string;
  reason: string;
  escalatedAt: string;
}

interface AutoReplyToggledData {
  chatId: string;
  isActive: boolean;
  updatedBy: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  // Event handlers for auto-reply system
  onAutoReply?: (callback: (message: AutoReplyMessage) => void) => void;
  onQuickReplies?: (callback: (data: QuickRepliesData) => void) => void;
  onChatEscalated?: (callback: (data: ChatEscalatedData) => void) => void;
  onAutoReplyToggled?: (callback: (data: AutoReplyToggledData) => void) => void;
  // Method to check for auto-reply
  checkAutoReply?: (data: {
    storeId: string;
    message: string;
    chatId?: string;
    customerId?: string;
  }) => void;
  // Method to handle quick reply selection
  selectQuickReply?: (data: {
    chatId: string;
    value: string;
    customerId?: string;
    storeId?: string;
  }) => void;
  // Method to toggle auto-reply
  toggleAutoReply?: (data: {
    chatId: string;
    isActive: boolean;
  }) => void;
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
  
  // Event listeners refs
  const autoReplyCallbacks = useRef<((message: AutoReplyMessage) => void)[]>([]);
  const quickRepliesCallbacks = useRef<((data: QuickRepliesData) => void)[]>([]);
  const chatEscalatedCallbacks = useRef<((data: ChatEscalatedData) => void)[]>([]);
  const autoReplyToggledCallbacks = useRef<((data: AutoReplyToggledData) => void)[]>([]);

  useEffect(() => {
    // Only create socket if user exists and we don't have one already
    if (!user?._id || !user.role || socketRef.current) {
      return;
    }

    console.log("🔄 Creating socket connection for user:", user._id);

    const s = io("http://localhost:8000", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: {
        userId: user._id,
        role: user.role
      }
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

    // NEW: Auto-reply event listeners
    s.on("receiveAutoReply", (message: AutoReplyMessage) => {
      console.log("🤖 Received auto-reply:", message);
      autoReplyCallbacks.current.forEach(callback => callback(message));
    });

    s.on("showQuickReplies", (data: QuickRepliesData) => {
      console.log("🔘 Quick replies:", data);
      quickRepliesCallbacks.current.forEach(callback => callback(data));
    });

    s.on("chatEscalated", (data: ChatEscalatedData) => {
      console.log("📞 Chat escalated:", data);
      chatEscalatedCallbacks.current.forEach(callback => callback(data));
    });

    s.on("autoReplyToggled", (data: AutoReplyToggledData) => {
      console.log("🔄 Auto-reply toggled:", data);
      autoReplyToggledCallbacks.current.forEach(callback => callback(data));
    });

    s.on("autoReplyError", (error: { message: string }) => {
      console.error("❌ Auto-reply error:", error.message);
    });

    setSocket(s);

    return () => {
      console.log("🧹 SocketProvider cleanup - keeping socket alive");
      // We're NOT disconnecting here to prevent constant reconnects
    };
  }, [user?._id, user?.role]);

  // Helper methods for auto-reply system
  const checkAutoReply = (data: {
    storeId: string;
    message: string;
    chatId?: string;
    customerId?: string;
  }) => {
    if (socket && isConnected) {
      console.log("🔍 Checking auto-reply for:", data.message);
      socket.emit("checkAutoReply", data);
    } else {
      console.error("Socket not connected");
    }
  };

  const selectQuickReply = (data: {
    chatId: string;
    value: string;
    customerId?: string;
    storeId?: string;
  }) => {
    if (socket && isConnected) {
      console.log("✅ Quick reply selected:", data.value);
      socket.emit("quickReplySelected", data);
    } else {
      console.error("Socket not connected");
    }
  };

  const toggleAutoReply = (data: {
    chatId: string;
    isActive: boolean;
  }) => {
    if (socket && isConnected) {
      console.log("🔄 Toggling auto-reply:", data.isActive ? "ON" : "OFF");
      socket.emit("toggleAutoReply", data);
    } else {
      console.error("Socket not connected");
    }
  };

  // Event subscription methods
  const onAutoReply = (callback: (message: AutoReplyMessage) => void) => {
    autoReplyCallbacks.current.push(callback);
    return () => {
      const index = autoReplyCallbacks.current.indexOf(callback);
      if (index > -1) {
        autoReplyCallbacks.current.splice(index, 1);
      }
    };
  };

  const onQuickReplies = (callback: (data: QuickRepliesData) => void) => {
    quickRepliesCallbacks.current.push(callback);
    return () => {
      const index = quickRepliesCallbacks.current.indexOf(callback);
      if (index > -1) {
        quickRepliesCallbacks.current.splice(index, 1);
      }
    };
  };

  const onChatEscalated = (callback: (data: ChatEscalatedData) => void) => {
    chatEscalatedCallbacks.current.push(callback);
    return () => {
      const index = chatEscalatedCallbacks.current.indexOf(callback);
      if (index > -1) {
        chatEscalatedCallbacks.current.splice(index, 1);
      }
    };
  };

  const onAutoReplyToggled = (callback: (data: AutoReplyToggledData) => void) => {
    autoReplyToggledCallbacks.current.push(callback);
    return () => {
      const index = autoReplyToggledCallbacks.current.indexOf(callback);
      if (index > -1) {
        autoReplyToggledCallbacks.current.splice(index, 1);
      }
    };
  };

  // Provide socket context with auto-reply methods
  const contextValue: SocketContextType = {
    socket,
    isConnected,
    onAutoReply,
    onQuickReplies,
    onChatEscalated,
    onAutoReplyToggled,
    checkAutoReply,
    selectQuickReply,
    toggleAutoReply
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);