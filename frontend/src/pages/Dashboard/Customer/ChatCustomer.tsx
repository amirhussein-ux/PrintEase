import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend, AiOutlinePaperClip } from "react-icons/ai";
// Assuming this is the correct path to your socket utility
import { initSocket, getSocket } from "../../../lib/socket"; 
import { useAuth } from "../../../context/AuthContext";

interface Message {
  _id: string;
  text?: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
  fileUrl?: string;
  fileName?: string;
}

const ChatCustomer: React.FC = () => {
  const { user } = useAuth();
  // Ensure user is an object before accessing _id
  const customerId = user?._id; 
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  // isChatReady remains a good flag for UI
  const [isChatReady, setIsChatReady] = useState(false); 
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ----------------------------------------------------
  // 1. SCROLL TO BOTTOM
  // ----------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ----------------------------------------------------
  // 2. FETCH OWNER ID
  // ----------------------------------------------------
  useEffect(() => {
    const fetchOwner = async () => {
      try {
        // Ensure this endpoint is correct and returns {_id: string}
        const res = await fetch("http://localhost:8000/api/users/owner"); 
        if (!res.ok) throw new new Error("Failed to fetch owner");
        const data = await res.json();
        setOwnerId(data._id);
      } catch (err) {
        console.error("Error fetching owner:", err);
        // Consider setting a state to display error to user
      }
    };
    if (customerId) fetchOwner();
  }, [customerId]);

  // ----------------------------------------------------
  // 3. INITIALIZE SOCKET & START CONVERSATION
  // ----------------------------------------------------
  useEffect(() => {
    // Wait until we have both IDs
    if (!customerId || !ownerId) return; 

    // Initializes socket (and emits 'register' on connect)
    const socket = initSocket(customerId, "customer"); 

    // Handlers for incoming events
    const handleReceiveMessage = (msg: Message) => {
      // NOTE: Using 'Store Admin' as senderName for received messages
      setMessages((prev) => [...prev, { ...msg, senderName: "Store Admin" }]);
    };
    
    const handleConversationCreated = ({ conversationId: id }: { conversationId: string }) => {
      setConversationId(id);
      console.log(`✅ Conversation ID set: ${id}`);
    };

    const handleMessageSent = (msg: Message) => {
      // Replace the temporary message (where _id === "") with the actual message from the server
      setMessages((prev) =>
        prev.map((m) => (m._id === "" ? { ...msg } : m))
      );
    };

    const handleError = ({ message }: { message: string }) => {
      alert(`Chat Error: ${message}`);
    };

    // Set up listeners
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("conversationCreated", handleConversationCreated);
    socket.on("messageSent", handleMessageSent);
    socket.on("error", handleError);

    // Request the server to find/create the conversation
    // This will result in the "conversationCreated" event firing
    socket.emit("startConversation", { customerId, ownerId });

    // Clean up listeners when the component unmounts or dependencies change
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("conversationCreated", handleConversationCreated);
      socket.off("messageSent", handleMessageSent);
      socket.off("error", handleError);
    };
  }, [customerId, ownerId]); // Re-run only if IDs change

  // ----------------------------------------------------
  // 4. LOAD MESSAGES & SET CHAT READY
  // ----------------------------------------------------
  useEffect(() => {
    // Only proceed once we have the conversation ID
    if (!conversationId) {
      setIsChatReady(false);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/messages/${conversationId}`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data: Message[] = await res.json();
        setMessages(
          data.map((msg) => ({
            ...msg,
            // Assign senderName based on who sent it
            senderName: msg.senderId === customerId ? "You" : "Store Admin", 
          }))
        );
        setIsChatReady(true); // Chat is fully ready after loading messages
      } catch (err) {
        console.error("Error loading messages:", err);
        setMessages([]);
        setIsChatReady(false);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [conversationId, customerId]); // Re-run when conversationId is finally set

  // ----------------------------------------------------
  // 5. SEND MESSAGE HANDLERS
  // ----------------------------------------------------
  const handleSend = (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !conversationId || !ownerId || !isChatReady) {
      // Display error or simply return if not ready
      console.log("Chat not ready to send or message is empty.");
      return; 
    }

    const tempMsg: Message = {
      _id: "", // Temporary ID for immediate display
      text: newMessage,
      senderId: customerId!,
      createdAt: new Date().toISOString(),
      senderName: "You",
    };

    // Add temporary message to UI immediately for optimistic update
    setMessages((prev) => [...prev, tempMsg]); 

    const socket = getSocket();
    socket.emit("sendMessage", {
      conversationId,
      senderId: customerId,
      receiverId: ownerId,
      text: newMessage,
    });

    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) handleSend(e);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !conversationId || !ownerId || !isChatReady) return;
    const file = e.target.files[0];

    // NOTE: File upload logic needs to be fully implemented on the server
    // For now, this mimics the optimistic UI update
    const tempMsg: Message = {
      _id: "",
      senderId: customerId!,
      createdAt: new Date().toISOString(),
      fileName: file.name,
      senderName: "You",
    };
    setMessages((prev) => [...prev, tempMsg]);

    const socket = getSocket();
    socket.emit("sendMessage", {
      conversationId,
      senderId: customerId,
      receiverId: ownerId,
      text: "",
      fileName: file.name,
      fileUrl: "#", // Placeholder fileUrl
    });

    e.target.value = "";
  };

  // ----------------------------------------------------
  // 6. RENDER
  // ----------------------------------------------------
  const renderChatContent = () => {
    if (!customerId) {
      return <div className="flex-1 flex items-center justify-center text-red-400">Error: Customer not logged in.</div>;
    }
    
    if (!ownerId) {
      return <div className="flex-1 flex items-center justify-center text-yellow-400">Initializing: Fetching Store Admin ID...</div>;
    }
    
    if (!conversationId) {
      return <div className="flex-1 flex items-center justify-center text-yellow-400">Initializing: Starting Conversation...</div>;
    }

    if (loadingMessages) {
      return <div className="flex-1 flex items-center justify-center text-gray-400">Loading historical messages...</div>;
    }

    if (messages.length === 0) {
      return <div className="flex-1 flex items-center justify-center text-gray-400">Conversation started. Say hi!</div>;
    }

    return (
      messages.map((msg) => (
        <div 
          key={msg._id || msg.createdAt} 
          className={`flex mb-2 ${msg.senderId === customerId ? "justify-end" : "justify-start"}`}
        >
          <div className={`px-4 py-2 rounded-xl max-w-xs break-words ${msg.senderId === customerId ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none"}`}>
            {msg.fileName ? (
              <a href={msg.fileUrl || "#"} className="underline text-sm" target="_blank" rel="noopener noreferrer">
                {msg.fileName}
              </a>
            ) : (
              <p className="text-sm">{msg.text}</p>
            )}
            <span className="text-xs text-gray-300 block text-right mt-1">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      ))
    );
  };
  

  return (
    <DashboardLayout role="customer">
      <div className="flex flex-col h-full min-h-[70vh] p-6 gap-4">
        <h1 className="text-2xl font-semibold text-white text-center mb-4">
          Chat with Store Admin
        </h1>

        <div className="flex-1 flex flex-col bg-gray-900 border border-white/10 rounded-xl p-4 overflow-y-auto shadow-inner">
          {renderChatContent()}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg bg-gray-800 border border-white/20 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder={isChatReady ? "Type a message..." : "Chat is initializing..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isChatReady} // Disable input until fully ready
          />
          <label className={`px-4 py-2 rounded-lg ${isChatReady ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-600 cursor-not-allowed"} text-white flex items-center justify-center cursor-pointer`}>
            <AiOutlinePaperClip className="h-5 w-5" />
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={!isChatReady} />
          </label>
          <button 
            type="submit" 
            className={`px-4 py-2 rounded-lg ${isChatReady ? "bg-blue-600 hover:bg-blue-500" : "bg-blue-800 opacity-50 cursor-not-allowed"} text-white flex items-center justify-center`}
            disabled={!isChatReady}
          >
            <AiOutlineSend className="h-5 w-5" />
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ChatCustomer;