import React, { useState, useRef, useEffect } from 'react';
import { Paperclip } from 'react-bootstrap-icons';
import './ChatSupport.css';

interface ChatMessage {
  sender: 'admin' | 'user';
  text?: string;
  file?: File;
  time: string;
}

interface Chat {
  id: string;
  name: string;
  isGuest: boolean;
  messages: ChatMessage[];
}

const mockChats: Chat[] = [
  {
    id: 'user-1',
    name: 'John Smith',
    isGuest: false,
    messages: [],
  },
  {
    id: 'guest-1',
    name: 'Guest A',
    isGuest: true,
    messages: [],
  },
];

const ChatSupport: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChatId, setSelectedChatId] = useState<string>(mockChats[0].id);
  const [input, setInput] = useState('');
  const [showGuests, setShowGuests] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      sender: 'admin',
      text: input.trim(),
      time: getCurrentTime(),
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedChatId
          ? { ...chat, messages: [...chat.messages, newMessage] }
          : chat
      )
    );

    setInput('');
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newMessage: ChatMessage = {
        sender: 'admin',
        file,
        time: getCurrentTime(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChatId
            ? { ...chat, messages: [...chat.messages, newMessage] }
            : chat
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 🔁 Updated: Send suggestion message immediately
  const insertSuggestion = (text: string) => {
    const newMessage: ChatMessage = {
      sender: 'admin',
      text,
      time: getCurrentTime(),
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedChatId
          ? { ...chat, messages: [...chat.messages, newMessage] }
          : chat
      )
    );
  };

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <h3>Messages</h3>
        <div className="chat-list">
          {chats
            .filter((c) => !c.isGuest)
            .map((chat) => (
              <div
                key={chat.id}
                className={`chat-thread ${selectedChatId === chat.id ? 'active' : ''}`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                👤 {chat.name}
              </div>
            ))}
          <div className="guest-section">
            <div className="guest-header" onClick={() => setShowGuests(!showGuests)}>
              🧾 Guest Logs {showGuests ? '▲' : '▼'}
            </div>
            {showGuests &&
              chats
                .filter((c) => c.isGuest)
                .map((chat) => (
                  <div
                    key={chat.id}
                    className={`chat-thread ${selectedChatId === chat.id ? 'active' : ''}`}
                    onClick={() => setSelectedChatId(chat.id)}
                  >
                    👤 {chat.name}
                  </div>
                ))}
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-header">{selectedChat?.name}</div>

        <div className="chat-messages">
          {selectedChat?.messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.sender}`}>
              {msg.sender === 'admin' && <span className="timestamp-left">{msg.time}</span>}
              <div className="chat-bubble animated">
                {msg.text && <p>{msg.text}</p>}
                {msg.file && msg.file.type.startsWith('image/') && (
                  <img
                    src={URL.createObjectURL(msg.file)}
                    alt="uploaded"
                    className="chat-image"
                  />
                )}
                {msg.file && !msg.file.type.startsWith('image/') && (
                  <a
                    href={URL.createObjectURL(msg.file)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 {msg.file.name}
                  </a>
                )}
              </div>
              {msg.sender === 'user' && <span className="timestamp-right">{msg.time}</span>}
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="suggested-replies">
          <button onClick={() => insertSuggestion("Hello! PrintEase here, how can I assist you today?")}>
            Help Assist
          </button>
          <button onClick={() => insertSuggestion("Our Printing Services include: Mugs, T-Shirts, Eco Bags, Pens, Tarpaulins, and Documents!")}>
            Services
          </button>
          <button onClick={() => insertSuggestion("PrintEase is open Monday to Friday, 9 AM to 6 PM.")}>
            Store hours
          </button>
        </div>

        <div className="chat-input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
          />
          <button className="clip-button" onClick={handleFileClick}>
            <Paperclip />
            <input
              type="file"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </button>
          <button onClick={handleSend} className="send-button">
            Send
          </button>
        </div>
      </main>
    </div>
  );
};

export default ChatSupport;
