// Express routes file: handles course creation, listing, and student enrolment.
import express from "express";
import Attendance from "../models/Attendance.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { allowRoles, protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

// Returns courses taught by faculty or enrolled by a student.
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

// Lets faculty create a new course.
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

router.delete("/:courseId", allowRoles("faculty"), async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.courseId, faculty: req.user.id });
    if (!course) return res.status(404).json({ message: "Course not found." });
    await Attendance.deleteMany({ course: course._id });
    res.json({ message: `${course.code} and its attendance records were deleted.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:courseId/students/:studentId", allowRoles("faculty"), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, faculty: req.user.id });
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!course.students.some((id) => id.equals(req.params.studentId))) {
      return res.status(404).json({ message: "Student is not enrolled in this course." });
    }

    course.students.pull(req.params.studentId);
    await course.save();
    await Attendance.updateMany(
      { course: course._id, "records.student": req.params.studentId },
      { $pull: { records: { student: req.params.studentId } } }
    );
    await course.populate("students", "name email rollNumber");
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Adds an existing student account to a faculty member's course.
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
