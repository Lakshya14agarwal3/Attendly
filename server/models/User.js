// MongoDB Mongoose model file: defines the User collection.
import mongoose from "mongoose";

// Stores login details and the faculty or student role for each user.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["faculty", "student"], required: true },
    rollNumber: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
