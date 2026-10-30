// Node.js and Express backend file: starts the API server and connects its routes.
import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import attendanceRoutes from "./routes/attendance.js";
import reportRoutes from "./routes/reports.js";

const app = express();
// Allows the React client to send requests to this API.
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);

// Starts the API only after MongoDB connects successfully.
const port = process.env.PORT || 5000;
connectDatabase().then(() => app.listen(port, () => console.log(`API running at http://localhost:${port}`)));
