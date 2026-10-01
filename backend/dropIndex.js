const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    const collection = db.collection('apikeys');
    
    console.log('Dropping keyHash_1 index...');
    await collection.dropIndex('keyHash_1');
    console.log('Index dropped successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
