// Express routes file: creates downloadable CSV attendance reports.
import express from "express";
import Attendance from "../models/Attendance.js";
import Course from "../models/Course.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allowRoles("faculty"));

// Creates a downloadable CSV report for one faculty-owned course.
router.get("/course/:courseId.csv", async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, faculty: req.user.id }).populate("students", "name email rollNumber");
    if (!course) return res.status(404).json({ message: "Course not found." });
    const filter = { course: course._id };
    if (req.query.from || req.query.to) filter.date = { ...(req.query.from && { $gte: req.query.from }), ...(req.query.to && { $lte: req.query.to }) };
    const sessions = await Attendance.find(filter).sort({ date: 1, period: 1 }).lean();
    const header = ["Roll number", "Student", "Email", "Present", "Classes held", "Percentage"];
    const rows = course.students.map((student) => {
      let present = 0;
      let total = 0;
      for (const session of sessions) {
        const record = session.records.find((item) => String(item.student) === String(student._id));
        if (record) { total += 1; if (record.status === "present") present += 1; }
      }
      return [student.rollNumber || "", student.name, student.email, present, total, total ? `${Math.round((present / total) * 100)}%` : "0%"];
    });
    const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${course.code}-attendance-report.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
