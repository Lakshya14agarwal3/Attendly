import express from "express";
import nodemailer from "nodemailer";
import Attendance from "../models/Attendance.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { allowRoles, protect } from "../middleware/auth.js";
import { studentSummary } from "../services/summary.js";

const router = express.Router();
router.use(protect);

router.get("/course/:courseId", allowRoles("faculty"), async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, faculty: req.user.id }).populate("students", "name email rollNumber");
  if (!course) return res.status(404).json({ message: "Course not found." });
  res.json(course.students);
});

router.post("/mark", allowRoles("faculty"), async (req, res) => {
  try {
    const { courseId, date, period, records } = req.body;
    const course = await Course.findOne({ _id: courseId, faculty: req.user.id });
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!date || !period || !Array.isArray(records) || !records.length) return res.status(400).json({ message: "Date, period and at least one student record are required." });

    const allowed = new Set(course.students.map(String));
    const cleanRecords = records
      .filter((record) => allowed.has(String(record.student)) && ["present", "absent"].includes(record.status))
      .map((record) => ({ student: record.student, status: record.status }));
    if (cleanRecords.length !== course.students.length) return res.status(400).json({ message: "Mark every enrolled student before saving." });

    const attendance = await Attendance.findOneAndUpdate(
      { course: courseId, date, period },
      { course: courseId, date, period, records: cleanRecords },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ message: "Attendance saved.", attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/dashboard", allowRoles("student"), async (req, res) => {
  try {
    const subjects = await studentSummary(req.user.id);
    const overall = subjects.reduce((acc, item) => ({ present: acc.present + item.present, total: acc.total + item.total }), { present: 0, total: 0 });
    res.json({ subjects, overall: { ...overall, percentage: overall.total ? Math.round((overall.present / overall.total) * 100) : 0 } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/low-attendance", allowRoles("faculty"), async (req, res) => {
  try {
    const threshold = Math.min(100, Math.max(1, Number(req.query.threshold) || 75));
    const courses = await Course.find({ faculty: req.user.id }).populate("students", "name email rollNumber");
    const courseIds = new Set(courses.map((course) => String(course._id)));
    const students = new Map();
    for (const course of courses) for (const student of course.students) students.set(String(student._id), student);
    const alerts = [];
    for (const student of students.values()) {
      const subjects = (await studentSummary(student._id)).filter((subject) => courseIds.has(String(subject.courseId)));
      for (const subject of subjects) {
        if (subject.total && subject.percentage < threshold) alerts.push({ student, ...subject });
      }
    }
    res.json({ threshold, alerts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/send-alerts", allowRoles("faculty"), async (req, res) => {
  try {
    const threshold = Math.min(100, Math.max(1, Number(req.body.threshold) || 75));
    const courses = await Course.find({ faculty: req.user.id }).populate("students", "name email");
    const courseIds = new Set(courses.map((course) => String(course._id)));
    const students = new Map();
    for (const course of courses) for (const student of course.students) students.set(String(student._id), student);
    const messages = [];
    for (const student of students.values()) {
      const subjects = (await studentSummary(student._id)).filter((subject) => courseIds.has(String(subject.courseId)) && subject.total && subject.percentage < threshold);
      if (subjects.length) messages.push({ student, subjects });
    }

    if (process.env.SMTP_HOST && messages.length) {
      const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
      await Promise.all(messages.filter(({ student }) => student.email).map(({ student, subjects }) => transporter.sendMail({
        from: process.env.ALERT_FROM || process.env.SMTP_USER,
        to: student.email,
        subject: "Low attendance alert",
        text: `Hi ${student.name}, your attendance is below ${threshold}% in: ${subjects.map((s) => `${s.code} (${s.percentage}%)`).join(", ")}. Please contact your faculty.`
      })));
      return res.json({ message: `Email alerts sent to ${messages.length} student(s).`, sent: messages.length, mode: "email" });
    }
    console.log("Low-attendance email alerts (SMTP not configured):", messages.map(({ student, subjects }) => ({ to: student.email, subjects })));
    res.json({ message: `${messages.length} email alert(s) prepared. Add SMTP credentials to send them.`, sent: messages.length, mode: "preview" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
