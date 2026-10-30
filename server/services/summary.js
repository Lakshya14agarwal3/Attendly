// Node.js backend helper file: calculates attendance summaries for students.
import Attendance from "../models/Attendance.js";
import Course from "../models/Course.js";

// Calculates present classes, total classes, and percentage for one student.
export async function studentSummary(studentId) {
  const courses = await Course.find({ students: studentId }).select("code title").lean();
  const rows = await Attendance.find({ "records.student": studentId }).lean();

  const byCourse = new Map(courses.map((course) => [String(course._id), { course, present: 0, total: 0 }]));
  for (const row of rows) {
    const entry = byCourse.get(String(row.course));
    const record = row.records.find((item) => String(item.student) === String(studentId));
    if (entry && record) {
      entry.total += 1;
      if (record.status === "present") entry.present += 1;
    }
  }
  return [...byCourse.values()].map(({ course, present, total }) => ({
    courseId: course._id,
    code: course.code,
    title: course.title,
    present,
    total,
    percentage: total ? Math.round((present / total) * 100) : 0
  }));
}
