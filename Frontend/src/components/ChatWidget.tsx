import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';
import { Paperclip } from 'react-bootstrap-icons';

interface ChatMessage {
  sender: 'customer' | 'admin';
  text?: string;
  file?: File;
  time: string;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [hasAutoReplied, setHasAutoReplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openChat = () => {
    setIsOpen(true);
    if (!hasAutoReplied) {
      setMessages(prevMsgs => [
        ...prevMsgs,
        {
          sender: 'admin',
          text: "Hello! PrintEase here, how can we assist you today?",
          time: getCurrentTime()
        }
      ]);
      setHasAutoReplied(true);
    }
  };

  const closeChat = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match fade-out duration
  };

  const handleSend = () => {
    if (input.trim()) {
      const newMsg: ChatMessage = {
        sender: 'customer',
        text: input,
        time: getCurrentTime()
      };
      setMessages((prev) => [...prev, newMsg]);
      setInput('');

      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            sender: 'admin',
            text: "Thank you for messaging us! We would like to connect with you shortly.",
            time: getCurrentTime()
          }
        ]);
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newMsg: ChatMessage = {
        sender: 'customer',
        file,
        time: getCurrentTime()
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="chat-widget">
      {!isOpen && (
        <button className="chat-button" onClick={openChat}>
          💬 Message Us
        </button>
      )}

      {isOpen && (
        <div className={`chat-window ${isClosing ? 'fade-out' : 'fade-in'}`}>
          <div className="chat-header">
            PrintEase – Customer Support
            <span className="close-chat" onClick={closeChat}>×</span>
          </div>

          <div className="chat-body">
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.sender}`}>
                {msg.sender === 'admin' ? (
                  <>
                    <div className="chat-bubble admin">
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
                    <span className="timestamp">{msg.time}</span>
                  </>
                ) : (
                  <>
                    <span className="timestamp">{msg.time}</span>
                    <div className="chat-bubble customer">
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
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-footer">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
            />
            <button className="pin-button" onClick={handleFileClick}>
              <Paperclip />
              <input
                type="file"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </button>
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
