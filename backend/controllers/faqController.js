const FAQ = require('../models/faqModel');

// Get all FAQs for a store with filtering options
exports.getFAQsByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { category, activeOnly } = req.query;
    
    let query = { storeId };
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const faqs = await FAQ.find(query).sort({ order: 1, createdAt: -1 });
    
    // Get stats for the store
    const totalFAQs = await FAQ.countDocuments({ storeId });
    const activeFAQs = await FAQ.countDocuments({ storeId, isActive: true });
    const categories = await FAQ.distinct('category', { storeId });
    
    res.json({
      success: true,
      faqs,
      totalFAQs,
      activeFAQs,
      categories: categories.filter(c => c) // Remove null/undefined
    });
  } catch (error) {
    console.error('Error getting FAQs by store:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch FAQs',
      error: error.message 
    });
  }
};

// Create a new FAQ
exports.createFAQ = async (req, res) => {
  try {
    const { storeId, question, answer, keywords, triggers, category, order, isActive } = req.body;
    
    // Validate required fields
    if (!storeId || !question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'storeId, question, and answer are required'
      });
    }
    
    // Parse keywords and triggers if they're strings
    const keywordsArray = Array.isArray(keywords) 
      ? keywords 
      : (keywords || '').split(',').map(k => k.trim()).filter(k => k);
    
    const triggersArray = Array.isArray(triggers)
      ? triggers
      : (triggers || '').split(',').map(t => t.trim()).filter(t => t);
    
    // Create the FAQ
    const faq = await FAQ.create({
      storeId,
      question: question.trim(),
      answer: answer.trim(),
      keywords: keywordsArray,
      triggers: triggersArray,
      category: category || 'general',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      faq
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create FAQ',
      error: error.message 
    });
  }
};

// Update an FAQ
exports.updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if FAQ exists
    const existingFAQ = await FAQ.findById(id);
    if (!existingFAQ) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    // Parse keywords and triggers if they're strings
    if (updateData.keywords && typeof updateData.keywords === 'string') {
      updateData.keywords = updateData.keywords.split(',').map(k => k.trim()).filter(k => k);
    }
    
    if (updateData.triggers && typeof updateData.triggers === 'string') {
      updateData.triggers = updateData.triggers.split(',').map(t => t.trim()).filter(t => t);
    }
    
    // Update the FAQ
    const faq = await FAQ.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'FAQ updated successfully',
      faq
    });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update FAQ',
      error: error.message 
    });
  }
};

// Delete an FAQ
exports.deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    
    const faq = await FAQ.findByIdAndDelete(id);
    
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete FAQ',
      error: error.message 
    });
  }
};

// Toggle FAQ active status
exports.toggleFAQActive = async (req, res) => {
  try {
    const { id } = req.params;
    
    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    faq.isActive = !faq.isActive;
    await faq.save();
    
    res.json({
      success: true,
      message: `FAQ ${faq.isActive ? 'activated' : 'deactivated'} successfully`,
      faq
    });
  } catch (error) {
    console.error('Error toggling FAQ status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to toggle FAQ status',
      error: error.message 
    });
  }
};

// Match FAQ for a message (used by chat system)
exports.matchFAQ = async (req, res) => {
  try {
    const { storeId, message } = req.body;
    
    if (!storeId || !message) {
      return res.status(400).json({
        success: false,
        message: 'storeId and message are required'
      });
    }
    
    const normalizedMessage = message.toLowerCase().trim();
    
    // First check for exact triggers
    const exactMatch = await FAQ.findOne({
      storeId,
      isActive: true,
      triggers: { $in: [normalizedMessage] }
    });
    
    if (exactMatch) {
      // Increment usage count
      exactMatch.usageCount = (exactMatch.usageCount || 0) + 1;
      exactMatch.lastUsed = new Date();
      await exactMatch.save();
      
      return res.json({
        success: true,
        match: exactMatch,
        type: 'exact'
      });
    }
    
    // Then check for keyword matches
    const faqs = await FAQ.find({ 
      storeId, 
      isActive: true,
      keywords: { $exists: true, $ne: [] }
    });
    
    const keywordMatches = faqs.filter(faq => {
      if (!faq.keywords || !faq.keywords.length) return false;
      
      return faq.keywords.some(keyword => {
        const normalizedKeyword = keyword.toLowerCase();
        return normalizedMessage.includes(normalizedKeyword);
      });
    });
    
    // Return the best match (highest keyword count)
    if (keywordMatches.length > 0) {
      const bestMatch = keywordMatches.reduce((best, current) => {
        if (!best) return current;
        const bestScore = best.keywords?.length || 0;
        const currentScore = current.keywords?.length || 0;
        return currentScore > bestScore ? current : best;
      }, null);
      
      if (bestMatch) {
        // Increment usage count for best match
        bestMatch.usageCount = (bestMatch.usageCount || 0) + 1;
        bestMatch.lastUsed = new Date();
        await bestMatch.save();
        
        return res.json({
          success: true,
          match: bestMatch,
          type: 'keyword',
          allMatches: keywordMatches
        });
      }
    }
    
    res.json({
      success: true,
      match: null,
      message: 'No matching FAQ found'
    });
  } catch (error) {
    console.error('Error matching FAQ:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to match FAQ',
      error: error.message 
    });
  }
};