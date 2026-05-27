import mongoose, { Schema, Model, Types } from 'mongoose';

interface IUserPreferences {
  primary_category: string;
  primary_sub_category: string;
  preferred_brands: string[];
  price_range_preference: 'low' | 'medium' | 'high';
  brand_loyalty: number;
  category_affinity: number;
  purchase_frequency: 'low' | 'medium' | 'high';
}

interface IPurchase {
  product_id: string;
  timestamp: Date;
  quantity: number;
  event_type: string;
}

interface IUser {
  _id: string; // Custom string ID like "user_0", "user_1"
  email: string;
  password_hash: string;
  email_verified: boolean;
  roles: string[];
  failed_login_attempts: number;
  locked_until: Date | null;
  preferences?: IUserPreferences;
  purchase_history?: IPurchase[];
  created_at: Date;
  updated_at: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    primary_category: { type: String, required: true },
    primary_sub_category: { type: String, required: true },
    preferred_brands: { type: [String], default: [] },
    price_range_preference: { 
      type: String, 
      enum: ['low', 'medium', 'high'],
      required: true 
    },
    brand_loyalty: { type: Number, required: true },
    category_affinity: { type: Number, required: true },
    purchase_frequency: { 
      type: String, 
      enum: ['low', 'medium', 'high'],
      required: true 
    },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    product_id: { type: String, required: true },
    timestamp: { type: Date, required: true },
    quantity: { type: Number, required: true },
    event_type: { type: String, required: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: false,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    roles: {
      type: [String],
      default: ['user'],
    },
    failed_login_attempts: {
      type: Number,
      default: 0,
    },
    locked_until: {
      type: Date,
      default: null,
    },
    preferences: {
      type: UserPreferencesSchema,
      default: null,
    },
    purchase_history: {
      type: [PurchaseSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ "preferences.primary_category": 1 });
UserSchema.index({ "preferences.preferred_brands": 1 });
UserSchema.index({ "preferences.brand_loyalty": -1 });
UserSchema.index({ "preferences.category_affinity": -1 });
UserSchema.index({ "purchase_history.product_id": 1 });
UserSchema.index({ "purchase_history.timestamp": -1 });
UserSchema.index({ 
  "preferences.primary_category": 1, 
  "preferences.price_range_preference": 1 
});

// Prevent model recompilation during hot reloads in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
