const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/Admin');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function test() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log('Connected to memory DB');

  // 1. Create a user
  const user = new Admin({
    email: 'mod@example.com',
    passwordHash: 'secret123',
    role: 'moderator'
  });
  await user.save();
  console.log('User created, passwordHash in DB:', user.passwordHash);

  // 2. Fetch user to verify hash
  const fetchedUser = await Admin.findOne({ email: 'mod@example.com' }).select('+passwordHash');
  console.log('Fetched user hash:', fetchedUser.passwordHash);
  
  const isMatch1 = await fetchedUser.comparePassword('secret123');
  console.log('Does secret123 match?', isMatch1);

  // 3. Force change password
  fetchedUser.passwordHash = 'new_secret456';
  await fetchedUser.save();
  console.log('Password forced changed');

  // 4. Verify new hash
  const fetchedUser2 = await Admin.findOne({ email: 'mod@example.com' }).select('+passwordHash');
  console.log('Fetched user hash 2:', fetchedUser2.passwordHash);
  
  const isMatch2 = await fetchedUser2.comparePassword('new_secret456');
  console.log('Does new_secret456 match?', isMatch2);

  await mongoose.disconnect();
  process.exit(0);
}

test();
