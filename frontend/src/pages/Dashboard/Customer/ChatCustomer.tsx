import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { AiOutlineSend, AiOutlinePaperClip, AiOutlineUser, AiOutlineShop, AiOutlineReload, AiOutlineDownload, AiOutlineClose } from "react-icons/ai";
import { BsCheck2All, BsCheck2 } from "react-icons/bs";
import { useSocket } from "../../../context/SocketContext"; 
import { useAuth } from "../../../context/AuthContext";

interface Message {
  _id?: string;
  text?: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  isRead?: boolean;
}

interface ImageModal {
  isOpen: boolean;
  imageUrl: string;
  fileName: string;
}

const ChatCustomer: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const customerId = user?._id;

  const OWNER_ID = "68bfea82a2abdc3113746741";
  const ownerIdRef = useRef<string>(OWNER_ID);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isChatReady, setIsChatReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasCheckedConversation, setHasCheckedConversation] = useState(false);
  const [imageModal, setImageModal] = useState<ImageModal>({ isOpen: false, imageUrl: "", fileName: "" });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingMessagesRef = useRef<Set<string>>(new Set());

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket || !customerId) return;

    console.log("✅ Setting up chat socket listeners for customer:", customerId);

    // Check for conversation when socket connects
    const checkConversation = () => {
      if (!hasCheckedConversation) {
        socket.emit("checkConversation", { 
          customerId, 
          ownerId: ownerIdRef.current 
        });
        setHasCheckedConversation(true);
      }
    };

    if (socket.connected) {
      checkConversation();
    } else {
      socket.once("connect", checkConversation);
    }

    socket.on("receiveMessage", (msg: Message) => {
      const messageKey = `${msg.conversationId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      if (pendingMessagesRef.current.has(messageKey)) {
        pendingMessagesRef.current.delete(messageKey);
        return;
      }

      setMessages(prev => [...prev, { 
        ...msg, 
        senderName: "Store Admin",
        isRead: true 
      }]);
    });

    socket.on("conversationCreated", ({ conversationId: id, customerId: convCustomerId }: { conversationId: string; customerId: string }) => {
      if (convCustomerId === customerId) {
        setConversationId(id);
        setIsChatReady(true);
        setConnectionError(null);
        socket.emit("joinConversation", id);
      }
    });

    socket.on("conversationExists", ({ conversationId: id, customerId: convCustomerId }: { conversationId: string; customerId: string }) => {
      if (convCustomerId === customerId) {
        setConversationId(id);
        setIsChatReady(true);
        setConnectionError(null);
        socket.emit("joinConversation", id);
      }
    });

    socket.on("messageSent", (msg: Message) => {
      const messageKey = `${msg.conversationId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      pendingMessagesRef.current.delete(messageKey);

      setMessages(prev => {
        const filtered = prev.filter(m => 
          !(m.text === msg.text && !m._id && m.senderId === customerId)
        );
        return [...filtered, { ...msg, isRead: false }];
      });
    });

    socket.on("userTyping", ({ isTyping: typing, userId }: { isTyping: boolean; userId: string }) => {
      if (userId === OWNER_ID) {
        setIsTyping(typing);
      }
    });

    socket.on("userOnline", ({ isOnline: online, userId }: { isOnline: boolean; userId: string }) => {
      if (userId === OWNER_ID) {
        setIsOnline(online);
      }
    });

    socket.on("error", ({ message }: { message: string }) => {
      setConnectionError(message);
    });

    const handleConnect = () => {
      setIsOnline(true);
      setConnectionError(null);
    };

    const handleDisconnect = () => {
      setIsOnline(false);
      setConnectionError("Disconnected from server");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    setIsOnline(socket.connected);

    return () => {
      socket.off("receiveMessage");
      socket.off("conversationCreated");
      socket.off("conversationExists");
      socket.off("messageSent");
      socket.off("userTyping");
      socket.off("userOnline");
      socket.off("error");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", checkConversation);
    };
  }, [socket, customerId, hasCheckedConversation]);

  // Load messages when conversation is ready
  useEffect(() => {
    if (!conversationId) return;
    
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/messages/${conversationId}`);
        if (!res.ok) throw new Error('Failed to load messages');
        const data: Message[] = await res.json();
        setMessages(
          data.map(msg => ({
            ...msg,
            senderName: msg.senderId === customerId ? "You" : "Store Admin",
            isRead: msg.senderId === customerId ? true : msg.isRead
          }))
        );
      } catch (err) {
        setConnectionError('Failed to load messages');
      } finally {
        setLoadingMessages(false);
        setIsChatReady(true);
      }
    };
    
    loadMessages();
  }, [conversationId, customerId]);

  // If no conversation found after 5 seconds, allow user to start one
  useEffect(() => {
    if (!hasCheckedConversation || isChatReady || conversationId) return;

    const timer = setTimeout(() => {
      setIsChatReady(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [hasCheckedConversation, isChatReady, conversationId]);

  // Typing indicator
  const handleTyping = () => {
    if (!conversationId || !socket) return;
    
    socket.emit("typing", { 
      conversationId, 
      isTyping: newMessage.length > 0,
      userId: customerId
    });
  };

  // Handle text area key down for Shift+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !customerId || !socket) return;

    const tempMsg: Message = {
      text: newMessage,
      senderId: customerId,
      createdAt: new Date().toISOString(),
      senderName: "You",
      isRead: false,
    };

    setMessages(prev => [...prev, tempMsg]);
    
    const messageKey = `${conversationId}-${tempMsg.createdAt}-${tempMsg.text}`;
    pendingMessagesRef.current.add(messageKey);

    socket.emit("typing", { conversationId, isTyping: false, userId: customerId });
    setNewMessage("");

    try {
      if (!conversationId) {
        socket.emit("startConversation", { 
          customerId, 
          ownerId: ownerIdRef.current, 
          firstMessage: newMessage 
        });
      } else {
        socket.emit("sendMessage", { 
          conversationId, 
          senderId: customerId, 
          receiverId: ownerIdRef.current, 
          text: newMessage 
        });
      }
    } catch (error) {
      pendingMessagesRef.current.delete(messageKey);
      setMessages(prev => prev.filter(m => m !== tempMsg));
    }
  };

  // Send file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !customerId || !socket) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      alert("File size too large. Please upload a file smaller than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileUrl = e.target?.result as string;

      const tempMsg: Message = {
        senderId: customerId,
        createdAt: new Date().toISOString(),
        fileName: file.name,
        fileType: file.type,
        fileUrl: fileUrl,
        senderName: "You",
        isRead: false,
      };

      setMessages(prev => [...prev, tempMsg]);

      const messageKey = `${conversationId}-${tempMsg.createdAt}-${tempMsg.fileName}`;
      pendingMessagesRef.current.add(messageKey);

      try {
        if (!conversationId) {
          socket.emit("startConversation", { 
            customerId, 
            ownerId: ownerIdRef.current, 
            firstFile: file.name 
          });
        } else {
          socket.emit("sendMessage", { 
            conversationId, 
            senderId: customerId, 
            receiverId: ownerIdRef.current, 
            text: "", 
            fileName: file.name,
            fileType: file.type,
            fileUrl: fileUrl
          });
        }
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

  const renderMessageStatus = (msg: Message) => {
    if (msg.senderId !== customerId) return null;
    
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

  const renderChatContent = () => {
    if (connectionError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8">
          <AiOutlineReload className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-semibold">Connection Error</p>
          <p className="text-sm mt-2 text-center max-w-md">{connectionError}</p>
        </div>
      );
    }

    if (!customerId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8">
          <AiOutlineUser className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-semibold">Authentication Required</p>
          <p className="text-sm mt-2 text-gray-400">Please log in to access the chat</p>
        </div>
      );
    }

    if (!socket) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-yellow-400 p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-lg font-semibold">Connecting...</p>
          <p className="text-sm mt-2 text-gray-400">Establishing connection to server</p>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-yellow-400 p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-lg font-semibold">Connecting to Server</p>
          <p className="text-sm mt-2 text-gray-400">Please wait while we establish a connection</p>
        </div>
      );
    }

    if (loadingMessages) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg font-semibold">Loading Messages</p>
          <p className="text-sm mt-2">Loading your conversation history...</p>
        </div>
      );
    }

    if (messages.length === 0 && isChatReady) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
          <AiOutlineShop className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-semibold">Start a Conversation</p>
          <p className="text-sm mt-2 text-center max-w-md">
            Begin chatting with our store admin. Ask about products, customization options, or any questions you may have!
          </p>
          <p className="text-xs mt-4 text-gray-500">
            Type a message below to get started
          </p>
        </div>
      );
    }

    if (messages.length === 0 && !isChatReady) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg font-semibold">Setting Up Chat</p>
          <p className="text-sm mt-2">Creating your conversation...</p>
        </div>
      );
    }

    return messages.map((msg, index) => (
      <div key={msg._id || `${msg.createdAt}-${index}`} className={`flex mb-4 ${msg.senderId === customerId ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.senderId === customerId ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-700 text-white rounded-bl-none"}`}>
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
    ));
  };

  return (
    <DashboardLayout role="customer">
      <div className="flex flex-col h-full min-h-[80vh] bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <AiOutlineShop className="w-6 h-6 text-white" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Store Admin</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="text-sm text-gray-300">
                      {isOnline ? 'Online' : 'Offline'}
                      {isTyping && ' • Typing...'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Customer Support</div>
                <div className="text-xs text-gray-500">Always here to help</div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 bg-gray-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-inner min-h-[400px] max-h-[60vh] overflow-y-auto">
            {renderChatContent()}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="mt-6">
            <div className="flex gap-3">
              <textarea
                className="flex-1 rounded-xl bg-gray-700/50 border border-white/20 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 backdrop-blur-sm resize-none"
                placeholder={isChatReady && isConnected ? "Type your message..." : "Setting up chat..."}
                value={newMessage}
                rows={1}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected}
                style={{ minHeight: '50px', maxHeight: '120px' }}
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-3 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  customerId && isChatReady && !connectionError && socket && isConnected
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected}
              >
                <AiOutlinePaperClip className="w-5 h-5" />
              </button>
              
              <button 
                type="submit" 
                className={`px-4 py-3 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  customerId && isChatReady && newMessage.trim() && !connectionError && socket && isConnected
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!customerId || !isChatReady || !newMessage.trim() || !!connectionError || !socket || !isConnected}
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
              disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected}
            />
            
            <div className="text-xs text-gray-500 mt-2 text-center">
              {connectionError ? 'Fix connection issues to send messages' : 
               !isConnected ? 'Connecting to server...' : 'Press Enter to send • Shift+Enter for new line'}
            </div>
          </form>
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

export default ChatCustomer;