import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend } from "react-icons/ai";
import { initSocket, getSocket } from "../../../lib/socket";
import { useAuth } from "../../../context/AuthContext";

interface Message {
  _id: string;
  text: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
}

interface Customer {
  id: string;
  name: string;
  conversationId: string;
}

const ChatOwner: React.FC = () => {
  const { user } = useAuth();
  const ownerId = user?._id;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize socket
  useEffect(() => {
    if (!ownerId) return;

    const socket = initSocket(ownerId, "owner");

    socket.on("newConversation", (customer: Customer) => {
      setCustomers((prev) => {
        const exists = prev.find((c) => c.id === customer.id);
        if (exists) return prev;
        return [...prev, customer];
      });
    });

    socket.on("receiveMessage", (msg: Message) => {
      if (selectedCustomer && msg.senderId === selectedCustomer.id) {
        setMessages((prev) => [...prev, { ...msg, senderName: msg.senderName || "Customer" }]);
      }
    });

    socket.on("messageSent", (msg: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.text === msg.text && !m._id ? { ...m, _id: msg._id } : m))
      );
    });

    socket.on("error", ({ message }: { message: string }) => {
      alert(message);
    });

    return () => {
      socket.off("newConversation");
      socket.off("receiveMessage");
      socket.off("messageSent");
      socket.off("error");
    };
  }, [ownerId, selectedCustomer]);

  // Load customers
  useEffect(() => {
    if (!ownerId) return;

    const loadCustomers = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/chat/conversations?ownerId=${ownerId}`);
        if (!response.ok) throw new Error("Failed to load conversations");
        const conversations: any[] = await response.json();

        const customerList: Customer[] = conversations
          .map((conv) => {
            const customer = conv.participants.find((p: any) => p._id !== ownerId);
            return customer
              ? { id: customer._id, name: customer.firstName || "Customer", conversationId: conv._id }
              : null;
          })
          .filter(Boolean) as Customer[];

        setCustomers(customerList);
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    };

    loadCustomers();
  }, [ownerId]);

  // Load messages when a customer is selected
  useEffect(() => {
    if (!selectedCustomer) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/chat/messages/${selectedCustomer.conversationId}`
        );
        if (!response.ok) throw new Error("Failed to load messages");
        const data: Message[] = await response.json();
        setMessages(
          data.map((msg) => ({
            ...msg,
            senderName: msg.senderId === ownerId ? "You" : msg.senderName || "Customer",
          }))
        );
      } catch (err) {
        console.error(err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedCustomer, ownerId]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedCustomer || !ownerId) return;

    const tempMsg: Message = {
      _id: "",
      text: newMessage,
      senderId: ownerId!,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    const socket = getSocket();
    socket.emit("sendMessage", {
      conversationId: selectedCustomer.conversationId,
      senderId: ownerId,
      receiverId: selectedCustomer.id,
      text: newMessage,
    });
  };

  return (
    <DashboardLayout role="owner">
      <div className="flex h-[75vh] bg-gray-900 rounded-xl overflow-hidden shadow-lg mt-6">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <h2 className="text-white font-semibold text-lg p-4 border-b border-gray-700">
            Customers ({customers.length})
          </h2>
          <ul>
            {customers.length === 0 ? (
              <li className="p-3 text-gray-400">No conversations yet.</li>
            ) : (
              customers.map((customer) => (
                <li
                  key={customer.id}
                  className={`p-3 cursor-pointer hover:bg-gray-700 transition ${
                    selectedCustomer?.id === customer.id
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-300"
                  }`}
                  onClick={() => handleSelectCustomer(customer)}
                >
                  {customer.name}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-white font-semibold text-xl">
              {selectedCustomer ? `Chat with ${selectedCustomer.name}` : "Select a customer to start chat"}
            </h1>
          </div>

          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-gray-900">
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Loading messages...
              </div>
            ) : selectedCustomer ? (
              messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id || msg.createdAt}
                    className={`flex mb-2 ${msg.senderId === ownerId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-4 py-2 rounded-xl max-w-xs break-words ${
                        msg.senderId === ownerId
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-700 text-white rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <span className="text-xs text-gray-300 block text-right mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a customer from the left to start chatting
              </div>
            )}
            <div ref={messagesEndRef} />
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
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || !selectedCustomer}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center"
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
