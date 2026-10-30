// Express routes file: handles user registration, login, and profile requests.
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Creates a JWT token after registration or login.
function tokenFor(user) {
  return jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Creates a new faculty or student account.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, rollNumber } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: "Name, email, password and role are required." });
    if (!["faculty", "student"].includes(role)) return res.status(400).json({ message: "Role must be faculty or student." });
    if (await User.findOne({ email })) return res.status(409).json({ message: "An account with this email already exists." });

    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role, rollNumber });
    res.status(201).json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, rollNumber: user.rollNumber } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Checks email and password, then returns a login token.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(401).json({ message: "Invalid email or password." });
    res.json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, rollNumber: user.rollNumber } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
