import React from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "./DashboardLayout";
import { AiOutlineSend, AiOutlinePaperClip, AiOutlineUser, AiOutlineMessage, AiOutlineTeam, AiOutlineShop, AiOutlineDownload, AiOutlineClose, AiOutlineReload, AiOutlineArrowLeft } from "react-icons/ai";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { BsCheck2All, BsCheck2 } from "react-icons/bs";
import { useSocket } from "../../../context/SocketContext";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { useSidebar } from "../../../components/ui/sidebar";

// Shared types
interface BaseMessage {
  _id?: string;
  text?: string;
  senderId: string;
  createdAt: string;
  senderName?: string;
  chatId?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  isRead?: boolean;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  chatId?: string; // may be undefined for staff with no existing chat
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  kind?: 'customer' | 'employee' | 'owner';
}

interface ChatMessage {
  _id?: string;
  chatId?: string;
  senderId: string;
  text?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  createdAt: string;
}

interface CustomerChatSummary {
  _id: string;
  customerId: string;
  customerName?: string;
  lastMessage?: string;
  updatedAt?: string;
}

interface CustomerChatLifecycleEvent {
  chatId: string;
  customerId: string;
  storeId?: string | null;
  storeMemberIds?: string[];
}

interface StaffChatSummaryParticipant {
  _id: string;
  name?: string;
  email?: string;
}

interface StaffChatSummary {
  _id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: string;
  participantDetails?: StaffChatSummaryParticipant[];
}

interface FilePreviewState {
  isOpen: boolean;
  url: string;
  name: string;
  type?: string;
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

const normalizeId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const candidate = value as { _id?: string | number; toString?: () => string };
    if (candidate._id !== undefined) return String(candidate._id);
    if (typeof candidate.toString === "function") return candidate.toString();
  }
  return String(value);
};

const PANEL_SURFACE = "rounded-2xl border border-gray-200/80 bg-white text-gray-900 shadow-lg dark:border-white/10 dark:bg-gray-800/70 dark:text-white";
const SOFT_PANEL = "rounded-2xl border border-gray-200 /70 bg-white text-gray-900 shadow-sm dark:border-white/10 dark:bg-gray-900/40 dark:text-white";
const INPUT_SURFACE = "rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400";
const MUTED_TEXT = "text-gray-600 dark:text-gray-300";
const isImageFile = (fileName?: string, fileType?: string) => {
  if (fileType?.startsWith('image/')) return true;
  if (!fileName) return false;
  return /(\.png|\.jpe?g|\.gif|\.bmp|\.webp|\.svg)$/i.test(fileName);
};

