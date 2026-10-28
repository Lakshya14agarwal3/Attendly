import mongoose from "mongoose";

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

attendanceSchema.index({ course: 1, date: 1, period: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
