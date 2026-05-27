const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/purchai';

const UserSchema = new mongoose.Schema({
  _id: String,
  email: String,
  password_hash: String,
  email_verified: Boolean,
  roles: [String],
  created_at: Date,
  updated_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const User = mongoose.model('User', UserSchema);

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find({});
    console.log(`\nTotal users: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user._id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Password Hash: ${user.password_hash}`);
        console.log(`  Email Verified: ${user.email_verified}`);
        console.log(`  Roles: ${user.roles.join(', ')}`);
        console.log(`  Created: ${user.created_at}`);
        console.log(`  Updated: ${user.updated_at}`);
        console.log('');
      });
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
