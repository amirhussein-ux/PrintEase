import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend } from "react-icons/ai";

interface Message {
  id: number;
  text: string;
  sender: "owner" | "customer";
  timestamp: string;
}

interface Customer {
  id: number;
  name: string;
}

const ChatOwner: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([
    { id: 1, name: "Customer A" },
    { id: 2, name: "Customer B" },
    { id: 3, name: "Customer C" },
  ]); // Placeholder
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when new message added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedCustomer) return;
    const msg: Message = {
      id: messages.length + 1,
      text: newMessage,
      sender: "owner",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, msg]);
    setNewMessage("");

    // Simulate customer reply
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Hello! I need assistance.",
          sender: "customer",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <DashboardLayout role="owner">
      <div className="flex h-[75vh] bg-gray-900 rounded-xl overflow-hidden shadow-lg mt-6">
        {/* Left Sidebar: Customer list */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <h2 className="text-white font-semibold text-lg p-4 border-b border-gray-700">Customers</h2>
          <ul>
            {customers.map(customer => (
              <li
                key={customer.id}
                className={`p-3 cursor-pointer hover:bg-gray-700 transition ${
                  selectedCustomer?.id === customer.id ? "bg-blue-600 text-white font-semibold" : "text-gray-300"
                }`}
                onClick={() => {
                  setSelectedCustomer(customer);
                  setMessages([]); // Reset messages when selecting a different customer
                }}
              >
                {customer.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Right Panel: Messages */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-white font-semibold text-xl">
              {selectedCustomer ? `Chat with ${selectedCustomer.name}` : "Select a customer to start chat"}
            </h1>
          </div>

          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-gray-900">
            {selectedCustomer ? (
              <>
                {messages.length === 0 && (
                  <div className="text-gray-400 text-center mt-10">Start a conversation with your customer.</div>
                )}

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex mb-2 ${msg.sender === "owner" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-4 py-2 rounded-xl max-w-xs break-words ${
                        msg.sender === "owner"
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a customer from the left to start chatting
              </div>
            )}
          </div>

          {/* Input */}
          {selectedCustomer && (
            <div className="flex gap-2 p-4 border-t border-gray-700">
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatOwner;
