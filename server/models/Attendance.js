// MongoDB Mongoose model file: defines the Attendance collection.
import mongoose from "mongoose";

// Stores attendance for one course on one date and one period.
const attendanceSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    date: { type: String, required: true },
    period: { type: String, required: true, trim: true },
    records: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["present", "absent"], required: true }
      }
    ]
  },
  { timestamps: true }
);

// Keeps only one attendance sheet for the same course, date, and period.
attendanceSchema.index({ course: 1, date: 1, period: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