// Owner Chat sub-component
const OwnerChat: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const currentUserId = user?._id ? String(user._id) : '';
  const [storeId, setStoreId] = React.useState<string | null>(null);
  const [storeOwnerId, setStoreOwnerId] = React.useState<string | null>(null);
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedParticipant, setSelectedParticipant] = React.useState<Participant | null>(null);
  const [messages, setMessages] = React.useState<BaseMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [loadingParticipants, setLoadingParticipants] = React.useState(true);
  const [previewModal, setPreviewModal] = React.useState<FilePreviewState>({ isOpen: false, url: "", name: "" });
  const [isMobileChatView, setIsMobileChatView] = React.useState(false);
  const [chatMode, setChatMode] = React.useState<'customers' | 'staff'>('customers');
  const [storeMemberDirectory, setStoreMemberDirectory] = React.useState<Record<string, string>>({});
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingMessagesRef = React.useRef<Set<string>>(new Set());
  const hasPrefetchedMembers = React.useRef(false);
  const pendingMemberFetchRef = React.useRef<Set<string>>(new Set());

  const registerStoreMembers = React.useCallback((entries: Array<{ id?: string | null; name?: string | null }>) => {
    if (!entries?.length) return;
    setStoreMemberDirectory(prev => {
      let changed = false;
      const next = { ...prev };
      entries.forEach(entry => {
        if (!entry?.id) return;
        const id = String(entry.id);
        const trimmed = entry.name?.trim();
        const value = trimmed && trimmed.length ? trimmed : undefined;
        if (value && next[id] !== value) {
          next[id] = value;
          changed = true;
        } else if (!value && !next[id]) {
          next[id] = 'Store Staff';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  React.useEffect(() => {
    if (!currentUserId) return;
    const fallbackName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You';
    registerStoreMembers([{ id: currentUserId, name: fallbackName }]);
  }, [currentUserId, user?.fullName, user?.firstName, user?.lastName, registerStoreMembers]);

  React.useEffect(() => {
    const prefetchMembers = async () => {
      if (hasPrefetchedMembers.current) return;
      if (!currentUserId || !user?.role) return;
      if (user.role === 'employee' && !storeOwnerId) return; // wait until store context resolved
      try {
        const rosterRes = await api.get('/employees/mine');
        const roster = Array.isArray(rosterRes.data) ? rosterRes.data : [];
        if (roster.length) {
          registerStoreMembers(roster.map((emp: { _id: string; fullName?: string; role?: string }) => ({
            id: String(emp._id),
            name: emp.fullName || emp.role || 'Employee'
          })));
        }
      } catch (err) {
        console.error('Failed to prefetch employee roster', err);
      }

      if (user.role === 'employee') {
        try {
          const ownerRes = await fetch(`http://localhost:8000/api/users/${storeOwnerId}`);
          if (ownerRes.ok) {
            const owner = await ownerRes.json();
            const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.fullName || 'Owner';
            registerStoreMembers([{ id: String(storeOwnerId), name: ownerName }]);
          }
        } catch (err) {
          console.error('Failed to register store owner', err);
        }
        try {
          const staffRes = await fetch(`http://localhost:8000/api/staff-chat/list?userId=${currentUserId}`);
          if (staffRes.ok) {
            const chats = await staffRes.json() as StaffChatSummary[];
            const staffEntries: { id: string; name?: string }[] = [];
            chats.forEach(chat => {
              (chat.participantDetails || []).forEach(detail => {
                if (detail._id && detail._id !== currentUserId) {
                  staffEntries.push({ id: detail._id, name: detail.name });
                }
              });
            });
            if (staffEntries.length) registerStoreMembers(staffEntries);
          }
        } catch (err) {
          console.error('Failed to prefetch staff members', err);
        }
      }

      hasPrefetchedMembers.current = true;
    };
    prefetchMembers();
  }, [currentUserId, registerStoreMembers, storeOwnerId, user?.role]);

  const resolveStoreSenderName = React.useCallback((senderId: string, fallback?: string) => {
    if (!senderId) return fallback || 'Store Staff';
    if (senderId === currentUserId) return fallback || user?.fullName || 'You';
    return storeMemberDirectory[senderId] || fallback || 'Store Staff';
  }, [currentUserId, storeMemberDirectory, user?.fullName]);

  const hydrateStoreMember = React.useCallback(async (senderId: string) => {
    if (!senderId || senderId === currentUserId) return;
    if (storeMemberDirectory[senderId]) return;
    const pending = pendingMemberFetchRef.current;
    if (pending.has(senderId)) return;
    pending.add(senderId);
    try {
      const res = await fetch(`http://localhost:8000/api/users/${senderId}`);
      if (!res.ok) return;
      const data = await res.json();
      const name = `${data.fullName || ''} ${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || 'Store Staff';
      registerStoreMembers([{ id: senderId, name }]);
    } catch (err) {
      console.error('Failed to hydrate store member', err);
    } finally {
      pending.delete(senderId);
    }
  }, [currentUserId, registerStoreMembers, storeMemberDirectory]);

  // Resolve store context so both owners and employees can query chats by store
  React.useEffect(() => {
    const fetchStore = async () => {
      if (!user?._id) return;
      if (user?.role !== 'owner' && user?.role !== 'employee') return;
      try {
        const res = await api.get('/print-store/mine');
        const store = res.data;
        if (store?._id) setStoreId(store._id);
        if (store?.owner) setStoreOwnerId(String(store.owner));
      } catch (err) {
        console.error('Failed to load store context', err);
      }
    };
    fetchStore();
  }, [user?._id, user?.role]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  React.useEffect(() => {
    if (!socket) return;

    // New customer chat notification from owner perspective
    socket.on("newCustomerChat", (data: { customerId: string; customerName: string; chatId: string; lastMessage?: string; storeId?: string | null }) => {
      setParticipants(prev => {
        const existing = prev.find(p => p.chatId === data.chatId);
        if (existing) return prev;
        const newParticipant: Participant = {
          id: data.customerId,
          name: data.customerName || "Customer",
          chatId: data.chatId,
          lastMessage: data.lastMessage,
          lastMessageTime: new Date().toISOString(),
          unreadCount: selectedParticipant?.chatId === data.chatId ? 0 : 1,
          kind: 'customer'
        };
        return [newParticipant, ...prev];
      });
      if (chatMode === 'customers' && !selectedParticipant) {
        handleSelectParticipant({
          id: data.customerId,
          name: data.customerName || 'Customer',
          chatId: data.chatId,
          lastMessage: data.lastMessage,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          kind: 'customer'
        });
      }
    });
    // Customer chat receive
    socket.on("receiveCustomerMessage", (msg: ChatMessage) => {
      const chatId = msg.chatId;
      if (!chatId) return;
      const senderId = normalizeId(msg.senderId);
      const messageKey = `${chatId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      if (pendingMessagesRef.current.has(messageKey)) {
        pendingMessagesRef.current.delete(messageKey);
        return;
      }

      setParticipants(prev => prev.map(p => {
        if (p.chatId === chatId) {
          return {
            ...p,
            lastMessage: msg.text || msg.fileName || "File",
            lastMessageTime: msg.createdAt,
            unreadCount: p.chatId === selectedParticipant?.chatId ? 0 : p.unreadCount + 1
          };
        }
        return p;
      }));

      if (chatId === selectedParticipant?.chatId) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === msg._id || (m.text === msg.text && m.createdAt === msg.createdAt && m.senderId === senderId));
          if (exists || !selectedParticipant) return prev;
          return [...prev, { ...msg, senderId, chatId, senderName: senderId === currentUserId ? "You" : (selectedParticipant ? selectedParticipant.name : 'Participant') }];
        });
      }
    });

    socket.on("customerMessageSent", (msg: ChatMessage) => {
      const chatId = msg.chatId;
      if (!chatId) return;
      const messageKey = `${chatId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      pendingMessagesRef.current.delete(messageKey);
      const senderId = normalizeId(msg.senderId || currentUserId);
      setMessages(prev => {
        const filtered = prev.filter(m => !(m.text === msg.text && !m._id && m.senderId === currentUserId));
        const nextMessage = { ...msg, senderId, chatId, senderName: "You", isRead: false };
        const existingIndex = filtered.findIndex(m => {
          if (msg._id && m._id === msg._id) return true;
          return m.senderId === senderId && m.createdAt === msg.createdAt && (m.text || "") === (msg.text || "") && (m.fileName || "") === (msg.fileName || "");
        });
        if (existingIndex >= 0) {
          const clone = [...filtered];
          clone[existingIndex] = nextMessage;
          return clone;
        }
        return [...filtered, nextMessage];
      });
      setParticipants(prev => prev.map(p => p.chatId === chatId ? { ...p, lastMessage: msg.text || msg.fileName || "File", lastMessageTime: msg.createdAt } : p));
    });

    // Staff chat events
    socket.on("staffReceiveMessage", (msg: ChatMessage) => {
      const messageKey = `${msg.chatId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      const senderId = normalizeId(msg.senderId);
      if (pendingMessagesRef.current.has(messageKey)) {
        pendingMessagesRef.current.delete(messageKey);
        return;
      }
      setParticipants(prev => prev.map(p => p.chatId === msg.chatId ? { ...p, lastMessage: msg.text || msg.fileName || "File", lastMessageTime: msg.createdAt, unreadCount: p.chatId === selectedParticipant?.chatId ? 0 : p.unreadCount + 1 } : p));
      if (msg.chatId === selectedParticipant?.chatId) {
        setMessages(prev => [...prev, { ...msg, senderId, chatId: msg.chatId, senderName: senderId === currentUserId ? "You" : (selectedParticipant ? selectedParticipant.name : 'Participant') }]);
      }
    });
    socket.on("staffMessageSent", (msg: ChatMessage) => {
      const messageKey = `${msg.chatId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      pendingMessagesRef.current.delete(messageKey);
      const senderId = normalizeId(msg.senderId || currentUserId);
      setMessages(prev => {
        const filtered = prev.filter(m => !(m.text === msg.text && !m._id && m.senderId === currentUserId));
        const nextMessage = { ...msg, senderId, chatId: msg.chatId, senderName: "You" };
        const existingIndex = filtered.findIndex(m => {
          if (msg._id && m._id === msg._id) return true;
          return m.senderId === senderId && m.createdAt === msg.createdAt && (m.text || "") === (msg.text || "") && (m.fileName || "") === (msg.fileName || "");
        });
        if (existingIndex >= 0) {
          const clone = [...filtered];
          clone[existingIndex] = nextMessage;
          return clone;
        }
        return [...filtered, nextMessage];
      });
      setParticipants(prev => prev.map(p => p.chatId === msg.chatId ? { ...p, lastMessage: msg.text || msg.fileName || "File", lastMessageTime: msg.createdAt } : p));
    });
    socket.on("staffChatReady", ({ chatId }: { chatId: string; participants: string[] }) => {
      // assign chatId for selected participant if missing
      if (selectedParticipant && !selectedParticipant.chatId) {
        setSelectedParticipant({ ...selectedParticipant, chatId });
        setParticipants(prev => prev.map(p => p.id === selectedParticipant.id ? { ...p, chatId } : p));
        // Load staff messages
        loadMessagesForParticipant({ ...selectedParticipant, chatId }, 'staff');
      }
    });

    return () => {
      socket.off("newCustomerChat");
      socket.off("receiveCustomerMessage");
      socket.off("customerMessageSent");
      socket.off("staffReceiveMessage");
      socket.off("staffMessageSent");
      socket.off("staffChatReady");
    };
  }, [socket, selectedParticipant]);

  React.useEffect(() => {
    const loadCustomerConversations = async () => {
      if (!storeId) return [];
      const endpoint = `http://localhost:8000/api/customer-chat/store/${storeId}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to load store conversations');
      const data = await res.json() as CustomerChatSummary[];
      return data.map(chat => ({ id: chat.customerId, name: chat.customerName || 'Customer', chatId: chat._id, lastMessage: chat.lastMessage, lastMessageTime: chat.updatedAt, unreadCount: 0, kind: 'customer' as const }));
    };

    const loadEmployees = async (): Promise<Participant[]> => {
      try {
        const res = await api.get('/employees/mine');
        const employees = res.data as { _id: string; fullName?: string; email?: string }[];
        const filtered = employees.filter(emp => String(emp._id) !== String(user?._id));
        registerStoreMembers(filtered.map(emp => ({ id: String(emp._id), name: emp.fullName || 'Employee' })));
        return filtered.map(emp => ({ id: String(emp._id), name: emp.fullName || 'Employee', email: emp.email, unreadCount: 0, kind: 'employee' }));
      } catch (err) {
        console.error('Failed loading employees', err);
        return [];
      }
    };

    const maybeAddOwnerForEmployee = async (): Promise<Participant | null> => {
      if (user?.role !== 'employee') return null;
      if (!storeOwnerId) return null;
      if (storeOwnerId === currentUserId) return null;
      try {
        const ownerRes = await fetch(`http://localhost:8000/api/users/${storeOwnerId}`);
        if (!ownerRes.ok) return null;
        const ownerData = await ownerRes.json();
        const name = `${ownerData.firstName || ''} ${ownerData.lastName || ''}`.trim() || 'Owner';
        const ownerEntry = { id: String(storeOwnerId), name, email: ownerData.email, unreadCount: 0, kind: 'owner' as const };
        registerStoreMembers([{ id: ownerEntry.id, name }]);
        return ownerEntry;
      } catch (err) {
        console.error('Failed adding owner participant', err);
        return null;
      }
    };

    const loadStaffChats = async (): Promise<Participant[]> => {
      try {
        if (!currentUserId) return [];
        const staffRes = await fetch(`http://localhost:8000/api/staff-chat/list?userId=${currentUserId}`);
        const chats = staffRes.ok ? await staffRes.json() as StaffChatSummary[] : [];
        // Map chats to participants excluding self
        const mapped: Participant[] = [];
        const staffEntries: { id: string; name?: string }[] = [];
        chats.forEach(c => {
          c.participants.forEach((pid: string) => {
            if (pid === currentUserId) return;
            const details = (c.participantDetails || []).find((d: StaffChatSummaryParticipant) => d._id === pid);
            mapped.push({
              id: pid,
              name: details ? details.name : 'User',
              email: details?.email,
              chatId: c._id,
              lastMessage: c.lastMessage,
              lastMessageTime: c.updatedAt,
              unreadCount: 0,
              kind: 'employee'
            });
            if (details?.name) staffEntries.push({ id: pid, name: details.name });
          });
        });
        if (staffEntries.length) registerStoreMembers(staffEntries);
        return mapped;
      } catch (err) {
        console.error('Failed loading staff chats', err);
        return [];
      }
    };

    const run = async () => {
      setLoadingParticipants(true);
      setParticipants([]);
      setSelectedParticipant(null);
      try {
        // Guard: wait for identifiers before attempting customer loads
        if (chatMode === 'customers' && !storeId) { setLoadingParticipants(false); return; }
        let final: Participant[] = [];
        if (chatMode === 'customers') {
          final = await loadCustomerConversations();
        } else {
          const chatParticipants = await loadStaffChats();
          const employees = await loadEmployees();
          const ownerParticipant = await maybeAddOwnerForEmployee();
          // merge by id, prefer existing chat data
          const byId: Record<string, Participant> = {};
          [...chatParticipants, ...employees].forEach(p => { byId[p.id] = { ...byId[p.id], ...p }; });
          if (ownerParticipant && !byId[ownerParticipant.id]) {
            byId[ownerParticipant.id] = ownerParticipant;
          }
          final = Object.values(byId);
        }
        setParticipants(final);
        if (final.length > 0) handleSelectParticipant(final[0]);
      } catch (err) {
        console.error('Error loading participants', err);
      } finally {
        setLoadingParticipants(false);
      }
    };
    run();
  }, [chatMode, currentUserId, registerStoreMembers, storeId, storeOwnerId, user?.role]);

  React.useEffect(() => {
    if (!selectedParticipant || selectedParticipant.kind !== 'customer') return;
    const candidates = messages
      .map(msg => msg.senderId)
      .filter((id): id is string => Boolean(id) && id !== selectedParticipant.id && id !== currentUserId && !storeMemberDirectory[id]);
    if (!candidates.length) return;
    candidates.forEach(id => hydrateStoreMember(id));
  }, [messages, selectedParticipant, currentUserId, storeMemberDirectory, hydrateStoreMember]);

  const loadMessagesForParticipant = async (p: Participant, type: 'customer' | 'staff') => {
    setLoadingMessages(true);
    try {
      if (!p.chatId) { setMessages([]); return; }
      const base = type === 'customer' ? 'customer-chat' : 'staff-chat';
      const res = await fetch(`http://localhost:8000/api/${base}/${p.chatId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json() as ChatMessage[];
      const normalizedMessages = data.map(msg => {
        const senderId = normalizeId(msg.senderId);
        return {
          ...msg,
          senderId,
          chatId: p.chatId,
          text: msg.text,
          fileName: msg.fileName,
          fileUrl: msg.fileUrl,
          createdAt: msg.createdAt,
          senderName: senderId === currentUserId ? 'You' : p.name,
        };
      });
      setMessages(normalizedMessages);
      setParticipants(prev => prev.map(x => x.chatId === p.chatId ? { ...x, unreadCount: 0 } : x));
    } catch (err) {
      console.error('Load messages error', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  React.useEffect(() => {
    if (!selectedParticipant) return;
    const type: 'customer' | 'staff' = selectedParticipant.kind === 'customer' ? 'customer' : 'staff';
    if (!selectedParticipant.chatId && socket && type === 'staff') {
      if (!currentUserId) return;
      socket.emit('staffGetOrCreateChat', { userAId: currentUserId, userBId: selectedParticipant.id });
      return;
    }
    if (!selectedParticipant.chatId && socket && type === 'customer') {
      // customer chats for owner already have chatId from list; nothing to do
      return;
    }
    loadMessagesForParticipant(selectedParticipant, type);
  }, [selectedParticipant]);

  const handleSelectParticipant = (p: Participant) => {
    setSelectedParticipant(p);
    setMessages([]);
    setParticipants(prev => prev.map(x => x.chatId === p.chatId ? { ...x, unreadCount: 0 } : x));
    setIsMobileChatView(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedParticipant || !socket || !currentUserId) return;
    // If staff chat without existing chatId, trigger staffGetOrCreateChat first; defer sending until chatReady
    if (!selectedParticipant.chatId && selectedParticipant.kind !== 'customer') {
      socket.emit('staffGetOrCreateChat', { userAId: currentUserId, userBId: selectedParticipant.id });
      return;
    }
    if (!selectedParticipant.chatId) return;
    const temp: BaseMessage = { text: newMessage, senderId: currentUserId, createdAt: new Date().toISOString(), senderName: "You", chatId: selectedParticipant.chatId, isRead: false };
    setMessages(prev => [...prev, temp]);
    const messageKey = `${selectedParticipant.chatId}-${temp.createdAt}-${temp.text}`;
    pendingMessagesRef.current.add(messageKey);
    setNewMessage("");
    if (selectedParticipant.kind === 'customer') {
      socket.emit('sendCustomerMessage', { chatId: selectedParticipant.chatId, senderId: currentUserId, receiverId: selectedParticipant.id, text: temp.text });
    } else {
      socket.emit('staffSendMessage', { chatId: selectedParticipant.chatId, senderId: currentUserId, receiverId: selectedParticipant.id, text: temp.text });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedParticipant || !socket || !currentUserId) return;
    if (!selectedParticipant.chatId && selectedParticipant.kind !== 'customer') {
      socket.emit('staffGetOrCreateChat', { userAId: currentUserId, userBId: selectedParticipant.id });
      return;
    }
    if (!selectedParticipant.chatId) return; // still not ready
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const fileUrl = ev.target?.result as string;
      const temp: BaseMessage = { senderId: currentUserId, createdAt: new Date().toISOString(), fileName: file.name, fileType: file.type, fileUrl, senderName: "You", chatId: selectedParticipant.chatId, isRead: false };
      setMessages(prev => [...prev, temp]);
      const messageKey = `${selectedParticipant.chatId}-${temp.createdAt}-${temp.fileName}`;
      pendingMessagesRef.current.add(messageKey);
      if (selectedParticipant.kind === 'customer') {
        socket.emit('sendCustomerMessage', { chatId: selectedParticipant.chatId, senderId: currentUserId, receiverId: selectedParticipant.id, text: '', fileName: file.name, fileType: file.type, fileUrl });
      } else {
        socket.emit('staffSendMessage', { chatId: selectedParticipant.chatId, senderId: currentUserId, receiverId: selectedParticipant.id, text: '', fileName: file.name, fileType: file.type, fileUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const previewMime = React.useMemo(() => {
    if (previewModal.type) return previewModal.type;
    if (previewModal.url.startsWith('data:')) {
      const header = previewModal.url.slice(5).split(';')[0];
      return header || undefined;
    }
    return undefined;
  }, [previewModal]);

  const previewIsPdf = React.useMemo(() => {
    if (!previewModal.url) return false;
    if (previewMime?.includes('pdf')) return true;
    return previewModal.url.toLowerCase().endsWith('.pdf');
  }, [previewMime, previewModal.url]);

  const openPreview = (url?: string, name?: string, type?: string) => {
    if (!url) return;
    setPreviewModal({ isOpen: true, url, name: name || 'Attachment', type });
  };

  const closePreview = () => setPreviewModal({ isOpen: false, url: "", name: "", type: undefined });

  const downloadPreview = () => {
    if (!previewModal.url) return;
    const link = document.createElement('a');
    link.href = previewModal.url;
    link.download = previewModal.name || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatus = (m: BaseMessage) => m.senderId === currentUserId ? (m.isRead ? <BsCheck2All className="text-blue-400 ml-1" size={14} /> : <BsCheck2 className="text-gray-400 ml-1" size={14} />) : null;

  const renderFileMessage = (m: BaseMessage) => {
    const imageAttachment = isImageFile(m.fileName, m.fileType) && m.fileUrl;
    if (imageAttachment) {
      return (
        <div className="space-y-2">
          <div
            className="relative overflow-hidden rounded-2xl border border-white/20 shadow-lg cursor-pointer group"
            onClick={() => openPreview(m.fileUrl!, m.fileName || 'Image', m.fileType)}
          >
            <img src={m.fileUrl} alt={m.fileName} className="w-full h-auto max-h-64 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center text-white text-sm font-medium opacity-0 group-hover:opacity-100">
              Click to enlarge
            </div>
          </div>
          {m.fileName && <p className="text-xs text-white/80 text-center truncate">{m.fileName}</p>}
        </div>
      );
    }
    const clickable = Boolean(m.fileUrl);
    return (
      <div
        role={clickable ? 'button' : undefined}
        onClick={clickable ? () => openPreview(m.fileUrl!, m.fileName || 'Attachment', m.fileType) : undefined}
        className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200/80 bg-white/80 text-gray-900 shadow-sm dark:border-white/20 dark:bg-white/10 dark:text-white ${clickable ? 'cursor-pointer hover:bg-white/90 dark:hover:bg-white/5' : 'opacity-60 cursor-not-allowed'}`}
      >
        <AiOutlinePaperClip className="flex-shrink-0 text-blue-600 dark:text-blue-300 text-lg" />
        <div className="text-sm">
          <div className="font-semibold truncate max-w-[12rem]">{m.fileName || 'Attachment'}</div>
          <div className={`text-xs ${MUTED_TEXT}`}>{m.fileType || 'Tap to preview'}</div>
        </div>
      </div>
    );
  };
  const filteredParticipants = participants.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.lastMessage && p.lastMessage.toLowerCase().includes(q))
    );
  });

    const { state: sidebarState, isMobile } = useSidebar();
    const sidebarOffset = React.useMemo(() => {
      if (isMobile) return "0px";
      return sidebarState === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)";
    }, [sidebarState, isMobile]);

    return (

      <div
        className="fixed max-w-full top-16 right-0 bottom-0 left-0 flex flex-col p-4 md:p-10 box-border overflow-hidden transition-[left] duration-300 ease-in-out"
        style={!isMobile ? { left: sidebarOffset } : undefined}
      >
        <div
          className={`${PANEL_SURFACE} backdrop-blur-lg mb-6 cursor-pointer rounded-full border-2 border-gray-300 dark:border-white/10 select-none transition-colors duration-300 hover:border-blue-400 hover:bg-white/90 dark:hover:border-blue-300/40 dark:hover:bg-gray-900/40`}
          onClick={() => setChatMode(prev => prev === 'customers' ? 'staff' : 'customers')}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap p-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center"><AiOutlineTeam className="w-6 h-6 text-white" /></div>
            <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{chatMode === 'customers' ? 'Chat with Customers' : 'Chat with Staff'}</h1>
            <p className={`text-sm ${MUTED_TEXT}`}>{chatMode === 'customers' ? `${participants.length} conversation${participants.length !== 1 ? 's' : ''}` : 'Internal team chat'} {!isConnected && ' • Connecting...'}</p>
            </div>
          </div>
          </div>
        </div>
        <div className="flex gap-6 flex-1 min-h-0">
          <div
          className={`${SOFT_PANEL} overflow-hidden flex flex-col flex-shrink-0 w-full border-gray-300 dark:border-white/10 md:w-80 ${isMobileChatView ? 'hidden md:flex' : 'flex'}`}
          >
          <div className="p-4 border-b border-gray-200/70 dark:border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
              <AiOutlineUser className="w-5 h-5" />
              Chats
            </h2>
            </div>
            <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaMagnifyingGlass className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search"
              className={`${INPUT_SURFACE} w-full pl-10 pr-4 py-2.5 text-sm`}
            />
            </div>
          </div>
            <div className="overflow-y-auto flex-1 chat-scroll">
              {loadingParticipants ? (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" /><p>Loading conversations...</p></div>
              ) : filteredParticipants.length===0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400 text-center"><AiOutlineMessage className="w-16 h-16 mb-4 opacity-50" /><p className="text-lg font-semibold">No Conversations</p><p className="text-sm mt-2">No conversations yet.</p></div>
              ) : filteredParticipants.map(p => {
                const isActive = selectedParticipant
                  ? (selectedParticipant.chatId && p.chatId
                      ? selectedParticipant.chatId === p.chatId
                      : selectedParticipant.id === p.id)
                  : false;
                return (
                <div key={p.chatId || p.id} onClick={() => handleSelectParticipant(p)} className={`p-4 border-b border-gray-100 dark:border-white/5 cursor-pointer transition-all ${isActive ? 'bg-blue-50 text-blue-900 border-l-4 border-l-blue-500 dark:bg-blue-600/20 dark:text-white' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</h3>
                      {p.unreadCount>0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-6 text-center">{p.unreadCount}</span>}
                    </div>
                {p.lastMessage && <p className={`text-sm truncate mb-1 ${MUTED_TEXT}`}>{p.lastMessage}</p>}
                {p.lastMessageTime && <p className={`text-xs ${MUTED_TEXT}`}>{formatDate(p.lastMessageTime)} • {formatTime(p.lastMessageTime)}</p>}
                  </div>
                );
              })}
            </div>
          </div>
          <div
          className={`${PANEL_SURFACE} flex-1 flex flex-col backdrop-blur-lg border-gray-300 dark:border-white/10 overflow-hidden min-h-0 ${isMobileChatView ? 'flex' : 'hidden'} md:flex`}
          >
            {selectedParticipant ? (
              <>
            <div className="p-4 border-b border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-gray-700/20 flex items-center gap-3">
                  <button
                    type="button"
                className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-600 dark:text-white"
                    onClick={() => setIsMobileChatView(false)}
                  >
                    <AiOutlineArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center"><AiOutlineUser className="w-5 h-5 text-white" /></div>
              <div><h2 className="font-semibold text-lg text-gray-900 dark:text-white">{selectedParticipant.name}</h2>{selectedParticipant.email && <p className={`text-sm ${MUTED_TEXT}`}>{selectedParticipant.email}</p>}</div>
                </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
                  {loadingMessages ? (
              <div className={`flex items-center justify-center h-full ${MUTED_TEXT}`}><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3" />Loading messages...</div>
                  ) : messages.length===0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400"><AiOutlineMessage className="w-16 h-16 mb-4 opacity-50" /><p className="text-lg font-semibold">No messages yet</p><p className="text-sm mt-2">Start the conversation by sending a message</p></div>
                  ) : messages.map((m,i) => {
                    const isCustomerChat = selectedParticipant?.kind === 'customer';
                    const isStoreMessage = isCustomerChat ? m.senderId !== selectedParticipant?.id : m.senderId === currentUserId;
                    const bubbleAlign = isStoreMessage ? 'justify-end' : 'justify-start';
              const bubbleColor = isStoreMessage
                ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/30'
                : 'bg-gray-100 text-gray-900 rounded-bl-none shadow-sm border border-gray-200 dark:bg-gray-700 dark:text-white dark:border-transparent';
                    const metaJustify = isStoreMessage ? 'justify-end' : 'justify-start';
                  const metaTextColor = isStoreMessage ? 'text-gray-200' : 'text-gray-500 dark:text-gray-300';
                  const senderTagColor = isStoreMessage ? 'text-gray-200' : 'text-gray-500 dark:text-gray-200';
                    const senderTag = isCustomerChat && isStoreMessage ? resolveStoreSenderName(m.senderId) : null;
                    return (
                      <div key={m._id||`${m.createdAt}-${i}`} className={`flex ${bubbleAlign}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${bubbleColor}`}>
                          {m.fileName? renderFileMessage(m): <p className="text-sm whitespace-pre-wrap">{m.text}</p>}
                      <div className={`flex ${metaJustify} gap-1 mt-2 items-center`}>
                      {senderTag && <span className={`text-[11px] mr-2 ${senderTagColor}`}>Sent by {senderTag}</span>}
                      <span className={`text-xs ${metaTextColor}`}>{formatTime(m.createdAt)}</span>
                            {renderStatus(m)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-gray-100 dark:border-white/10">
              <div className="flex gap-3">
              <textarea
                value={newMessage}
                onChange={e=>setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type your message..."
                disabled={!isConnected}
                className={`${INPUT_SURFACE} flex-1 resize-none p-4`}
                style={{minHeight:'50px',maxHeight:'120px'}}
              />
              <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={!isConnected} className={`px-4 py-3 rounded-xl border ${isConnected? 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-gray-700 dark:text-white' : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed dark:border-white/10 dark:bg-gray-800 dark:text-gray-500'}`}><AiOutlinePaperClip className="w-5 h-5" /></button>
              <button type="submit" disabled={!newMessage.trim()||!isConnected} className={`px-6 py-3 rounded-xl text-white transition ${newMessage.trim()&&isConnected? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500' : 'bg-gray-400 text-gray-200 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'}`}><AiOutlineSend className="w-5 h-5" /></button>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" disabled={!isConnected} />
              <div className={`text-xs mt-2 text-center ${MUTED_TEXT}`}>{!isConnected? 'Connecting to server...' : 'Press Enter to send • Shift+Enter for new line'}</div>
            </form>
              </>
            ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center"><AiOutlineUser className="w-24 h-24 mb-6 opacity-50" /><h3 className="text-xl font-semibold mb-2">Select a Conversation</h3><p className="text-sm">Choose a conversation from the sidebar to start chatting</p></div>
            )}
          </div>
        </div>
        {previewModal.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{previewModal.name || 'Attachment preview'}</h3>
                <p className={`text-sm ${MUTED_TEXT}`}>{previewMime || 'Attachment'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadPreview} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <AiOutlineDownload className="w-4 h-4" />Download
                </button>
                <button onClick={closePreview} className="bg-gray-200 text-gray-800 hover:bg-gray-300 px-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                  <AiOutlineClose className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-[40vh] max-h-[70vh] overflow-auto flex items-center justify-center">
              {previewMime?.startsWith('image/') ? (
                <img src={previewModal.url} alt={previewModal.name} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
              ) : previewIsPdf ? (
                <iframe title="attachment-preview" src={previewModal.url} className="w-full h-[70vh] rounded-xl border border-gray-200 dark:border-white/10 bg-white" />
              ) : previewModal.url ? (
                <div className="text-center space-y-4">
                  <p className={`text-sm ${MUTED_TEXT}`}>Preview not available for this file type.</p>
                  <button onClick={downloadPreview} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500">Download file</button>
                </div>
              ) : (
                <div className={`text-sm ${MUTED_TEXT}`}>No preview available.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
        )}
      </div>
  );
};

// Customer Chat sub-component (migrated to CustomerChat collection)
const CustomerChat: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const customerId = user?._id;
  const [storeId, setStoreId] = React.useState<string | null>(null);
  const [chatId, setChatId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<BaseMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [isChatReady, setIsChatReady] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [hasCheckedChat, setHasCheckedChat] = React.useState(false);
  const [storeMemberIds, setStoreMemberIds] = React.useState<string[]>([]);
  const [customerPreview, setCustomerPreview] = React.useState<FilePreviewState>({ isOpen: false, url: "", name: "" });
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingMessagesRef = React.useRef<Set<string>>(new Set());
  const storeMembersRef = React.useRef<string[]>([]);
  const storeOnlineRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  React.useEffect(() => {
    // Resolve storeId from routing/localStorage similar to OrderPage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedStoreId');
      if (stored) setStoreId(stored);
    }
  }, []);

  React.useEffect(() => {
    storeMembersRef.current = storeMemberIds;
    const nextOnline = new Set<string>();
    storeMemberIds.forEach((id) => {
      if (storeOnlineRef.current.has(id)) nextOnline.add(id);
    });
    storeOnlineRef.current = nextOnline;
    setIsOnline(nextOnline.size > 0);
    if (!nextOnline.size) setIsTyping(false);
  }, [storeMemberIds]);

  React.useEffect(() => {
    setHasCheckedChat(false);
    setChatId(null);
    setMessages([]);
    setStoreMemberIds([]);
    storeOnlineRef.current.clear();
    setIsOnline(false);
    setIsTyping(false);
    setConnectionError(null);
  }, [storeId]);

  React.useEffect(() => {
    if (!socket || !customerId || !storeId) return;
    const checkChat = () => {
      if (!hasCheckedChat) {
        socket.emit("checkCustomerChat", { customerId, storeId });
        setHasCheckedChat(true);
      }
    };
    if (socket.connected) checkChat(); else socket.once("connect", checkChat);

    socket.on("receiveCustomerMessage", (msg: any) => {
      const messageKey = `${msg.chatId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      if (pendingMessagesRef.current.has(messageKey)) { pendingMessagesRef.current.delete(messageKey); return; }
      const senderId = normalizeId(msg.senderId);
      setMessages(prev => [...prev, { ...msg, senderId, chatId: msg.chatId, senderName: "Store Admin", isRead: true }]);
    });
    socket.on("customerChatCreated", ({ chatId: id, customerId: cid, storeMemberIds: members }: CustomerChatLifecycleEvent) => {
      if (cid===customerId){
        setStoreMemberIds(members || []);
        setChatId(id);
        setIsChatReady(true);
        setConnectionError(null);
        socket.emit("joinChat", id);
      }
    });
    socket.on("customerChatExists", ({ chatId: id, customerId: cid, storeMemberIds: members }: CustomerChatLifecycleEvent) => {
      if (cid===customerId){
        setStoreMemberIds(members || []);
        setChatId(id);
        setIsChatReady(true);
        setConnectionError(null);
        socket.emit("joinChat", id);
      }
    });
    socket.on("customerMessageSent", (msg: any) => {
      const key=`${msg.chatId}-${msg.createdAt}-${msg.text}-${msg.fileName}`;
      pendingMessagesRef.current.delete(key);
      const senderId = normalizeId(msg.senderId || customerId);
      setMessages(prev => {
        const filtered = prev.filter(m => !(m.text===msg.text && !m._id && m.senderId===customerId));
        const nextMessage = { ...msg, senderId, chatId: msg.chatId, senderName: 'You', isRead:false };
        const existingIndex = filtered.findIndex(m => {
          if (msg._id && m._id === msg._id) return true;
          return m.senderId === senderId && m.createdAt === msg.createdAt && (m.text || "") === (msg.text || "") && (m.fileName || "") === (msg.fileName || "");
        });
        if (existingIndex >= 0) {
          const clone = [...filtered];
          clone[existingIndex] = nextMessage;
          return clone;
        }
        return [...filtered, nextMessage];
      });
    });
    socket.on("userTyping", ({ isTyping: typing, userId, conversationId }: { isTyping: boolean; userId: string; conversationId?: string }) => {
      if (conversationId && chatId && conversationId !== chatId) return;
      if (storeMembersRef.current.includes(userId)) setIsTyping(typing);
    });
    socket.on("userOnline", ({ isOnline: online, userId }: { isOnline: boolean; userId: string }) => {
      if (!storeMembersRef.current.includes(userId)) return;
      const next = new Set(storeOnlineRef.current);
      if (online) next.add(userId); else next.delete(userId);
      storeOnlineRef.current = next;
      setIsOnline(next.size > 0);
      if (!online && !next.size) setIsTyping(false);
    });
    socket.on("error", ({ message }: { message: string }) => setConnectionError(message));
    const handleConnect = () => { setConnectionError(null); };
    const handleDisconnect = () => {
      storeOnlineRef.current.clear();
      setIsOnline(false);
      setIsTyping(false);
      setConnectionError("Disconnected from server");
    };
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("receiveCustomerMessage");
      socket.off("customerChatCreated");
      socket.off("customerChatExists");
      socket.off("customerMessageSent");
      socket.off("userTyping");
      socket.off("userOnline");
      socket.off("error");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", checkChat);
    };
  }, [socket, customerId, hasCheckedChat, storeId, chatId]);

  React.useEffect(() => {
    if (!chatId) return;
    const load = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:8000/api/customer-chat/${chatId}/messages`);
        if (!res.ok) throw new Error('fail');
        const data: any[] = await res.json();
        const hydrated = data.map(m => {
          const senderId = normalizeId(m.senderId);
          return {
            ...m,
            senderId,
            chatId,
            text: m.text,
            fileName: m.fileName,
            fileUrl: m.fileUrl,
            createdAt: m.createdAt,
            senderName: senderId===customerId? 'You':'Store Admin',
            isRead: senderId===customerId,
          };
        });
        setMessages(hydrated);
      } catch { setConnectionError('Failed to load messages'); }
      finally { setLoadingMessages(false); setIsChatReady(true); }
    };
    load();
  }, [chatId, customerId]);

  React.useEffect(() => { if (!hasCheckedChat || isChatReady || chatId) return; const t = setTimeout(()=> setIsChatReady(true), 5000); return ()=> clearTimeout(t); }, [hasCheckedChat, isChatReady, chatId]);

  const handleTyping = () => { if (!chatId || !socket) return; socket.emit("typing", { conversationId: chatId, isTyping: newMessage.length>0, userId: customerId }); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } };
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !customerId || !socket) return;
    const temp: BaseMessage = { text: newMessage, senderId: customerId, createdAt: new Date().toISOString(), senderName: 'You', isRead: false };
    setMessages(prev=>[...prev,temp]);
    const key = `${chatId}-${temp.createdAt}-${temp.text}`;
    pendingMessagesRef.current.add(key);
    if (chatId) socket.emit('typing', { conversationId: chatId, isTyping: false, userId: customerId });
    setNewMessage("");
    if (!chatId) {
      if (!storeId) return;
      socket.emit('startCustomerChat', { customerId, storeId, firstMessage: temp.text });
    } else {
      socket.emit('sendCustomerMessage', { chatId, senderId: customerId, text: temp.text });
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !customerId || !socket) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024){ alert('File size too large'); return;}
    const reader = new FileReader();
    reader.onload = ev => {
      const fileUrl = ev.target?.result as string;
      const temp: BaseMessage = { senderId: customerId, createdAt: new Date().toISOString(), fileName: file.name, fileType: file.type, fileUrl, senderName: 'You', isRead: false };
      setMessages(prev=>[...prev,temp]);
      const key = `${chatId}-${temp.createdAt}-${temp.fileName}`;
      pendingMessagesRef.current.add(key);
      if (!chatId) {
        if (!storeId) return;
        socket.emit('startCustomerChat', { customerId, storeId, firstFile: file.name });
      } else {
        socket.emit('sendCustomerMessage', { chatId, senderId: customerId, text: '', fileName: file.name, fileType: file.type, fileUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value="";
  };
  const customerPreviewMime = React.useMemo(() => {
    if (customerPreview.type) return customerPreview.type;
    if (customerPreview.url.startsWith('data:')) return customerPreview.url.slice(5).split(';')[0] || undefined;
    return undefined;
  }, [customerPreview]);

  const customerPreviewIsPdf = React.useMemo(() => {
    if (!customerPreview.url) return false;
    if (customerPreviewMime?.includes('pdf')) return true;
    return customerPreview.url.toLowerCase().endsWith('.pdf');
  }, [customerPreviewMime, customerPreview.url]);

  const openCustomerPreview = (url?: string, name?: string, type?: string) => {
    if (!url) return;
    setCustomerPreview({ isOpen: true, url, name: name || 'Attachment', type });
  };

  const downloadCustomerPreview = () => {
    if (!customerPreview.url) return;
    const link = document.createElement('a');
    link.href = customerPreview.url;
    link.download = customerPreview.name || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeCustomerPreview = () => setCustomerPreview({ isOpen: false, url: "", name: "", type: undefined });
  const renderStatus = (m: BaseMessage) => m.senderId===customerId ? (m.isRead ? <BsCheck2All className="text-blue-400 ml-1" size={14} /> : <BsCheck2 className="text-gray-400 ml-1" size={14} />) : null;
  const renderFile = (m: BaseMessage) => {
    const imageAttachment = isImageFile(m.fileName, m.fileType) && m.fileUrl;
    if (imageAttachment) {
      return (
        <div className="space-y-2">
          <div
            className="relative overflow-hidden rounded-2xl border border-white/20 shadow-lg cursor-pointer group"
            onClick={() => openCustomerPreview(m.fileUrl!, m.fileName || 'Image', m.fileType)}
          >
            <img src={m.fileUrl} alt={m.fileName} className="w-full h-auto max-h-64 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center text-white text-sm font-medium opacity-0 group-hover:opacity-100">
              Tap to view
            </div>
          </div>
          {m.fileName && <p className="text-xs text-gray-300 text-center truncate">{m.fileName}</p>}
        </div>
      );
    }
    const clickable = Boolean(m.fileUrl);
    return (
      <div
        role={clickable ? 'button' : undefined}
        onClick={clickable ? () => openCustomerPreview(m.fileUrl!, m.fileName || 'Attachment', m.fileType) : undefined}
        className={`flex items-center gap-3 p-3 rounded-lg border border-white/20 bg-white/10 text-white ${clickable ? 'cursor-pointer hover:bg-white/20' : 'opacity-60 cursor-not-allowed'}`}
      >
        <AiOutlinePaperClip className="flex-shrink-0 text-blue-300 text-lg" />
        <div className="text-sm">
          <div className="font-semibold truncate max-w-[12rem]">{m.fileName || 'Attachment'}</div>
          <div className="text-xs text-gray-300">{m.fileType || 'Tap to preview'}</div>
        </div>
      </div>
    );
  };

  const renderChatContent = () => {
    if (connectionError) return <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8"><AiOutlineReload className="w-16 h-16 mb-4 opacity-50"/><p className="text-lg font-semibold">Connection Error</p><p className="text-sm mt-2 text-center max-w-md">{connectionError}</p></div>;
    if (!customerId) return <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8"><AiOutlineUser className="w-16 h-16 mb-4 opacity-50"/><p className="text-lg font-semibold">Login Required</p><p className="text-sm mt-2 text-gray-400">Please log in to chat</p></div>;
    if (!storeId) return <div className="flex-1 flex flex-col items-center justify-center text-yellow-300 p-8 text-center"><AiOutlineShop className="w-16 h-16 mb-4 opacity-50"/><p className="text-lg font-semibold">Select a Print Store</p><p className="text-sm mt-2 text-gray-400">Choose a store from the marketplace or order page to start chatting.</p></div>;
    if (!socket) return <div className="flex-1 flex flex-col items-center justify-center text-yellow-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mb-4"/><p className="text-lg font-semibold">Connecting...</p><p className="text-sm mt-2 text-gray-400">Establishing connection</p></div>;
    if (!isConnected) return <div className="flex-1 flex flex-col items-center justify-center text-yellow-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mb-4"/><p className="text-lg font-semibold">Connecting to Server</p><p className="text-sm mt-2 text-gray-400">Please wait</p></div>;
    if (loadingMessages) return <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"/><p className="text-lg font-semibold">Loading Messages</p></div>;
    if (messages.length===0 && isChatReady) return <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8"><AiOutlineShop className="w-16 h-16 mb-4 opacity-50"/><p className="text-lg font-semibold">Start a Chat</p><p className="text-sm mt-2 text-center max-w-md">Ask about products or customization options!</p><p className="text-xs mt-4 text-gray-500">Type a message below to begin</p></div>;
    if (messages.length===0 && !isChatReady) return <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"/><p className="text-lg font-semibold">Setting Up Chat</p></div>;
    return messages.map((m,i)=>(<div key={m._id||`${m.createdAt}-${i}`} className={`flex mb-4 ${m.senderId===customerId? 'justify-end':'justify-start'}`}><div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${m.senderId===customerId? 'bg-blue-600 text-white rounded-br-none':'bg-gray-700 text-white rounded-bl-none'}`}>{m.fileName? renderFile(m): <p className="text-sm whitespace-pre-wrap">{m.text}</p>}<div className="flex items-center justify-end gap-1 mt-2"><span className="text-xs text-gray-300">{formatTime(m.createdAt)}</span>{renderStatus(m)}</div></div></div>));
  };

  return (
    <div className="flex flex-col h-full min-h-[80vh] bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-6 shadow-2xl"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="relative"><div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center"><AiOutlineShop className="w-6 h-6 text-white" /></div><div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${isOnline? 'bg-green-500':'bg-gray-500'}`} /></div><div><h1 className="text-2xl font-bold text-white">Store Admin</h1><div className="flex items-center gap-2 mt-1"><div className={`w-2 h-2 rounded-full ${isOnline? 'bg-green-500 animate-pulse':'bg-gray-500'}`} /><span className="text-sm text-gray-300">{isOnline? 'Online':'Offline'} {isTyping && ' • Typing...'}</span></div></div></div><div className="text-right"><div className="text-sm text-gray-400">Customer Support</div><div className="text-xs text-gray-500">Always here to help</div></div></div></div>
        <div className="flex-1 bg-gray-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-inner min-h-[400px] max-h-[60vh] overflow-y-auto chat-scroll">{renderChatContent()}<div ref={messagesEndRef} /></div>
        <form onSubmit={e=>{e.preventDefault(); handleSend();}} className="mt-6"><div className="flex gap-3"><textarea className="flex-1 rounded-xl bg-gray-700/50 border border-white/20 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" placeholder={isChatReady && isConnected? 'Type your message...':'Setting up chat...'} value={newMessage} rows={1} onChange={e=>{ setNewMessage(e.target.value); handleTyping(); }} onKeyDown={handleKeyDown} disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected} style={{minHeight:'50px',maxHeight:'120px'}}/><button type="button" onClick={()=>fileInputRef.current?.click()} disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected} className={`px-4 py-3 rounded-xl ${customerId && isChatReady && !connectionError && socket && isConnected? 'bg-gray-700 hover:bg-gray-600 text-white':'bg-gray-600 text-gray-400 cursor-not-allowed'}`}><AiOutlinePaperClip className="w-5 h-5" /></button><button type="submit" disabled={!customerId || !isChatReady || !newMessage.trim() || !!connectionError || !socket || !isConnected} className={`px-4 py-3 rounded-xl ${customerId && isChatReady && newMessage.trim() && !connectionError && socket && isConnected? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white':'bg-gray-600 text-gray-400 cursor-not-allowed'}`}><AiOutlineSend className="w-5 h-5" /></button></div><input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" disabled={!customerId || !isChatReady || !!connectionError || !socket || !isConnected} /><div className="text-xs text-gray-500 mt-2 text-center">{connectionError? 'Fix connection issues to send messages': !isConnected? 'Connecting to server...':'Press Enter to send • Shift+Enter for new line'}</div></form>
      </div>
      {customerPreview.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{customerPreview.name || 'Attachment preview'}</h3>
                <p className={`text-sm ${MUTED_TEXT}`}>{customerPreviewMime || 'Attachment'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadCustomerPreview} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <AiOutlineDownload className="w-4 h-4" />Download
                </button>
                <button onClick={closeCustomerPreview} className="bg-gray-200 text-gray-800 hover:bg-gray-300 px-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                  <AiOutlineClose className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-[40vh] max-h-[70vh] overflow-auto flex items-center justify-center">
              {customerPreviewMime?.startsWith('image/') ? (
                <img src={customerPreview.url} alt={customerPreview.name} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
              ) : customerPreviewIsPdf ? (
                <iframe title="attachment-preview" src={customerPreview.url} className="w-full h-[70vh] rounded-xl border border-gray-200 dark:border-white/10 bg-white" />
              ) : customerPreview.url ? (
                <div className="text-center space-y-4">
                  <p className={`text-sm ${MUTED_TEXT}`}>Preview not available for this file type.</p>
                  <button onClick={downloadCustomerPreview} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500">Download file</button>
                </div>
              ) : (
                <div className={`text-sm ${MUTED_TEXT}`}>No preview available.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
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
