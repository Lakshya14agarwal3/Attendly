import express from "express";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const filter = req.user.role === "faculty" ? { faculty: req.user.id } : { students: req.user.id };
    const courses = await Course.find(filter)
      .populate("faculty", "name email")
      .populate("students", "name email rollNumber")
      .sort({ code: 1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", allowRoles("faculty"), async (req, res) => {
  try {
    const { code, title } = req.body;
    if (!code || !title) return res.status(400).json({ message: "Course code and title are required." });
    const course = await Course.create({ code, title, faculty: req.user.id });
    res.status(201).json(course);
  } catch (error) {
    const message = error.code === 11000 ? "You already created a course with that code." : error.message;
    res.status(400).json({ message });
  }
});

router.post("/:courseId/enroll", allowRoles("faculty"), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, faculty: req.user.id });
    if (!course) return res.status(404).json({ message: "Course not found." });
    const student = await User.findOne({ email: req.body.email?.toLowerCase(), role: "student" });
    if (!student) return res.status(404).json({ message: "No student account exists with that email." });
    if (!course.students.some((id) => id.equals(student._id))) course.students.push(student._id);
    await course.save();
    await course.populate("students", "name email rollNumber");
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
