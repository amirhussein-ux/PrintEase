import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend, AiOutlinePaperClip, AiOutlineUser, AiOutlineMessage, AiOutlineTeam, AiOutlineDownload, AiOutlineClose } from "react-icons/ai";
import { BsCheck2All, BsCheck2 } from "react-icons/bs";
import { useSocket } from "../../../context/SocketContext";

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
  fileType?: string;
  isRead?: boolean;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  conversationId: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface ImageModal {
  isOpen: boolean;
  imageUrl: string;
  fileName: string;
}

const ChatOwner: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [imageModal, setImageModal] = useState<ImageModal>({ isOpen: false, imageUrl: "", fileName: "" });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingMessagesRef = useRef<Set<string>>(new Set());

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("newConversation", (data: { customerId: string; customerName: string; conversationId: string; lastMessage?: string }) => {
      setCustomers(prev => {
        const existing = prev.find(c => c.conversationId === data.conversationId);
        if (existing) return prev;

        const newCustomer: Customer = {
          id: data.customerId,
          name: data.customerName || "Customer",
          conversationId: data.conversationId,
          lastMessage: data.lastMessage,
          lastMessageTime: new Date().toISOString(),
          unreadCount: selectedCustomer?.conversationId === data.conversationId ? 0 : 1
        };

        return [newCustomer, ...prev];
      });
    });

    socket.on("receiveMessage", (msg: Message) => {
      const messageKey = `${msg.conversationId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      if (pendingMessagesRef.current.has(messageKey)) {
        pendingMessagesRef.current.delete(messageKey);
        return;
      }

      setCustomers(prev => prev.map(customer => {
        if (customer.conversationId === msg.conversationId) {
          return {
            ...customer,
            lastMessage: msg.text || msg.fileName || "File",
            lastMessageTime: msg.createdAt,
            unreadCount: customer.conversationId === selectedCustomer?.conversationId ? 0 : customer.unreadCount + 1
          };
        }
        return customer;
      }));

      if (msg.conversationId === selectedCustomer?.conversationId) {
        setMessages(prev => {
          const exists = prev.some(m => 
            m._id === msg._id || 
            (m.text === msg.text && m.createdAt === msg.createdAt && m.senderId === msg.senderId)
          );
          if (exists) return prev;
          
          return [...prev, { 
            ...msg, 
            senderName: msg.senderId === OWNER_ID ? "You" : selectedCustomer.name 
          }];
        });
        
        if (msg.senderId !== OWNER_ID) {
          socket.emit("markAsRead", { 
            conversationId: msg.conversationId,
            messageId: msg._id 
          });
        }
      }
    });

    socket.on("messageSent", (msg: Message) => {
      const messageKey = `${msg.conversationId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      pendingMessagesRef.current.delete(messageKey);

      setMessages(prev => {
        const filtered = prev.filter(m => 
          !(m.text === msg.text && !m._id && m.senderId === OWNER_ID)
        );
        
        return [...filtered, { ...msg, senderName: "You", isRead: false }];
      });

      setCustomers(prev => prev.map(customer => {
        if (customer.conversationId === msg.conversationId) {
          return {
            ...customer,
            lastMessage: msg.text || msg.fileName || "File",
            lastMessageTime: msg.createdAt
          };
        }
        return customer;
      }));
    });

    socket.on("messageRead", ({ messageId }: { messageId: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    });

    return () => {
      socket.off("newConversation");
      socket.off("receiveMessage");
      socket.off("messageSent");
      socket.off("messageRead");
    };
  }, [socket, selectedCustomer]);

  // Load conversations with customer details
  useEffect(() => {
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/conversations?ownerId=${OWNER_ID}`);
        if (!res.ok) throw new Error("Failed to load conversations");
        const data: any[] = await res.json();

        const customerList: Customer[] = await Promise.all(
          data.map(async (conv) => {
            const customerId = conv.participants.find((p: string) => p !== OWNER_ID);
            if (!customerId) return null;

            try {
              const customerRes = await fetch(`http://localhost:8000/api/users/${customerId}`);
              if (customerRes.ok) {
                const customerData = await customerRes.json();
                return {
                  id: customerId,
                  name: `${customerData.firstName} ${customerData.lastName}`.trim() || "Customer",
                  email: customerData.email,
                  conversationId: conv._id,
                  lastMessage: conv.lastMessage,
                  lastMessageTime: conv.updatedAt,
                  unreadCount: 0
                };
              }
            } catch (err) {
              console.error("Failed to fetch customer details:", err);
            }

            return {
              id: customerId,
              name: "Customer",
              conversationId: conv._id,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.updatedAt,
              unreadCount: 0
            };
          })
        );

        const validCustomers = customerList.filter(Boolean) as Customer[];
        setCustomers(validCustomers);

        if (validCustomers.length > 0 && !selectedCustomer) {
          handleSelectCustomer(validCustomers[0]);
        }
      } catch (err) {
        console.error("Error loading customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, []);

  // Load messages when customer selected
  useEffect(() => {
    if (!selectedCustomer) return;
    
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/messages/${selectedCustomer.conversationId}`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data: Message[] = await res.json();
        
        setMessages(
          data.map(msg => ({ 
            ...msg, 
            senderName: msg.senderId === OWNER_ID ? "You" : selectedCustomer.name 
          }))
        );

        setCustomers(prev => prev.map(c => 
          c.conversationId === selectedCustomer.conversationId 
            ? { ...c, unreadCount: 0 }
            : c
        ));
      } catch (err) {
        console.error("Error loading messages:", err);
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
    
    setCustomers(prev => prev.map(c => 
      c.conversationId === customer.conversationId 
        ? { ...c, unreadCount: 0 }
        : c
    ));
  };

  // Handle text area key down for Shift+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedCustomer || !socket) return;

    const tempMsg: Message = {
      text: newMessage,
      senderId: OWNER_ID,
      createdAt: new Date().toISOString(),
      senderName: "You",
      conversationId: selectedCustomer.conversationId,
      isRead: false,
    };

    setMessages(prev => [...prev, tempMsg]);
    
    const messageKey = `${selectedCustomer.conversationId}-${tempMsg.createdAt}-${tempMsg.text}`;
    pendingMessagesRef.current.add(messageKey);

    setNewMessage("");

    try {
      socket.emit("sendMessage", {
        conversationId: selectedCustomer.conversationId,
        senderId: OWNER_ID,
        receiverId: selectedCustomer.id,
        text: newMessage
      });
    } catch (error) {
      pendingMessagesRef.current.delete(messageKey);
      setMessages(prev => prev.filter(m => m !== tempMsg));
    }
  };

  // Send file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedCustomer || !socket) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      alert("File size too large. Please upload a file smaller than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileUrl = e.target?.result as string;

      const tempMsg: Message = {
        senderId: OWNER_ID,
        createdAt: new Date().toISOString(),
        fileName: file.name,
        fileType: file.type,
        fileUrl: fileUrl,
        senderName: "You",
        conversationId: selectedCustomer.conversationId,
        isRead: false,
      };

      setMessages(prev => [...prev, tempMsg]);

      const messageKey = `${selectedCustomer.conversationId}-${tempMsg.createdAt}-${tempMsg.fileName}`;
      pendingMessagesRef.current.add(messageKey);

      try {
        socket.emit("sendMessage", {
          conversationId: selectedCustomer.conversationId,
          senderId: OWNER_ID,
          receiverId: selectedCustomer.id,
          text: "",
          fileName: file.name,
          fileType: file.type,
          fileUrl: fileUrl
        });
      } catch (error) {
        pendingMessagesRef.current.delete(messageKey);
        setMessages(prev => prev.filter(m => m !== tempMsg));
      }
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  // Open image modal
  const handleImageClick = (imageUrl: string, fileName: string) => {
    setImageModal({ isOpen: true, imageUrl, fileName });
  };

  // Download image
  const handleDownload = (imageUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Close image modal
  const handleCloseModal = () => {
    setImageModal({ isOpen: false, imageUrl: "", fileName: "" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMessageStatus = (msg: Message) => {
    if (msg.senderId !== OWNER_ID) return null;
    
    return msg.isRead ? (
      <BsCheck2All className="text-blue-400 ml-1" size={14} />
    ) : (
      <BsCheck2 className="text-gray-400 ml-1" size={14} />
    );
  };

  const renderFileMessage = (msg: Message) => {
    const isImage = msg.fileType?.startsWith('image/');
    
    if (isImage && msg.fileUrl) {
      return (
        <div 
          className="cursor-pointer transform transition-transform hover:scale-105"
          onClick={() => handleImageClick(msg.fileUrl!, msg.fileName!)}
        >
          <img 
            src={msg.fileUrl} 
            alt={msg.fileName} 
            className="max-w-xs max-h-48 rounded-lg object-cover border-2 border-white/20 shadow-lg"
          />
          <p className="text-xs text-gray-300 mt-1 text-center">{msg.fileName}</p>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg border border-white/20">
        <AiOutlinePaperClip className="flex-shrink-0 text-blue-400 text-lg" />
        <div>
          <span className="text-sm text-white block">{msg.fileName}</span>
          <span className="text-xs text-gray-400">Click to download</span>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout role="owner">
      <div className="flex flex-col h-full min-h-[80vh] bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <AiOutlineTeam className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Chat with Customers</h1>
                  <p className="text-sm text-gray-300">
                    {customers.length} active conversation{customers.length !== 1 ? 's' : ''}
                    {!isConnected && ' • Connecting...'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Store Admin</div>
                <div className="text-xs text-gray-500">Always here to help</div>
              </div>
            </div>
          </div>

          <div className="flex gap-6 h-[600px]">
            {/* Customers Sidebar */}
            <div className="w-80 bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-white/10 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <AiOutlineUser className="w-5 h-5" />
                  Customers
                </h2>
              </div>
              
              <div className="overflow-y-auto h-full">
                {loadingCustomers ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p>Loading conversations...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-center">
                    <AiOutlineMessage className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-semibold">No Conversations</p>
                    <p className="text-sm mt-2">Customer conversations will appear here</p>
                  </div>
                ) : (
                  customers.map(customer => (
                    <div
                      key={customer.conversationId}
                      className={`p-4 border-b border-white/5 cursor-pointer transition-all duration-200 ${
                        selectedCustomer?.conversationId === customer.conversationId
                          ? "bg-blue-600/20 border-l-4 border-l-blue-500"
                          : "hover:bg-white/5"
                      }`}
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white truncate">
                          {customer.name}
                        </h3>
                        {customer.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-6 text-center">
                            {customer.unreadCount}
                          </span>
                        )}
                      </div>
                      
                      {customer.lastMessage && (
                        <p className="text-sm text-gray-300 truncate mb-1">
                          {customer.lastMessage}
                        </p>
                      )}
                      
                      {customer.lastMessageTime && (
                        <p className="text-xs text-gray-500">
                          {formatDate(customer.lastMessageTime)} • {formatTime(customer.lastMessageTime)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-white/10 shadow-xl overflow-hidden">
              {selectedCustomer ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-white/10 bg-gray-700/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                        <AiOutlineUser className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-white font-semibold text-lg">{selectedCustomer.name}</h2>
                        {selectedCustomer.email && (
                          <p className="text-sm text-gray-300">{selectedCustomer.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
                        <AiOutlineMessage className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-semibold">No messages yet</p>
                        <p className="text-sm mt-2">Start the conversation by sending a message</p>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <div
                          key={msg._id || `${msg.createdAt}-${index}`}
                          className={`flex ${msg.senderId === OWNER_ID ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                            msg.senderId === OWNER_ID 
                              ? "bg-blue-600 text-white rounded-br-none" 
                              : "bg-gray-700 text-white rounded-bl-none"
                          }`}>
                            {msg.fileName ? (
                              renderFileMessage(msg)
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            )}
                            <div className="flex items-center justify-end gap-1 mt-2">
                              <span className="text-xs text-gray-300">
                                {formatTime(msg.createdAt)}
                              </span>
                              {renderMessageStatus(msg)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <form onSubmit={handleSend} className="p-4 border-t border-white/10">
                    <div className="flex gap-3">
                      <textarea
                        className="flex-1 rounded-xl bg-gray-700/50 border border-white/20 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 backdrop-blur-sm resize-none"
                        placeholder="Type your message..."
                        value={newMessage}
                        rows={1}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!isConnected}
                        style={{ minHeight: '50px', maxHeight: '120px' }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-4 py-3 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          isConnected
                            ? "bg-gray-700 hover:bg-gray-600 text-white"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                        disabled={!isConnected}
                      >
                        <AiOutlinePaperClip className="w-5 h-5" />
                      </button>
                      
                      <button
                        type="submit"
                        className={`px-6 py-3 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          newMessage.trim() && isConnected
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                        disabled={!newMessage.trim() || !isConnected}
                      >
                        <AiOutlineSend className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      onChange={handleFileSelect} 
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      disabled={!isConnected}
                    />
                    
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {!isConnected ? 'Connecting to server...' : 'Press Enter to send • Shift+Enter for new line'}
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                  <AiOutlineUser className="w-24 h-24 mb-6 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Select a Customer</h3>
                  <p className="text-sm">Choose a customer from the sidebar to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gray-900">
              <h3 className="text-white font-semibold text-lg">{imageModal.fileName}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(imageModal.imageUrl, imageModal.fileName)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <AiOutlineDownload className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleCloseModal}
                  className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-lg transition-colors"
                >
                  <AiOutlineClose className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-auto flex items-center justify-center">
              <img 
                src={imageModal.imageUrl} 
                alt={imageModal.fileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ChatOwner;