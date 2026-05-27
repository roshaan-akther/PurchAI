import mongoose, { Schema, Model } from 'mongoose';

interface ISession {
  id: string;
  user_id: string; // References User._id (string like "user_0")
  expires_at: Date;
  user_agent: string | null;
  ip_address: string | null;
  revoked: boolean;
  created_at: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
    },
    user_agent: {
      type: String,
      default: null,
    },
    ip_address: {
      type: String,
      default: null,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Index for efficient session lookups
SessionSchema.index({ expires_at: 1, revoked: 1 });

// Prevent model recompilation during hot reloads in development
const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
