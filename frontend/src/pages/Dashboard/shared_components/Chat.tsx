import React from "react";
import DashboardLayout from "./DashboardLayout";
import { AiOutlineSend, AiOutlinePaperClip, AiOutlineUser, AiOutlineMessage, AiOutlineTeam, AiOutlineShop, AiOutlineDownload, AiOutlineClose, AiOutlineReload } from "react-icons/ai";
import { BsCheck2All, BsCheck2 } from "react-icons/bs";
import { useSocket } from "../../../context/SocketContext";
import { useAuth } from "../../../context/AuthContext";

// Shared constants
const OWNER_ID = "68bfea82a2abdc3113746741";

// Shared types
interface BaseMessage {
  _id?: string;
  text?: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
  conversationId?: string; // owner side uses conversationId
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  isRead?: boolean;
}

interface CustomerInfo {
  id: string;
  name: string;
  email?: string;
  conversationId: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface ImageModalState {
  isOpen: boolean;
  imageUrl: string;
  fileName: string;
}

interface UnifiedChatProps {
  role?: "owner" | "customer"; // optional override from wrapper
}

// Utility helpers
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString();
};

// Owner Chat sub-component
const OwnerChat: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const [customers, setCustomers] = React.useState<CustomerInfo[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerInfo | null>(null);
  const [messages, setMessages] = React.useState<BaseMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [loadingCustomers, setLoadingCustomers] = React.useState(true);
  const [imageModal, setImageModal] = React.useState<ImageModalState>({ isOpen: false, imageUrl: "", fileName: "" });
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingMessagesRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  React.useEffect(() => {
    if (!socket) return;

    socket.on("newConversation", (data: { customerId: string; customerName: string; conversationId: string; lastMessage?: string }) => {
      setCustomers(prev => {
        const existing = prev.find(c => c.conversationId === data.conversationId);
        if (existing) return prev;
        const newCustomer: CustomerInfo = {
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

    socket.on("receiveMessage", (msg: BaseMessage) => {
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
          const exists = prev.some(m => m._id === msg._id || (m.text === msg.text && m.createdAt === msg.createdAt && m.senderId === msg.senderId));
          if (exists) return prev;
          return [...prev, { ...msg, senderName: msg.senderId === OWNER_ID ? "You" : selectedCustomer.name }];
        });
        if (msg.senderId !== OWNER_ID) {
          socket.emit("markAsRead", { conversationId: msg.conversationId, messageId: msg._id });
        }
      }
    });

    socket.on("messageSent", (msg: BaseMessage) => {
      const messageKey = `${msg.conversationId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      pendingMessagesRef.current.delete(messageKey);
      setMessages(prev => {
        const filtered = prev.filter(m => !(m.text === msg.text && !m._id && m.senderId === OWNER_ID));
        return [...filtered, { ...msg, senderName: "You", isRead: false }];
      });
      setCustomers(prev => prev.map(customer => customer.conversationId === msg.conversationId ? { ...customer, lastMessage: msg.text || msg.fileName || "File", lastMessageTime: msg.createdAt } : customer));
    });

    socket.on("messageRead", ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, isRead: true } : msg));
    });

    return () => {
      socket.off("newConversation");
      socket.off("receiveMessage");
      socket.off("messageSent");
      socket.off("messageRead");
    };
  }, [socket, selectedCustomer]);

  React.useEffect(() => {
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/conversations?ownerId=${OWNER_ID}`);
        if (!res.ok) throw new Error("Failed to load conversations");
        const data: any[] = await res.json();
        const customerList: CustomerInfo[] = await Promise.all(
          data.map(async conv => {
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
                } as CustomerInfo;
              }
            } catch (e) {
              console.error("Failed to fetch customer details", e);
            }
            return { id: customerId, name: "Customer", conversationId: conv._id, lastMessage: conv.lastMessage, lastMessageTime: conv.updatedAt, unreadCount: 0 } as CustomerInfo;
          })
        );
        const valid = customerList.filter(Boolean) as CustomerInfo[];
        setCustomers(valid);
        if (valid.length > 0 && !selectedCustomer) handleSelectCustomer(valid[0]);
      } catch (e) {
        console.error("Error loading customers", e);
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!selectedCustomer) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat/messages/${selectedCustomer.conversationId}`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data: BaseMessage[] = await res.json();
        setMessages(data.map(msg => ({ ...msg, senderName: msg.senderId === OWNER_ID ? "You" : selectedCustomer.name })));
        setCustomers(prev => prev.map(c => c.conversationId === selectedCustomer.conversationId ? { ...c, unreadCount: 0 } : c));
      } catch (e) {
        console.error("Error loading messages", e);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [selectedCustomer]);

  const handleSelectCustomer = (c: CustomerInfo) => {
    setSelectedCustomer(c);
    setMessages([]);
    setCustomers(prev => prev.map(x => x.conversationId === c.conversationId ? { ...x, unreadCount: 0 } : x));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedCustomer || !socket) return;
    const temp: BaseMessage = { text: newMessage, senderId: OWNER_ID, createdAt: new Date().toISOString(), senderName: "You", conversationId: selectedCustomer.conversationId, isRead: false };
    setMessages(prev => [...prev, temp]);
    const messageKey = `${selectedCustomer.conversationId}-${temp.createdAt}-${temp.text}`;
    pendingMessagesRef.current.add(messageKey);
    setNewMessage("");
    socket.emit("sendMessage", { conversationId: selectedCustomer.conversationId, senderId: OWNER_ID, receiverId: selectedCustomer.id, text: temp.text });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedCustomer || !socket) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const fileUrl = ev.target?.result as string;
      const temp: BaseMessage = { senderId: OWNER_ID, createdAt: new Date().toISOString(), fileName: file.name, fileType: file.type, fileUrl, senderName: "You", conversationId: selectedCustomer.conversationId, isRead: false };
      setMessages(prev => [...prev, temp]);
      const messageKey = `${selectedCustomer.conversationId}-${temp.createdAt}-${temp.fileName}`;
      pendingMessagesRef.current.add(messageKey);
      socket.emit("sendMessage", { conversationId: selectedCustomer.conversationId, senderId: OWNER_ID, receiverId: selectedCustomer.id, text: "", fileName: file.name, fileType: file.type, fileUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleImageClick = (imageUrl: string, fileName: string) => setImageModal({ isOpen: true, imageUrl, fileName });
  const handleDownload = (imageUrl: string, fileName: string) => { const link = document.createElement('a'); link.href = imageUrl; link.download = fileName; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleCloseModal = () => setImageModal({ isOpen: false, imageUrl: "", fileName: "" });

  const renderStatus = (m: BaseMessage) => m.senderId === OWNER_ID ? (m.isRead ? <BsCheck2All className="text-blue-400 ml-1" size={14} /> : <BsCheck2 className="text-gray-400 ml-1" size={14} />) : null;

  const renderFileMessage = (m: BaseMessage) => {
    const isImage = m.fileType?.startsWith('image/');
    if (isImage && m.fileUrl) return (
      <div className="cursor-pointer transform transition-transform hover:scale-105" onClick={() => handleImageClick(m.fileUrl!, m.fileName!)}>
        <img src={m.fileUrl} alt={m.fileName} className="max-w-xs max-h-48 rounded-lg object-cover border-2 border-white/20 shadow-lg" />
        <p className="text-xs text-gray-300 mt-1 text-center">{m.fileName}</p>
      </div>
    );
    return (
      <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg border border-white/20">
        <AiOutlinePaperClip className="flex-shrink-0 text-blue-400 text-lg" />
        <div>
          <span className="text-sm text-white block">{m.fileName}</span>
          <span className="text-xs text-gray-400">File</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[80vh] bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center"><AiOutlineTeam className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-2xl font-bold text-white">Chat with Customers</h1>
                <p className="text-sm text-gray-300">{customers.length} conversation{customers.length!==1 && 's'} {!isConnected && ' • Connecting...'}</p>
              </div>
            </div>
            <div className="text-right"><div className="text-sm text-gray-400">Store Admin</div><div className="text-xs text-gray-500">Always here to help</div></div>
          </div>
        </div>
        <div className="flex gap-6 h-[600px]">
          <div className="w-80 bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-white/10 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-white/10"><h2 className="text-white font-semibold text-lg flex items-center gap-2"><AiOutlineUser className="w-5 h-5" />Customers</h2></div>
            <div className="overflow-y-auto h-full">
              {loadingCustomers ? (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" /><p>Loading conversations...</p></div>
              ) : customers.length===0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-center"><AiOutlineMessage className="w-16 h-16 mb-4 opacity-50" /><p className="text-lg font-semibold">No Conversations</p><p className="text-sm mt-2">Customer conversations will appear here</p></div>
              ) : customers.map(c => (
                <div key={c.conversationId} onClick={() => handleSelectCustomer(c)} className={`p-4 border-b border-white/5 cursor-pointer transition-all ${selectedCustomer?.conversationId===c.conversationId? 'bg-blue-600/20 border-l-4 border-l-blue-500':'hover:bg-white/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white truncate">{c.name}</h3>
                    {c.unreadCount>0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-6 text-center">{c.unreadCount}</span>}
                  </div>
                  {c.lastMessage && <p className="text-sm text-gray-300 truncate mb-1">{c.lastMessage}</p>}
                  {c.lastMessageTime && <p className="text-xs text-gray-500">{formatDate(c.lastMessageTime)} • {formatTime(c.lastMessageTime)}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-white/10 shadow-xl overflow-hidden">
            {selectedCustomer ? (
              <>
                <div className="p-4 border-b border-white/10 bg-gray-700/20 flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center"><AiOutlineUser className="w-5 h-5 text-white" /></div><div><h2 className="text-white font-semibold text-lg">{selectedCustomer.name}</h2>{selectedCustomer.email && <p className="text-sm text-gray-300">{selectedCustomer.email}</p>}</div></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3" />Loading messages...</div>
                  ) : messages.length===0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center"><AiOutlineMessage className="w-16 h-16 mb-4 opacity-50" /><p className="text-lg font-semibold">No messages yet</p><p className="text-sm mt-2">Start the conversation by sending a message</p></div>
                  ) : messages.map((m,i) => (
                    <div key={m._id||`${m.createdAt}-${i}`} className={`flex ${m.senderId===OWNER_ID? 'justify-end':'justify-start'}`}> <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${m.senderId===OWNER_ID? 'bg-blue-600 text-white rounded-br-none':'bg-gray-700 text-white rounded-bl-none'}`}>{m.fileName? renderFileMessage(m): <p className="text-sm whitespace-pre-wrap">{m.text}</p>}<div className="flex items-center justify-end gap-1 mt-2"><span className="text-xs text-gray-300">{formatTime(m.createdAt)}</span>{renderStatus(m)}</div></div></div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-white/10"><div className="flex gap-3"><textarea value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={handleKeyDown} rows={1} placeholder="Type your message..." disabled={!isConnected} className="flex-1 rounded-xl bg-gray-700/50 border border-white/20 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" style={{minHeight:'50px',maxHeight:'120px'}}/><button type="button" onClick={()=>fileInputRef.current?.click()} disabled={!isConnected} className={`px-4 py-3 rounded-xl ${isConnected? 'bg-gray-700 hover:bg-gray-600 text-white':'bg-gray-600 text-gray-400 cursor-not-allowed'}`}><AiOutlinePaperClip className="w-5 h-5" /></button><button type="submit" disabled={!newMessage.trim()||!isConnected} className={`px-6 py-3 rounded-xl ${newMessage.trim()&&isConnected? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white':'bg-gray-600 text-gray-400 cursor-not-allowed'}`}><AiOutlineSend className="w-5 h-5" /></button></div><input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" disabled={!isConnected} /><div className="text-xs text-gray-500 mt-2 text-center">{!isConnected? 'Connecting to server...':'Press Enter to send • Shift+Enter for new line'}</div></form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center"><AiOutlineUser className="w-24 h-24 mb-6 opacity-50" /><h3 className="text-xl font-semibold mb-2">Select a Customer</h3><p className="text-sm">Choose a customer from the sidebar to start chatting</p></div>
            )}
          </div>
        </div>
      </div>
      {imageModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden border border-white/20"><div className="flex justify-between items-center p-4 border-b border-white/10 bg-gray-900"><h3 className="text-white font-semibold text-lg">{imageModal.fileName}</h3><div className="flex gap-2"><button onClick={()=>handleDownload(imageModal.imageUrl,imageModal.fileName)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"><AiOutlineDownload className="w-4 h-4" />Download</button><button onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-lg"><AiOutlineClose className="w-5 h-5" /></button></div></div><div className="p-6 max-h-[70vh] overflow-auto flex items-center justify-center"><img src={imageModal.imageUrl} alt={imageModal.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" /></div></div></div>
      )}
    </div>
  );
};

// Customer Chat sub-component
const CustomerChat: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const customerId = user?._id;
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<BaseMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [isChatReady, setIsChatReady] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [hasCheckedConversation, setHasCheckedConversation] = React.useState(false);
  const [imageModal, setImageModal] = React.useState<ImageModalState>({ isOpen: false, imageUrl: "", fileName: "" });
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingMessagesRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  React.useEffect(() => {
    if (!socket || !customerId) return;
    const checkConversation = () => { if (!hasCheckedConversation){ socket.emit("checkConversation", { customerId, ownerId: OWNER_ID }); setHasCheckedConversation(true);} };
    if (socket.connected) checkConversation(); else socket.once("connect", checkConversation);

    socket.on("receiveMessage", (msg: BaseMessage) => {
      const messageKey = `${msg.conversationId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      if (pendingMessagesRef.current.has(messageKey)) { pendingMessagesRef.current.delete(messageKey); return; }
      setMessages(prev => [...prev, { ...msg, senderName: "Store Admin", isRead: true }]);
    });
    socket.on("conversationCreated", ({ conversationId: id, customerId: cid }: { conversationId: string; customerId: string }) => { if (cid===customerId){ setConversationId(id); setIsChatReady(true); setConnectionError(null); socket.emit("joinConversation", id);} });
    socket.on("conversationExists", ({ conversationId: id, customerId: cid }: { conversationId: string; customerId: string }) => { if (cid===customerId){ setConversationId(id); setIsChatReady(true); setConnectionError(null); socket.emit("joinConversation", id);} });
    socket.on("messageSent", (msg: BaseMessage) => { const key=`${msg.conversationId}-${msg.createdAt}-${msg.text}-${msg.fileName}`; pendingMessagesRef.current.delete(key); setMessages(prev => { const filtered = prev.filter(m => !(m.text===msg.text && !m._id && m.senderId===customerId)); return [...filtered,{...msg,isRead:false}]; }); });
    socket.on("userTyping", ({ isTyping: typing, userId }: { isTyping: boolean; userId: string }) => { if (userId===OWNER_ID) setIsTyping(typing); });
    socket.on("userOnline", ({ isOnline: online, userId }: { isOnline: boolean; userId: string }) => { if (userId===OWNER_ID) setIsOnline(online); });
    socket.on("error", ({ message }: { message: string }) => setConnectionError(message));
    const handleConnect = () => { setIsOnline(true); setConnectionError(null); };
    const handleDisconnect = () => { setIsOnline(false); setConnectionError("Disconnected from server"); };
    socket.on("connect", handleConnect); socket.on("disconnect", handleDisconnect); setIsOnline(socket.connected);
    return () => { socket.off("receiveMessage"); socket.off("conversationCreated"); socket.off("conversationExists"); socket.off("messageSent"); socket.off("userTyping"); socket.off("userOnline"); socket.off("error"); socket.off("connect", handleConnect); socket.off("disconnect", handleDisconnect); socket.off("connect", checkConversation); };
  }, [socket, customerId, hasCheckedConversation]);

  React.useEffect(() => { if (!conversationId) return; const load = async () => { setLoadingMessages(true); try { const res = await fetch(`http://localhost:8000/api/chat/messages/${conversationId}`); if (!res.ok) throw new Error('fail'); const data: BaseMessage[] = await res.json(); setMessages(data.map(m => ({ ...m, senderName: m.senderId===customerId? 'You':'Store Admin', isRead: m.senderId===customerId? true: m.isRead }))); } catch { setConnectionError('Failed to load messages'); } finally { setLoadingMessages(false); setIsChatReady(true); } }; load(); }, [conversationId, customerId]);

  React.useEffect(() => { if (!hasCheckedConversation || isChatReady || conversationId) return; const t = setTimeout(()=> setIsChatReady(true), 5000); return ()=> clearTimeout(t); }, [hasCheckedConversation, isChatReady, conversationId]);

  const handleTyping = () => { if (!conversationId || !socket) return; socket.emit("typing", { conversationId, isTyping: newMessage.length>0, userId: customerId }); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } };
  const handleSend = (e?: React.FormEvent) => { e?.preventDefault(); if (!newMessage.trim() || !customerId || !socket) return; const temp: BaseMessage = { text: newMessage, senderId: customerId, createdAt: new Date().toISOString(), senderName: 'You', isRead: false }; setMessages(prev=>[...prev,temp]); const key = `${conversationId}-${temp.createdAt}-${temp.text}`; pendingMessagesRef.current.add(key); socket.emit("typing", { conversationId, isTyping: false, userId: customerId }); setNewMessage(""); if (!conversationId) socket.emit("startConversation", { customerId, ownerId: OWNER_ID, firstMessage: temp.text }); else socket.emit("sendMessage", { conversationId, senderId: customerId, receiverId: OWNER_ID, text: temp.text }); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || !e.target.files[0] || !customerId || !socket) return; const file = e.target.files[0]; if (file.size > 10 * 1024 * 1024){ alert('File size too large'); return;} const reader = new FileReader(); reader.onload = ev => { const fileUrl = ev.target?.result as string; const temp: BaseMessage = { senderId: customerId, createdAt: new Date().toISOString(), fileName: file.name, fileType: file.type, fileUrl, senderName: 'You', isRead: false }; setMessages(prev=>[...prev,temp]); const key = `${conversationId}-${temp.createdAt}-${temp.fileName}`; pendingMessagesRef.current.add(key); if (!conversationId) socket.emit("startConversation", { customerId, ownerId: OWNER_ID, firstFile: file.name }); else socket.emit("sendMessage", { conversationId, senderId: customerId, receiverId: OWNER_ID, text: "", fileName: file.name, fileType: file.type, fileUrl }); }; reader.readAsDataURL(file); e.target.value=""; };
  const openImage = (imageUrl: string, fileName: string) => setImageModal({ isOpen: true, imageUrl, fileName });
  const downloadImage = (imageUrl: string, fileName: string) => { const link = document.createElement('a'); link.href=imageUrl; link.download=fileName; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const closeModal = () => setImageModal({ isOpen:false, imageUrl:"", fileName:"" });
  const renderStatus = (m: BaseMessage) => m.senderId===customerId ? (m.isRead ? <BsCheck2All className="text-blue-400 ml-1" size={14} /> : <BsCheck2 className="text-gray-400 ml-1" size={14} />) : null;
  const renderFile = (m: BaseMessage) => { const isImage = m.fileType?.startsWith('image/'); if (isImage && m.fileUrl) return <div className="cursor-pointer transform transition-transform hover:scale-105" onClick={()=>openImage(m.fileUrl!,m.fileName!)}><img src={m.fileUrl} alt={m.fileName} className="max-w-xs max-h-48 rounded-lg object-cover border-2 border-white/20 shadow-lg"/><p className="text-xs text-gray-300 mt-1 text-center">{m.fileName}</p></div>; return <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg border border-white/20"><AiOutlinePaperClip className="flex-shrink-0 text-blue-400 text-lg" /><div><span className="text-sm text-white block">{m.fileName}</span><span className="text-xs text-gray-400">File</span></div></div>; };

  const renderChatContent = () => {
    if (connectionError) return <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8"><AiOutlineReload className="w-16 h-16 mb-4 opacity-50"/><p className="text-lg font-semibold">Connection Error</p><p className="text-sm mt-2 text-center max-w-md">{connectionError}</p></div>;
    if (!customerId) return <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8"><AiOutlineUser className="w-16 h-16 mb-4 opacity-50"/><p className="text-lg font-semibold">Login Required</p><p className="text-sm mt-2 text-gray-400">Please log in to chat</p></div>;
    if (!socket) return <div className="flex-1 flex flex-col items-center justify-center text-yellow-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mb-4"/><p className="text-lg font-semibold">Connecting...</p><p className="text-sm mt-2 text-gray-400">Establishing connection</p></div>;
    if (!isConnected) return <div className="flex-1 flex flex-col items-center justify-center text-yellow-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mb-4"/><p className="text-lg font-semibold">Connecting to Server</p><p className="text-sm mt-2 text-gray-400">Please wait</p></div>;
    if (loadingMessages) return <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"/><p className="text-lg font-semibold">Loading Messages</p></div>;
    if (messages.length===0 && isChatReady) return <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8"><AiOutlineShop className="w-16 h-16 mb-4 opacity-50"/><p className="text-lg font-semibold">Start a Conversation</p><p className="text-sm mt-2 text-center max-w-md">Ask about products or customization options!</p><p className="text-xs mt-4 text-gray-500">Type a message below to begin</p></div>;
    if (messages.length===0 && !isChatReady) return <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"/><p className="text-lg font-semibold">Setting Up Chat</p></div>;
    return messages.map((m,i)=>(<div key={m._id||`${m.createdAt}-${i}`} className={`flex mb-4 ${m.senderId===customerId? 'justify-end':'justify-start'}`}><div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${m.senderId===customerId? 'bg-blue-600 text-white rounded-br-none':'bg-gray-700 text-white rounded-bl-none'}`}>{m.fileName? renderFile(m): <p className="text-sm whitespace-pre-wrap">{m.text}</p>}<div className="flex items-center justify-end gap-1 mt-2"><span className="text-xs text-gray-300">{formatTime(m.createdAt)}</span>{renderStatus(m)}</div></div></div>));
  };

  return (
    <div className="flex flex-col h-full min-h-[80vh] bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-6 shadow-2xl"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="relative"><div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center"><AiOutlineShop className="w-6 h-6 text-white" /></div><div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${isOnline? 'bg-green-500':'bg-gray-500'}`} /></div><div><h1 className="text-2xl font-bold text-white">Store Admin</h1><div className="flex items-center gap-2 mt-1"><div className={`w-2 h-2 rounded-full ${isOnline? 'bg-green-500 animate-pulse':'bg-gray-500'}`} /><span className="text-sm text-gray-300">{isOnline? 'Online':'Offline'} {isTyping && ' • Typing...'}</span></div></div></div><div className="text-right"><div className="text-sm text-gray-400">Customer Support</div><div className="text-xs text-gray-500">Always here to help</div></div></div></div>
        <div className="flex-1 bg-gray-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-inner min-h-[400px] max-h-[60vh] overflow-y-auto">{renderChatContent()}<div ref={messagesEndRef} /></div>
        <form onSubmit={e=>{e.preventDefault(); handleSend();}} className="mt-6"><div className="flex gap-3"><textarea className="flex-1 rounded-xl bg-gray-700/50 border border-white/20 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" placeholder={isChatReady && isConnected? 'Type your message...':'Setting up chat...'} value={newMessage} rows={1} onChange={e=>{ setNewMessage(e.target.value); handleTyping(); }} onKeyDown={handleKeyDown} disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected} style={{minHeight:'50px',maxHeight:'120px'}}/><button type="button" onClick={()=>fileInputRef.current?.click()} disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected} className={`px-4 py-3 rounded-xl ${customerId && isChatReady && !connectionError && socket && isConnected? 'bg-gray-700 hover:bg-gray-600 text-white':'bg-gray-600 text-gray-400 cursor-not-allowed'}`}><AiOutlinePaperClip className="w-5 h-5" /></button><button type="submit" disabled={!customerId || !isChatReady || !newMessage.trim() || !!connectionError || !socket || !isConnected} className={`px-4 py-3 rounded-xl ${customerId && isChatReady && newMessage.trim() && !connectionError && socket && isConnected? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white':'bg-gray-600 text-gray-400 cursor-not-allowed'}`}><AiOutlineSend className="w-5 h-5" /></button></div><input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected} /><div className="text-xs text-gray-500 mt-2 text-center">{connectionError? 'Fix connection issues to send messages': !isConnected? 'Connecting to server...':'Press Enter to send • Shift+Enter for new line'}</div></form>
      </div>
      {imageModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden border border-white/20"><div className="flex justify-between items-center p-4 border-b border-white/10 bg-gray-900"><h3 className="text-white font-semibold text-lg">{imageModal.fileName}</h3><div className="flex gap-2"><button onClick={()=>downloadImage(imageModal.imageUrl,imageModal.fileName)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"><AiOutlineDownload className="w-4 h-4" />Download</button><button onClick={closeModal} className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-lg"><AiOutlineClose className="w-5 h-5" /></button></div></div><div className="p-6 max-h-[70vh] overflow-auto flex items-center justify-center"><img src={imageModal.imageUrl} alt={imageModal.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" /></div></div></div>
      )}
    </div>
  );
};

// Unified parent selects sub-chat based on role
const Chat: React.FC<UnifiedChatProps> = ({ role }) => {
  const { user } = useAuth();
  const effectiveRole = role || user?.role;
  const isOwnerSide = effectiveRole === 'owner' || (effectiveRole === 'employee');
  return (
    <DashboardLayout role={isOwnerSide? 'owner':'customer'}>
      {isOwnerSide ? <OwnerChat /> : <CustomerChat />}
    </DashboardLayout>
  );
};

export default Chat;
