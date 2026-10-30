// MongoDB Mongoose model file: defines the Course collection.
import mongoose from "mongoose";

// Stores one subject, its faculty member, and its enrolled students.
const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

// Prevents the same faculty member from creating the same course code twice.
courseSchema.index({ code: 1, faculty: 1 }, { unique: true });

export default mongoose.model("Course", courseSchema);
