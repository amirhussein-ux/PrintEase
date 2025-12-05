const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  storeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PrintStore', 
    required: true 
  },
  question: { 
    type: String, 
    required: true 
  },
  answer: { 
    type: String, 
    required: true 
  },
  keywords: [{ 
    type: String 
  }], // e.g., ["cancel", "cancellation", "refund"]
  triggers: [{ 
    type: String 
  }], // exact trigger words
  order: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  category: { 
    type: String, 
    enum: ['general', 'order', 'payment', 'delivery', 'design', 'cancellation', 'refund'], 
    default: 'general' 
  },
  usageCount: { 
    type: Number, 
    default: 0 
  },
  lastUsed: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('FAQ', faqSchema);