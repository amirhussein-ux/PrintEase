require("dotenv").config();
const mongoose = require('mongoose');
const InventoryItem = require('./models/inventoryItemModel');

async function fixMaxStockValues() {
  try {
    console.log('🚀 Starting maxStock correction migration...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/PrintEase';
    
    console.log('🔗 Connecting to database...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');
    
    // Find items where current amount > maxStock
    const items = await InventoryItem.find({
      $expr: { $gt: ["$amount", "$maxStock"] }
    });
    
    console.log(`📊 Found ${items.length} items where amount > maxStock`);
    
    if (items.length === 0) {
      console.log('✅ No corrections needed! All items have maxStock ≥ amount');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    let fixedCount = 0;
    
    for (const item of items) {
      console.log(`🔄 Fixing: "${item.name}"`);
      console.log(`   Current: ${item.amount}, MaxStock: ${item.maxStock} → ${item.amount}`);
      
      // Update maxStock to match current amount
      item.maxStock = item.amount;
      await item.save();
      
      fixedCount++;
      
      if (fixedCount % 5 === 0) {
        console.log(`📈 Fixed ${fixedCount} items...`);
      }
    }
    
    console.log(`🎉 Correction complete! Fixed ${fixedCount} inventory items`);
    
    // Show summary
    console.log('\n📋 Summary of corrections:');
    const correctedItems = await InventoryItem.find({
      _id: { $in: items.map(i => i._id) }
    });
    
    correctedItems.forEach(item => {
      console.log(`   • ${item.name}: now maxStock = ${item.maxStock}`);
    });
    
    // Verify no more inconsistencies
    const remaining = await InventoryItem.find({
      $expr: { $gt: ["$amount", "$maxStock"] }
    });
    
    if (remaining.length === 0) {
      console.log('✅ Verification passed! No items have amount > maxStock');
    } else {
      console.log(`⚠️  Still have ${remaining.length} items with issues`);
    }
    
    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    
    console.log('\n💡 Recommendation:');
    console.log('1. The frontend already has defensive Math.max() logic');
    console.log('2. Run this migration whenever stock levels change significantly');
    console.log('3. Consider adding periodic cleanup in your application');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run correction
fixMaxStockValues();