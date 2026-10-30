// Node.js backend file: connects the app to MongoDB using Mongoose.
import mongoose from "mongoose";

// Connects the Express server to the MongoDB database from the .env file.
export async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}
