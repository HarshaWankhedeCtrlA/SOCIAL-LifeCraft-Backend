'use strict';

const mongoose = require('mongoose');

let socialConnection = null;
let masterConnection = null;

const options = {
  serverSelectionTimeoutMS: 30000,
  maxPoolSize: 10,
  family: 4,
};

async function connectDB() {
  try {
    // 1. Social DB
    socialConnection = await mongoose
      .createConnection(process.env.MONGO_URI, options)
      .asPromise();
    console.log(`✅ Social DB connected (${socialConnection.name})`);

    // 2. Master DB
    masterConnection = await mongoose
      .createConnection(process.env.MASTER_MONGO_URI, options)
      .asPromise();
    console.log(`✅ Master DB connected (${masterConnection.name})`);

    // Create indexes for social DB
    await createIndexes(socialConnection);

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
}

async function createIndexes(conn) {
  try {
    const db = conn.db;

    const collections = await db.listCollections({ name: 'posts' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('posts');
      console.log('✅ Posts collection created');
    }

    await db.collection('posts').createIndex({ communityId: 1, createdAt: -1 });
    await db.collection('posts').createIndex({ authorId: 1, createdAt: -1 });
    await db.collection('posts').createIndex({ tags: 1 });
    await db.collection('posts').createIndex({ status: 1 });
    await db.collection('posts').createIndex({ mentions: 1 });

    await db.collection('posts').createIndex(
      { title: 'text', content: 'text', tags: 'text' },
      {
        weights: { title: 10, tags: 5, content: 1 },
        name: 'TextSearchIndex',
      }
    );

    console.log('✅ Posts indexes created');
  } catch (error) {
    console.log('⚠️ Index creation warning:', error.message);
  }
}

function getSocialDB() {
  if (!socialConnection) throw new Error('Social DB not connected');
  return socialConnection;
}

function getMasterDB() {
  if (!masterConnection) throw new Error('Master DB not connected');
  return masterConnection;
}

async function disconnectDB() {
  if (socialConnection) await socialConnection.close();
  if (masterConnection) await masterConnection.close();
}

module.exports = { connectDB, disconnectDB, getSocialDB, getMasterDB };