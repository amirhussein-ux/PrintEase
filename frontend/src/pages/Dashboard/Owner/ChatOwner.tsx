import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend } from "react-icons/ai";
import { initSocket, getSocket } from "../../../lib/socket";

// Using your actual IDs
const OWNER_ID = "68bfea82a2abdc3113746741";

interface Message {
  _id?: string;
  text?: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
  conversationId: string;
  fileName?: string;
  fileUrl?: string;
}

interface Customer {
  id: string;
  name: string;
  conversationId: string;
}

const ChatOwner: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{ [conversationId: string]: number }>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentConversationIdRef = useRef<string | undefined>(undefined);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize socket
  useEffect(() => {
    const socket = initSocket(OWNER_ID, "owner", { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setSocketReady(true);
      socket.emit("register", { userId: OWNER_ID, role: "owner" });
    });

    socket.on("newConversation", (customer: Customer) => {
      setCustomers(prev => {
        if (prev.find(c => c.conversationId === customer.conversationId)) return prev;
        return [...prev, customer];
      });
    });

    socket.on("receiveMessage", (msg: Message) => {
      // Add customer if missing
      setCustomers(prev => {
        if (!prev.find(c => c.conversationId === msg.conversationId)) {
          return [...prev, { id: msg.senderId, name: "Customer", conversationId: msg.conversationId }];
        }
        return prev;
      });

      if (msg.conversationId === currentConversationIdRef.current) {
        // Active conversation → show directly
        setMessages(prev => [...prev, { ...msg, senderName: msg.senderId === OWNER_ID ? "You" : "Customer" }]);
        setUnreadMessages(prev => ({ ...prev, [msg.conversationId]: 0 }));
      } else {
        // Increment unread count
        setUnreadMessages(prev => ({
          ...prev,
          [msg.conversationId]: (prev[msg.conversationId] || 0) + 1,
        }));
      }
    });

    socket.on("messageSent", (msg: Message) => {
      setMessages(prev =>
        prev.map(m => (m._id === msg._id || (!m._id && m.text === msg.text) ? { ...msg, senderName: "You" } : m))
      );
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("❌ Socket error:", message);
    });

    return () => {
      socket.disconnect();
      setSocketReady(false);
    };
  }, []);

  // Load conversations
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/chat/conversations?ownerId=${OWNER_ID}`);
        if (!res.ok) throw new Error("Failed to load conversations");
        const data: any[] = await res.json();

        const customerList: Customer[] = data
          .map(conv => {
            const cust = conv.participants.find((p: string) => p !== OWNER_ID);
            return cust ? { id: cust, name: "Customer", conversationId: conv._id } : null;
          })
          .filter(Boolean) as Customer[];

        setCustomers(customerList);

        // Auto-select first customer
        if (customerList.length > 0) handleSelectCustomer(customerList[0]);
      } catch (err) {
        console.error(err);
      }
    };
    loadCustomers();
  }, []);

  // Load messages when customer selected
  useEffect(() => {
    if (!selectedCustomer) return;

    currentConversationIdRef.current = selectedCustomer.conversationId;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/messages/${selectedCustomer.conversationId}`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data: Message[] = await res.json();
        setMessages(
          data.map(msg => ({ ...msg, senderName: msg.senderId === OWNER_ID ? "You" : "Customer" }))
        );
        setUnreadMessages(prev => ({ ...prev, [selectedCustomer.conversationId]: 0 }));
      } catch (err) {
        console.error(err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedCustomer]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setMessages([]);
    currentConversationIdRef.current = customer.conversationId;
    setUnreadMessages(prev => ({ ...prev, [customer.conversationId]: 0 }));
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedCustomer || !socketReady) return;

    const tempMsg: Message = {
      text: newMessage,
      senderId: OWNER_ID,
      createdAt: new Date().toISOString(),
      senderName: "You",
      conversationId: selectedCustomer.conversationId,
    };

    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");

    try {
      // Save to backend
      const res = await fetch("http://localhost:8000/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedCustomer.conversationId,
          senderId: OWNER_ID,
          receiverId: selectedCustomer.id,
          text: tempMsg.text,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const savedMsg: Message = await res.json();

      // Update with saved message
      setMessages(prev =>
        prev.map(m =>
          m === tempMsg ? { ...savedMsg, senderName: "You" } : m
        )
      );

      // Emit socket for real-time
      const socket = getSocket();
      socket?.emit("sendMessage", savedMsg);

    } catch (err) {
      console.error(err);
    }
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
              customers.map(c => (
                <li
                  key={c.conversationId}
                  className={`p-3 cursor-pointer hover:bg-gray-700 transition ${
                    selectedCustomer?.conversationId === c.conversationId
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-gray-300"
                  }`}
                  onClick={() => handleSelectCustomer(c)}
                >
                  {c.name}
                  {unreadMessages[c.conversationId] > 0 && (
                    <span className="ml-2 text-xs bg-red-600 px-2 rounded-full">
                      {unreadMessages[c.conversationId]}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-white font-semibold text-xl">
              {selectedCustomer ? `Chat with ${selectedCustomer.name}` : "Select a customer"}
            </h1>
          </div>

          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-gray-900">
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                No messages yet. Say hello!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg._id || idx}
                  className={`flex mb-2 ${msg.senderId === OWNER_ID ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-4 py-2 rounded-xl max-w-xs break-words ${
                      msg.senderId === OWNER_ID
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-700 text-white rounded-bl-none"
                    }`}
                  >
                    {msg.fileName ? (
                      <a
                        href={msg.fileUrl || "#"}
                        className="underline text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || !socketReady}
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
