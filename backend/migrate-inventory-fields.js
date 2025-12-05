// backend/migrate-inventory-fields.js
require("dotenv").config();
const mongoose = require('mongoose');
const InventoryItem = require('./models/inventoryItemModel');

async function migrateInventoryFields() {
  try {
    console.log('🚀 Starting inventory migration...');
    
    // Use the same MONGODB_URI from your .env
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/PrintEase';
    
    console.log('🔗 Connecting to database...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');
    
    // Get all inventory items
    const items = await InventoryItem.find({});
    console.log(`📊 Found ${items.length} inventory items to migrate`);
    
    if (items.length === 0) {
      console.log('📭 No inventory items found to migrate');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    let updatedCount = 0;
    
    for (const item of items) {
      // For existing items:
      // - initialStock = current amount (best guess)
      // - maxStock = current amount (will update when restocked)
      // - unit = 'units' (default)
      
      const updateData = {
        initialStock: item.amount,
        maxStock: item.amount,
        unit: 'units'
      };
      
      await InventoryItem.updateOne(
        { _id: item._id },
        { $set: updateData }
      );
      
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`🔄 Migrated ${updatedCount} items...`);
      }
    }
    
    console.log(`🎉 Migration complete! Updated ${updatedCount} inventory items`);
    console.log('📝 New fields added: initialStock, maxStock, unit');
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const sampleItem = await InventoryItem.findOne({});
    if (sampleItem) {
      console.log('✅ Sample item after migration:');
      console.log(`   Name: ${sampleItem.name}`);
      console.log(`   Amount: ${sampleItem.amount}`);
      console.log(`   InitialStock: ${sampleItem.initialStock}`);
      console.log(`   MaxStock: ${sampleItem.maxStock}`);
      console.log(`   Unit: ${sampleItem.unit}`);
    }
    
    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    
    console.log('\n📋 Next steps:');
    console.log('1. ✅ Update TypeScript interface in dashboard');
    console.log('2. ✅ Update frontend data processing');
    console.log('3. ✅ Start your backend server');
    console.log('4. ✅ Test the dashboard inventory display');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateInventoryFields();