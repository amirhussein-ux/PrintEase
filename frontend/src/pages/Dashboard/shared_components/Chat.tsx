import React, { useEffect, useRef, useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { AiOutlineSend, AiOutlinePaperClip } from "react-icons/ai";
import { initSocket, getSocket } from "../../../lib/socket";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import type { Socket } from "socket.io-client";

interface CustomerMessage {
  _id: string;
  text?: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
  fileUrl?: string;
  fileName?: string;
}

interface OwnerMessage {
  _id?: string;
  text?: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
  conversationId: string;
  fileName?: string;
  fileUrl?: string;
}

interface CustomerChatProps {
  fallbackOwnerId?: string;
}

interface Customer {
  id: string;
  name: string;
  conversationId: string;
}

interface ConversationResponse {
  _id: string;
  participants: string[];
  lastMessage?: string;
  customerName?: string;
}

const DEFAULT_OWNER_ID = "68bfea82a2abdc3113746741";

export const ChatCustomer: React.FC<CustomerChatProps> = ({ fallbackOwnerId = DEFAULT_OWNER_ID }) => {
  const { user } = useAuth();
  const customerId = user?._id;

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isChatReady, setIsChatReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (customerId) setOwnerId(fallbackOwnerId);
  }, [customerId, fallbackOwnerId]);

  useEffect(() => {
    if (!customerId || !ownerId || socketRef.current) return;

    const socket = initSocket(customerId, "customer");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Customer socket connected:", socket.id);
      socket.emit("register", { userId: customerId, role: "customer" });
    });

    socket.on("receiveMessage", (msg: CustomerMessage) => {
      setMessages(prev => [...prev, { ...msg, senderName: "Store Admin" }]);
    });

    socket.on("conversationCreated", ({ conversationId: id }: { conversationId: string }) => {
      setConversationId(id);
      setIsChatReady(true);
    });

    socket.on("messageSent", (msg: CustomerMessage) => {
      setMessages(prev => prev.map(m => (m._id === "" ? { ...msg } : m)));
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("❌ Chat Error:", message);
      alert(`Chat Error: ${message}`);
    });

    return () => {
      socket.removeAllListeners();
    };
  }, [customerId, ownerId]);

  useEffect(() => {
    if (!conversationId) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/messages/${conversationId}`);
        const data: CustomerMessage[] = await res.json();
        setMessages(
          data.map(msg => ({
            ...msg,
            senderName: msg.senderId === customerId ? "You" : "Store Admin",
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

  const handleSend = (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !ownerId) return;

    const tempMsg: CustomerMessage = {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !ownerId) return;
    const file = e.target.files[0];

    const tempMsg: CustomerMessage = {
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
    if (!customerId)
      return <div className="flex-1 flex items-center justify-center text-red-400">Error: Customer not logged in.</div>;
    if (!ownerId)
      return <div className="flex-1 flex items-center justify-center text-yellow-400">Initializing: Setting Store Admin ID...</div>;
    if (loadingMessages)
      return <div className="flex-1 flex items-center justify-center text-gray-400">Loading historical messages...</div>;
    if (messages.length === 0)
      return <div className="flex-1 flex items-center justify-center text-gray-400">Conversation started. Say hi!</div>;

    return messages.map(msg => (
      <div key={msg._id || msg.createdAt} className={`flex mb-2 ${msg.senderId === customerId ? "justify-end" : "justify-start"}`}>
        <div
          className={`px-4 py-2 rounded-xl max-w-xs break-words ${msg.senderId === customerId ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none"}`}
        >
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
    ));
  };

  return (
    <DashboardLayout role="customer">
      <div className="flex flex-col h-full min-h-[70vh] p-6 gap-4">
        <h1 className="text-2xl font-semibold text-white text-center mb-4">Chat with Store Admin</h1>
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
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) handleSend(e);
            }}
            disabled={!ownerId}
          />
          <label
            className={`px-4 py-2 rounded-lg ${ownerId ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-600 cursor-not-allowed"} text-white flex items-center justify-center cursor-pointer`}
          >
            <AiOutlinePaperClip className="h-5 w-5" />
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={!ownerId} />
          </label>
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg ${ownerId ? "bg-blue-600 hover:bg-blue-500" : "bg-blue-800 opacity-50 cursor-not-allowed"} text-white flex items-center justify-center`}
            disabled={!ownerId}
          >
            <AiOutlineSend className="h-5 w-5" />
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export const ChatOwner: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<OwnerMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{ [conversationId: string]: number }>({});
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentConversationIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setCustomers([]);
    setSelectedCustomer(null);
    setMessages([]);
    setUnreadMessages({});
    currentConversationIdRef.current = undefined;
  }, [ownerId]);

  useEffect(() => {
    let cancelled = false;

    const resolveOwner = async () => {
      if (!user) {
        if (!cancelled) {
          setOwnerId(null);
          setAccessDenied(false);
          setOwnerLoading(false);
        }
        return;
      }

      if (user.role === "owner") {
        if (!cancelled) {
          setOwnerId(user._id ?? null);
          setAccessDenied(false);
          setOwnerError(null);
          setOwnerLoading(false);
        }
        return;
      }

      const isStoreStaff =
        user.role === "employee" &&
        (user.employeeRole === "Operations Manager" ||
          user.employeeRole === "Front Desk" ||
          user.employeeRole === "Inventory & Supplies" ||
          user.employeeRole === "Printer Operator");

      if (isStoreStaff) {
        try {
          const res = await api.get("/print-store/mine");
          if (cancelled) return;
          const owner = res?.data?.owner;
          if (owner) {
            setOwnerId(String(owner));
            setAccessDenied(false);
            setOwnerError(null);
          } else {
            setOwnerId(null);
            setOwnerError("The assigned store has no owner record.");
          }
        } catch (err) {
          if (!cancelled) {
            console.error("Failed to load store for employee chat", err);
            setOwnerId(null);
            setOwnerError("Unable to load store information.");
          }
        } finally {
          if (!cancelled) setOwnerLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setOwnerId(null);
        setAccessDenied(true);
        setOwnerLoading(false);
      }
    };

    setOwnerError(null);
    setOwnerLoading(true);
    resolveOwner();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!ownerId) return;
    const socket = initSocket(ownerId, "owner");

    const handleConnect = () => {
      console.log("✅ Socket connected:", socket.id);
      setSocketReady(true);
      socket.emit("register", { userId: ownerId, role: "owner" });
    };
    const handleNewConversation = (customer: Customer) => {
      setCustomers(prev => {
        if (prev.find(c => c.conversationId === customer.conversationId)) return prev;
        return [...prev, customer];
      });
    };
    const handleReceiveMessage = (msg: OwnerMessage) => {
      setCustomers(prev => {
        if (!prev.find(c => c.conversationId === msg.conversationId)) {
          return [...prev, { id: msg.senderId, name: "Customer", conversationId: msg.conversationId }];
        }
        return prev;
      });

      if (msg.conversationId === currentConversationIdRef.current) {
        setMessages(prev => [...prev, { ...msg, senderName: msg.senderId === ownerId ? "You" : "Customer" }]);
        setUnreadMessages(prev => ({ ...prev, [msg.conversationId]: 0 }));
      } else {
        setUnreadMessages(prev => ({
          ...prev,
          [msg.conversationId]: (prev[msg.conversationId] || 0) + 1,
        }));
      }
    };
    const handleMessageSent = (msg: OwnerMessage) => {
      setMessages(prev =>
        prev.map(m => (m._id === msg._id || (!m._id && m.text === msg.text) ? { ...msg, senderName: "You" } : m))
      );
    };
    const handleError = ({ message }: { message: string }) => {
      console.error("❌ Socket error:", message);
    };

    socket.on("connect", handleConnect);
    socket.on("newConversation", handleNewConversation);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageSent", handleMessageSent);
    socket.on("error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("newConversation", handleNewConversation);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageSent", handleMessageSent);
      socket.off("error", handleError);
      socket.disconnect();
      setSocketReady(false);
    };
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    const loadCustomers = async () => {
      try {
        const res = await api.get<ConversationResponse[]>("/chat/conversations", { params: { ownerId } });
        const data = Array.isArray(res.data) ? res.data : [];

        const customerList: Customer[] = data
          .map(conv => {
            const cust = conv.participants.find(participant => participant !== ownerId);
            if (!cust) return null;
            return {
              id: cust,
              name: conv.customerName || "Customer",
              conversationId: conv._id,
            };
          })
          .filter((c): c is Customer => Boolean(c));

        setCustomers(customerList);
        setOwnerError(null);

        if (customerList.length > 0 && !currentConversationIdRef.current) {
          const first = customerList[0];
          setSelectedCustomer(first);
          setMessages([]);
          currentConversationIdRef.current = first.conversationId;
          setUnreadMessages(prev => ({ ...prev, [first.conversationId]: 0 }));
        }
      } catch (err) {
        console.error("Failed to load conversations", err);
        setOwnerError("Unable to load conversations.");
      }
    };

    loadCustomers();
  }, [ownerId]);

  useEffect(() => {
    if (!selectedCustomer || !ownerId) return;

    currentConversationIdRef.current = selectedCustomer.conversationId;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get<OwnerMessage[]>(`/chat/messages/${selectedCustomer.conversationId}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setMessages(data.map(msg => ({ ...msg, senderName: msg.senderId === ownerId ? "You" : "Customer" })));
        setUnreadMessages(prev => ({ ...prev, [selectedCustomer.conversationId]: 0 }));
      } catch (err) {
        console.error("Failed to load messages", err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedCustomer, ownerId]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setMessages([]);
    currentConversationIdRef.current = customer.conversationId;
    setUnreadMessages(prev => ({ ...prev, [customer.conversationId]: 0 }));
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedCustomer || !socketReady || !ownerId) return;

    const tempMsg: OwnerMessage = {
      text: newMessage,
      senderId: ownerId,
      createdAt: new Date().toISOString(),
      senderName: "You",
      conversationId: selectedCustomer.conversationId,
    };

    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");

    try {
      const socket = getSocket();
      socket.emit("sendMessage", {
        conversationId: selectedCustomer.conversationId,
        senderId: ownerId,
        receiverId: selectedCustomer.id,
        text: tempMsg.text,
      });
    } catch (err) {
      console.error("Socket send failed", err);
    }
  };

  return (
    <DashboardLayout role="owner">
      {ownerLoading ? (
        <div className="flex h-[75vh] items-center justify-center text-white/80 text-lg">Resolving store access...</div>
      ) : accessDenied ? (
        <div className="flex h-[75vh] items-center justify-center text-red-200 text-center px-6">
          Only owners or authorized store staff can access the store chat.
        </div>
      ) : ownerError ? (
        <div className="flex h-[75vh] items-center justify-center text-yellow-200 text-center px-6">{ownerError}</div>
      ) : !ownerId ? (
        <div className="flex h-[75vh] items-center justify-center text-gray-200">
          Unable to determine the linked store owner.
        </div>
      ) : (
        <div className="flex h-[75vh] bg-gray-900 rounded-xl overflow-hidden shadow-lg mt-6">
          <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
            <h2 className="text-white font-semibold text-lg p-4 border-b border-gray-700">Customers ({customers.length})</h2>
            <ul>
              {customers.length === 0 ? (
                <li className="p-3 text-gray-400">No conversations yet.</li>
              ) : (
                customers.map(c => (
                  <li
                    key={c.conversationId}
                    className={`p-3 cursor-pointer hover:bg-gray-700 transition ${
                      selectedCustomer?.conversationId === c.conversationId ? "bg-blue-600 text-white font-semibold" : "text-gray-300"
                    }`}
                    onClick={() => handleSelectCustomer(c)}
                  >
                    {c.name}
                    {unreadMessages[c.conversationId] > 0 && (
                      <span className="ml-2 text-xs bg-red-600 px-2 rounded-full">{unreadMessages[c.conversationId]}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h1 className="text-white font-semibold text-xl">
                {selectedCustomer ? `Chat with ${selectedCustomer.name}` : "Select a customer"}
              </h1>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-gray-900">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">No messages yet. Say hello!</div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg._id || idx} className={`flex mb-2 ${msg.senderId === ownerId ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`px-4 py-2 rounded-xl max-w-xs break-words ${
                        msg.senderId === ownerId ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none"
                      }`}
                    >
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
              )}
              <div ref={messagesEndRef} />
            </div>

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
                  disabled={!newMessage.trim() || !socketReady || !ownerId}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                >
                  <AiOutlineSend className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default {
  ChatCustomer,
  ChatOwner,
};
