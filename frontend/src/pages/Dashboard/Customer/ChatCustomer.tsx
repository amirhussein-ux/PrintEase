import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend, AiOutlinePaperClip } from "react-icons/ai";
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
  const customerId = user?._id;

  const OWNER_ID = "68bfea82a2abdc3113746741";

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isChatReady, setIsChatReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<any>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set owner ID
  useEffect(() => {
    if (customerId) setOwnerId(OWNER_ID);
  }, [customerId]);

  // Initialize socket
  useEffect(() => {
    if (!customerId || !ownerId || socketRef.current) return;

    const socket = initSocket(customerId, "customer");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Customer socket connected:", socket.id);
      socket.emit("register", { userId: customerId, role: "customer" });
    });

    socket.on("receiveMessage", (msg: Message) => {
      setMessages(prev => [...prev, { ...msg, senderName: "Store Admin" }]);
    });

    socket.on("conversationCreated", ({ conversationId: id }: { conversationId: string }) => {
      setConversationId(id);
      setIsChatReady(true);
    });

    socket.on("messageSent", (msg: Message) => {
      setMessages(prev =>
        prev.map(m => (m._id === "" ? { ...msg } : m))
      );
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("❌ Chat Error:", message);
      alert(`Chat Error: ${message}`);
    });

    return () => {
      socket.removeAllListeners();
    };
  }, [customerId, ownerId]);

  // Load messages
  useEffect(() => {
    if (!conversationId) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/messages/${conversationId}`);
        const data: Message[] = await res.json();
        setMessages(
          data.map(msg => ({
            ...msg,
            senderName: msg.senderId === customerId ? "You" : "Store Admin"
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMessages(false);
        setIsChatReady(true);
      }
    };
    loadMessages();
  }, [conversationId, customerId]);

  // Send message
  const handleSend = (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !ownerId) return;

    const tempMsg: Message = {
      _id: "",
      text: newMessage,
      senderId: customerId!,
      createdAt: new Date().toISOString(),
      senderName: "You",
    };
    setMessages(prev => [...prev, tempMsg]);

    const socket = getSocket();

    if (!conversationId) {
      socket.emit("startConversation", { customerId, ownerId, firstMessage: newMessage });
    } else {
      socket.emit("sendMessage", { conversationId, senderId: customerId, receiverId: ownerId, text: newMessage });
    }

    setNewMessage("");
  };

  // Send file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !ownerId) return;
    const file = e.target.files[0];

    const tempMsg: Message = {
      _id: "",
      senderId: customerId!,
      createdAt: new Date().toISOString(),
      fileName: file.name,
      senderName: "You",
    };
    setMessages(prev => [...prev, tempMsg]);

    const socket = getSocket();

    if (!conversationId) {
      socket.emit("startConversation", { customerId, ownerId, firstFile: file.name });
    } else {
      socket.emit("sendMessage", { conversationId, senderId: customerId, receiverId: ownerId, text: "", fileName: file.name, fileUrl: "#" });
    }

    e.target.value = "";
  };

  const renderChatContent = () => {
    if (!customerId) return <div className="flex-1 flex items-center justify-center text-red-400">Error: Customer not logged in.</div>;
    if (!ownerId) return <div className="flex-1 flex items-center justify-center text-yellow-400">Initializing: Setting Store Admin ID...</div>;
    if (loadingMessages) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading historical messages...</div>;
    if (messages.length === 0) return <div className="flex-1 flex items-center justify-center text-gray-400">Conversation started. Say hi!</div>;

    return messages.map(msg => (
      <div key={msg._id || msg.createdAt} className={`flex mb-2 ${msg.senderId === customerId ? "justify-end" : "justify-start"}`}>
        <div className={`px-4 py-2 rounded-xl max-w-xs break-words ${msg.senderId === customerId ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none"}`}>
          {msg.fileName ? <a href={msg.fileUrl || "#"} className="underline text-sm" target="_blank" rel="noopener noreferrer">{msg.fileName}</a> : <p className="text-sm">{msg.text}</p>}
          <span className="text-xs text-gray-300 block text-right mt-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    ));
  };

  return (
    <DashboardLayout role="customer">
      <div className="flex flex-col h-full min-h-[70vh] p-6 gap-4">
        <h1 className="text-2xl font-semibold text-white text-center mb-4">Chat with Store Admin</h1>
        <div className="flex-1 flex flex-col bg-gray-900 border border-white/10 rounded-xl p-4 overflow-y-auto shadow-inner">{renderChatContent()}<div ref={messagesEndRef} /></div>
        <form onSubmit={handleSend} className="flex gap-2">
          <input type="text" className="flex-1 rounded-lg bg-gray-800 border border-white/20 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder={isChatReady ? "Type a message..." : "Chat is initializing..."} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if(e.key === "Enter" && !e.shiftKey) handleSend(e); }} disabled={!ownerId} />
          <label className={`px-4 py-2 rounded-lg ${ownerId ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-600 cursor-not-allowed"} text-white flex items-center justify-center cursor-pointer`}>
            <AiOutlinePaperClip className="h-5 w-5" />
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={!ownerId} />
          </label>
          <button type="submit" className={`px-4 py-2 rounded-lg ${ownerId ? "bg-blue-600 hover:bg-blue-500" : "bg-blue-800 opacity-50 cursor-not-allowed"} text-white flex items-center justify-center`} disabled={!ownerId}><AiOutlineSend className="h-5 w-5" /></button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ChatCustomer;
