import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend } from "react-icons/ai";

interface Message {
  id: number;
  text: string;
  sender: "customer" | "owner";
  timestamp: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when new message added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: messages.length + 1,
      text: newMessage,
      sender: "customer",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, msg]);
    setNewMessage("");

    // Simulate a simple owner reply after 1s
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Hello! How can I help you?",
          sender: "owner",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <DashboardLayout role="customer">
      <div className="flex flex-col h-full min-h-[70vh] p-6 gap-4">
        <h1 className="text-2xl font-semibold text-white text-center mb-4">Chat with Store Admin</h1>

        <div className="flex-1 flex flex-col bg-gray-900 border border-white/10 rounded-xl p-4 overflow-y-auto shadow-inner">
          {messages.length === 0 && (
            <div className="text-gray-400 text-center mt-10">Start a conversation with our support team.</div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex mb-2 ${
                msg.sender === "customer" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-xl max-w-xs break-words ${
                  msg.sender === "customer"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-700 text-white rounded-bl-none"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <span className="text-xs text-gray-300 block text-right mt-1">{msg.timestamp}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Input */}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            className="flex-1 rounded-lg bg-gray-800 border border-white/20 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center"
          >
            <AiOutlineSend className="h-5 w-5" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
