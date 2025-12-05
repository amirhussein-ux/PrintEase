const socketIO = require('socket.io');
const CustomerChat = require('./models/customerChatModel');
const FAQ = require('./models/faqModel'); // NEW: Import FAQ model

// NEW: Auto-reply helper function
const getAutoReplyForMessage = async (storeId, message) => {
  try {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Check if customer wants human agent
    const humanTriggers = ['human', 'agent', 'representative', 'real person', 'talk to admin', 'speak to someone', 'admin', 'manager'];
    const wantsHuman = humanTriggers.some(trigger => normalizedMessage.includes(trigger));
    
    if (wantsHuman) {
      return {
        type: 'escalation',
        text: "I'll connect you with a store representative. Please hold on...",
        escalateToHuman: true,
        isAutoReply: true
      };
    }
    
    // Check for FAQ matches
    const storeFAQs = await FAQ.find({ storeId, isActive: true });
    
    // First check exact triggers
    const exactMatch = storeFAQs.find(faq => 
      faq.triggers && faq.triggers.some(trigger => 
        trigger.toLowerCase() === normalizedMessage
      )
    );
    
    if (exactMatch) {
      return {
        type: 'faq',
        text: exactMatch.answer,
        faqId: exactMatch._id,
        question: exactMatch.question,
        category: exactMatch.category,
        isAutoReply: true
      };
    }
    
    // Check keyword matches
    const keywordMatches = storeFAQs.filter(faq => 
      faq.keywords && faq.keywords.some(keyword => 
        normalizedMessage.includes(keyword.toLowerCase())
      )
    );
    
    if (keywordMatches.length > 0) {
      // Find best match (most keyword matches)
      const bestMatch = keywordMatches.reduce((best, current) => {
        const currentMatches = current.keywords.filter(keyword => 
          normalizedMessage.includes(keyword.toLowerCase())
        ).length;
        const bestMatches = best.keywords.filter(keyword => 
          normalizedMessage.includes(keyword.toLowerCase())
        ).length;
        return currentMatches > bestMatches ? current : best;
      });
      
      return {
        type: 'faq',
        text: bestMatch.answer,
        faqId: bestMatch._id,
        question: bestMatch.question,
        category: bestMatch.category,
        isAutoReply: true
      };
    }
    
    // Default response for no match
    return {
      type: 'no_match',
      text: "I'm not sure I understand. Could you please rephrase your question? Or you can ask about:\n• Order cancellation\n• Design editing\n• Payment issues\n• Delivery tracking\n\nOr type 'human' to speak with a store representative.",
      isAutoReply: true
    };
    
  } catch (error) {
    console.error("Auto-reply error:", error);
    return null;
  }
};

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  const userSockets = new Map();
  const chatRooms = new Map();

  io.on("connection", (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    // Register user
    socket.on("register", ({ userId, role }) => {
      if (!userId) return;
      const userKey = `${userId}`;
      userSockets.set(userKey, socket.id);
      socket.userId = userId;
      socket.role = role;
      
      // Join relevant rooms
      socket.join(`user_${userId}`);
      if (role === 'owner' || role === 'employee') {
        socket.join(`store_admins`);
      }
      
      console.log(`✅ Registered: ${userId} (${role}) as ${socket.id}`);
    });

    // NEW: Check for auto-reply on customer message
    socket.on("checkAutoReply", async (data) => {
      try {
        const { storeId, message, chatId, customerId } = data;
        
        if (!storeId || !message) {
          socket.emit("autoReplyError", { message: "storeId and message required" });
          return;
        }
        
        const autoReply = await getAutoReplyForMessage(storeId, message);
        
        if (autoReply) {
          // Send auto-reply to customer
          const autoReplyMessage = {
            chatId,
            senderId: storeId, // Store acts as the bot
            text: autoReply.text,
            createdAt: new Date().toISOString(),
            payloadType: 'faq_response',
            payload: {
              faqId: autoReply.faqId,
              question: autoReply.question,
              category: autoReply.category,
              isAutoReply: true,
              escalateToHuman: autoReply.escalateToHuman || false
            },
            isAutoReply: true,
            senderName: 'PrintEase Assistant'
          };
          
          // Save to database
          try {
            const chat = await CustomerChat.findById(chatId);
            if (chat) {
              await chat.appendMessage({
                senderId: storeId,
                text: autoReply.text,
                payloadType: 'faq_response',
                payload: autoReplyMessage.payload,
                isAutoReply: true
              });
              
              // Notify customer
              socket.to(`user_${customerId}`).emit("receiveAutoReply", autoReplyMessage);
              socket.emit("receiveAutoReply", autoReplyMessage);
              
              // If escalation needed, notify store admins
              if (autoReply.escalateToHuman) {
                chat.isEscalated = true;
                chat.escalatedAt = new Date();
                await chat.save();
                
                io.to(`store_admins`).emit("chatEscalated", {
                  chatId,
                  customerId,
                  storeId,
                  reason: "Customer requested human agent",
                  escalatedAt: new Date().toISOString()
                });
                
                // Send escalation message to customer
                const escalationMsg = {
                  chatId,
                  senderId: storeId,
                  text: "A store representative has been notified and will join this chat shortly.",
                  createdAt: new Date().toISOString(),
                  isAutoReply: true,
                  senderName: 'PrintEase Assistant'
                };
                
                socket.to(`user_${customerId}`).emit("receiveAutoReply", escalationMsg);
                socket.emit("receiveAutoReply", escalationMsg);
              }
            }
          } catch (dbError) {
            console.error("Error saving auto-reply:", dbError);
          }
          
          // Send quick reply suggestions
          const quickReplies = {
            type: 'quick_replies',
            chatId,
            options: [
              { text: "That helps, thanks!", value: "helpful" },
              { text: "I need more help", value: "need_human" },
              { text: "Ask another question", value: "continue" }
            ]
          };
          
          socket.to(`user_${customerId}`).emit("showQuickReplies", quickReplies);
          socket.emit("showQuickReplies", quickReplies);
        }
        
      } catch (error) {
        console.error("checkAutoReply socket error:", error);
        socket.emit("autoReplyError", { message: "Failed to process auto-reply" });
      }
    });

    // NEW: Handle quick reply selection
    socket.on("quickReplySelected", async (data) => {
      const { chatId, value, customerId, storeId } = data;
      
      if (value === "need_human") {
        // Escalate to human
        try {
          const chat = await CustomerChat.findById(chatId);
          if (chat) {
            chat.isEscalated = true;
            chat.escalatedAt = new Date();
            await chat.save();
            
            // Notify store admins
            io.to(`store_admins`).emit("chatEscalated", {
              chatId,
              customerId,
              storeId,
              reason: "Customer selected 'I need more help'",
              escalatedAt: new Date().toISOString()
            });
            
            // Send confirmation to customer
            const confirmationMsg = {
              chatId,
              senderId: storeId,
              text: "A store representative has been notified. They will join the chat shortly.",
              createdAt: new Date().toISOString(),
              isAutoReply: true,
              senderName: 'PrintEase Assistant'
            };
            
            socket.to(`user_${customerId}`).emit("receiveAutoReply", confirmationMsg);
            socket.emit("receiveAutoReply", confirmationMsg);
          }
        } catch (error) {
          console.error("Error escalating chat:", error);
        }
      }
    });

    // Existing customer chat events with auto-reply integration
    socket.on("startCustomerChat", async (data) => {
      try {
        const { customerId, storeId, firstMessage } = data;
        console.log(`Starting customer chat: ${customerId} with store ${storeId}`);
        
        // Check for existing chat
        let chat = await CustomerChat.findOne({
          participants: { $all: [customerId, storeId] },
          storeId
        });
        
        if (!chat) {
          chat = await CustomerChat.create({
            participants: [customerId, storeId],
            storeId,
            isAutoReplyActive: true // Enable auto-reply by default
          });
        }
        
        // Join chat room
        socket.join(`chat_${chat._id}`);
        chatRooms.set(chat._id.toString(), {
          participants: [customerId, storeId],
          isAutoReplyActive: true
        });
        
        // Send chat created event
        socket.emit("customerChatCreated", {
          chatId: chat._id,
          customerId,
          storeId
        });
        
        // If there's a first message, check for auto-reply
        if (firstMessage) {
          const autoReply = await getAutoReplyForMessage(storeId, firstMessage);
          
          if (autoReply) {
            // Send auto-reply
            const autoReplyMessage = {
              chatId: chat._id,
              senderId: storeId,
              text: autoReply.text,
              createdAt: new Date().toISOString(),
              isAutoReply: true,
              senderName: 'PrintEase Assistant'
            };
            
            // Save to database
            await chat.appendMessage({
              senderId: storeId,
              text: autoReply.text,
              isAutoReply: true
            });
            
            // Emit to customer
            socket.to(`user_${customerId}`).emit("receiveAutoReply", autoReplyMessage);
            socket.emit("receiveAutoReply", autoReplyMessage);
          }
        }
        
      } catch (error) {
        console.error("startCustomerChat error:", error);
        socket.emit("error", { message: "Failed to start chat" });
      }
    });

    // Modified sendCustomerMessage to trigger auto-reply
    socket.on("sendCustomerMessage", async (data) => {
      try {
        const { chatId, senderId, receiverId, text, fileName, fileUrl } = data;
        
        // Save message to database
        const chat = await CustomerChat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }
        
        const message = await chat.appendMessage({
          senderId,
          text: text || "",
          fileUrl: fileUrl || null,
          fileName: fileName || null
        });
        
        // Broadcast to all in chat room
        const messageData = {
          ...message.toObject(),
          chatId,
          senderName: senderId === chat.storeId.toString() ? 'Store' : 'Customer'
        };
        
        io.to(`chat_${chatId}`).emit("receiveCustomerMessage", messageData);
        
        // Check for auto-reply if message is from customer and auto-reply is active
        const isCustomerMessage = senderId !== chat.storeId.toString();
        if (isCustomerMessage && chat.isAutoReplyActive && text) {
          setTimeout(async () => {
            const autoReply = await getAutoReplyForMessage(chat.storeId, text);
            
            if (autoReply) {
              const autoReplyMessage = {
                chatId,
                senderId: chat.storeId,
                text: autoReply.text,
                createdAt: new Date().toISOString(),
                isAutoReply: true,
                senderName: 'PrintEase Assistant'
              };
              
              // Save auto-reply
              await chat.appendMessage({
                senderId: chat.storeId,
                text: autoReply.text,
                isAutoReply: true
              });
              
              // Send to chat room
              io.to(`chat_${chatId}`).emit("receiveAutoReply", autoReplyMessage);
              
              // If escalation needed
              if (autoReply.escalateToHuman) {
                chat.isEscalated = true;
                chat.escalatedAt = new Date();
                await chat.save();
                
                io.to(`store_admins`).emit("chatEscalated", {
                  chatId,
                  customerId: senderId,
                  storeId: chat.storeId,
                  reason: "Customer requested human agent",
                  escalatedAt: new Date().toISOString()
                });
              }
            }
          }, 1000); // 1 second delay
        }
        
        // Emit sent confirmation
        socket.emit("customerMessageSent", messageData);
        
      } catch (error) {
        console.error("sendCustomerMessage error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // NEW: Toggle auto-reply for a chat (store admin can turn it on/off)
    socket.on("toggleAutoReply", async (data) => {
      try {
        const { chatId, isActive } = data;
        
        const chat = await CustomerChat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }
        
        chat.isAutoReplyActive = isActive;
        await chat.save();
        
        // Notify all participants
        io.to(`chat_${chatId}`).emit("autoReplyToggled", {
          chatId,
          isActive,
          updatedBy: socket.userId
        });
        
      } catch (error) {
        console.error("toggleAutoReply error:", error);
        socket.emit("error", { message: "Failed to toggle auto-reply" });
      }
    });

    // Existing disconnect handler
    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${socket.id}`);
      if (socket.userId) {
        userSockets.delete(`${socket.userId}`);
      }
      
      // Remove from chat rooms
      for (const [chatId, room] of chatRooms.entries()) {
        if (room.participants.includes(socket.userId)) {
          socket.leave(`chat_${chatId}`);
        }
      }
    });
  });

  return io;
};