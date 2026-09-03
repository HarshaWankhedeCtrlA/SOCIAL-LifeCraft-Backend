const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  
    await createIndexes();
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections({ name: 'posts' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('posts');
      console.log('✅ Posts collection created');
    }
    
    // ✅ Create indexes safely
    await db.collection('posts').createIndex({ communityId: 1, createdAt: -1 });
    await db.collection('posts').createIndex({ authorId: 1, createdAt: -1 });
    await db.collection('posts').createIndex({ tags: 1 });
    await db.collection('posts').createIndex({ status: 1 });
    await db.collection('posts').createIndex({ mentions: 1 });
    
    // Text search index
    await db.collection('posts').createIndex(
      { title: 'text', content: 'text', tags: 'text' },
      { 
        weights: { title: 10, tags: 5, content: 1 },
        name: 'TextSearchIndex'
      }
    );
    
    console.log('✅ Posts indexes created successfully');
  } catch (error) {
    console.log('⚠️ Index creation warning:', error.message);
  }
};

module.exports = connectDB;