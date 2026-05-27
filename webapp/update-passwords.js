const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

async function updateAllPasswords() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Hash the password "123"
    const password = '123';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`Generated password hash for "123": ${passwordHash}`);
    
    // Update all users
    const result = await User.updateMany(
      {},
      { $set: { password_hash: passwordHash } }
    );
    
    console.log(`\nUpdated ${result.modifiedCount} users`);
    console.log('All users now have password: "123"');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAllPasswords();
