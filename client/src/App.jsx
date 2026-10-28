import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const today = new Date().toISOString().slice(0, 10);

function Notice({ notice }) {
  return notice ? <div className={`notice ${notice.type || "success"}`}>{notice.text}</div> : null;
}

function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "faculty", rollNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const data = await api(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("attendance_token", data.token);
      localStorage.setItem("attendance_user", JSON.stringify(data.user));
      onSignedIn(data.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="intro">
      <div className="brand"><span className="brand-mark">✓</span> Attendly</div>
      <p className="eyebrow">SMART ATTENDANCE MANAGEMENT</p>
      <h1>Attendance that stays out of your way.</h1>
      <p className="intro-copy">A simple place for faculty to mark every period and for students to stay on top of their percentage.</p>
      <div className="feature-list">
        <span>◉ Subject-wise marking</span><span>◉ Low-attendance nudges</span><span>◉ One-click CSV reports</span>
      </div>
      <p className="demo-note">Start by creating one faculty and one student account. Faculty can then add a course and enrol the student.</p>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <div className="toggle"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button></div>
        <h2>{mode === "login" ? "Welcome back" : "Start simply"}</h2>
        <p className="muted">{mode === "login" ? "Pick up where you left off." : "Use a real email — faculty use it to enrol students."}</p>
        {error && <Notice notice={{ type: "error", text: error }} />}
        <form className="form" onSubmit={submit}>
          {mode === "register" && <><label>Name<input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" /></label><label>I am a<select value={form.role} onChange={(e) => set("role", e.target.value)}><option value="faculty">Faculty member</option><option value="student">Student</option></select></label></>}
          <label>Email<input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@college.edu" /></label>
          <label>Password<input type="password" required minLength="6" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 6 characters" /></label>
          {mode === "register" && form.role === "student" && <label>Roll number <small>(optional)</small><input value={form.rollNumber} onChange={(e) => set("rollNumber", e.target.value)} placeholder="e.g. CS-23-041" /></label>}
          <button className="primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
      </div>
    </section>
  </main>;
}

function Header({ user, onLogout }) {
  return <header className="topbar"><div className="brand"><span className="brand-mark">✓</span> Attendly</div><div className="user-menu"><span className="role-pill">{user.role}</span><span className="avatar">{user.name?.[0]}</span><span className="user-name">{user.name}</span><button className="link-button" onClick={onLogout}>Log out</button></div></header>;
}

function FacultyDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState("overview");
  const [courseForm, setCourseForm] = useState({ code: "", title: "" });
  const [studentEmail, setStudentEmail] = useState("");
  const [session, setSession] = useState({ date: today, period: "Period 1" });
  const [records, setRecords] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [threshold, setThreshold] = useState(75);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => courses.find((course) => course._id === selectedId) || courses[0], [courses, selectedId]);

  async function loadCourses() {
    try {
      const data = await api("/courses"); setCourses(data);
      if (!selectedId && data[0]) setSelectedId(data[0]._id);
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }
  useEffect(() => { loadCourses(); }, []);
  useEffect(() => {
    if (!selected) return;
    setRecords((old) => Object.fromEntries(selected.students.map((student) => [student._id, old[student._id] || "present"])));
  }, [selected?._id, selected?.students?.length]);
  const tell = (text, type = "success") => setNotice({ text, type });

  async function createCourse(event) {
    event.preventDefault(); setBusy(true);
    try { const course = await api("/courses", { method: "POST", body: JSON.stringify(courseForm) }); setCourses((old) => [...old, { ...course, students: [] }]); setSelectedId(course._id); setCourseForm({ code: "", title: "" }); tell("Course created. Enrol students to start marking attendance."); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  }
  async function enrol(event) {
    event.preventDefault(); if (!selected) return;
    setBusy(true);
    try { await api(`/courses/${selected._id}/enroll`, { method: "POST", body: JSON.stringify({ email: studentEmail }) }); setStudentEmail(""); await loadCourses(); tell("Student enrolled successfully."); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  }
  async function mark(event) {
    event.preventDefault(); if (!selected) return;
    setBusy(true);
    try { await api("/attendance/mark", { method: "POST", body: JSON.stringify({ courseId: selected._id, ...session, records: selected.students.map((student) => ({ student: student._id, status: records[student._id] || "absent" })) }) }); tell("Attendance saved for this period."); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  }
  async function loadAlerts() {
    setBusy(true); try { const data = await api(`/attendance/low-attendance?threshold=${threshold}`); setAlerts(data.alerts); setView("alerts"); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  }
  async function sendAlerts() {
    setBusy(true); try { const data = await api("/attendance/send-alerts", { method: "POST", body: JSON.stringify({ threshold }) }); tell(data.message); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  }
  async function deleteCourse(course) {
    if (!window.confirm(`Delete ${course.code} — ${course.title}? All attendance records for this course will also be deleted.`)) return;
    setBusy(true);
    try {
      await api(`/courses/${course._id}`, { method: "DELETE" });
      const remaining = courses.filter((item) => item._id !== course._id);
      setCourses(remaining);
      if (selectedId === course._id) setSelectedId(remaining[0]?._id || "");
      tell(`${course.code} deleted.`);
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  }
  async function removeStudent(student) {
    if (!selected) return;
    if (!window.confirm(`Remove ${student.name} from ${selected.code}? Their account and other courses are unaffected.`)) return;
    setBusy(true);
    try {
      const updated = await api(`/courses/${selected._id}/students/${student._id}`, { method: "DELETE" });
      setCourses((old) => old.map((course) => (course._id === updated._id ? updated : course)));
      tell(`${student.name} removed from ${selected.code}.`);
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  }
  async function downloadReport() {
    if (!selected) return tell("Choose a course first.", "error");
    try { const csv = await api(`/reports/course/${selected._id}.csv`); const link = document.createElement("a"); link.href = URL.createObjectURL(csv); link.download = `${selected.code}-attendance-report.csv`; link.click(); URL.revokeObjectURL(link.href); } catch (err) { tell(err.message, "error"); }
  }

  return <><Header user={user} onLogout={() => { localStorage.clear(); location.reload(); }} /><div className="shell">
    <aside className="sidebar"><p className="eyebrow">FACULTY SPACE</p><button className={view === "overview" ? "nav active" : "nav"} onClick={() => setView("overview")}>▦ Overview</button><button className={view === "mark" ? "nav active" : "nav"} onClick={() => setView("mark")}>✓ Mark attendance</button><button className={view === "alerts" ? "nav active" : "nav"} onClick={loadAlerts}>◔ Alerts</button><div className="sidebar-tip">Keep it simple: one course, one period, one mark at a time.</div></aside>
    <main className="content"><Notice notice={notice} />
      {view === "overview" && <>
        <section className="page-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Good day, {user.name.split(" ")[0]}.</h1><p>Set up subjects, add students, and keep each period accounted for.</p></div><button className="primary" onClick={() => setView("mark")}>+ Mark a period</button></section>
        <div className="stat-grid"><article className="stat"><span>Courses</span><strong>{courses.length}</strong><small>Your active subjects</small></article><article className="stat"><span>Students</span><strong>{courses.reduce((sum, course) => sum + course.students.length, 0)}</strong><small>Across all courses</small></article><article className="stat"><span>Alert level</span><strong>{threshold}%</strong><small>Attendance threshold</small></article></div>
        <div className="two-column"><section className="card"><h2>Create a course</h2><p className="muted">This is the subject you teach.</p><form className="form compact" onSubmit={createCourse}><label>Course code<input required value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="e.g. CS201" /></label><label>Course title<input required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. Database Systems" /></label><button className="primary" disabled={busy}>Create course</button></form></section>
        <section className="card"><h2>Your courses</h2>{courses.length ? <div className="course-list">{courses.map((course) => <div key={course._id} className="course-row"><button type="button" className="course-open" onClick={() => { setSelectedId(course._id); setView("mark"); }}><span className="course-icon">⌁</span><span><b>{course.code}</b><small>{course.title}</small></span><em>{course.students.length} students</em></button><button type="button" className="danger-link" onClick={() => deleteCourse(course)} disabled={busy}>Delete</button></div>)}</div> : <Empty text="No course yet. Add your first subject on the left." />}</section></div>
      </>}
      {view === "mark" && <>
        <section className="page-heading"><div><p className="eyebrow">PERIOD ATTENDANCE</p><h1>Mark the room.</h1><p>Saving the same course, date and period updates that record.</p></div></section>
        <section className="card attendance-card"><div className="toolbar"><label>Course<select value={selected?._id || ""} onChange={(e) => setSelectedId(e.target.value)}>{courses.length ? courses.map((course) => <option key={course._id} value={course._id}>{course.code} — {course.title}</option>) : <option>Add a course first</option>}</select></label><label>Date<input type="date" value={session.date} onChange={(e) => setSession({ ...session, date: e.target.value })} /></label><label>Period<input value={session.period} onChange={(e) => setSession({ ...session, period: e.target.value })} /></label></div>
          {!selected ? <Empty text="Create a course, then come back here to take attendance." /> : !selected.students.length ? <div className="empty"><p>No students enrolled yet.</p><form className="inline-form" onSubmit={enrol}><input type="email" required value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="student@college.edu" /><button className="primary" disabled={busy}>Enrol student</button></form><small>Students must create an account first.</small></div> : <form onSubmit={mark}><div className="roster-header"><span>{selected.students.length} students</span><button type="button" className="text-action" onClick={() => setRecords(Object.fromEntries(selected.students.map((student) => [student._id, "present"])))}>Mark all present</button></div><div className="roster">{selected.students.map((student) => <div className="student-row" key={student._id}><span className="avatar blue">{student.name[0]}</span><span><b>{student.name}</b><small>{student.rollNumber || student.email}</small></span><div className="segmented"><button type="button" className={records[student._id] === "present" ? "selected present" : ""} onClick={() => setRecords({ ...records, [student._id]: "present" })}>Present</button><button type="button" className={records[student._id] === "absent" ? "selected absent" : ""} onClick={() => setRecords({ ...records, [student._id]: "absent" })}>Absent</button></div><button type="button" className="remove-student" onClick={() => removeStudent(student)} disabled={busy}>Remove</button></div>)}</div><button className="primary" disabled={busy}>Save attendance</button></form>}</section>
        {selected && <section className="card narrow-card"><h3>Add another student</h3><form className="inline-form" onSubmit={enrol}><input type="email" required value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Student account email" /><button className="secondary" disabled={busy}>Enrol</button></form></section>}
      </>}
      {view === "alerts" && <>
        <section className="page-heading"><div><p className="eyebrow">STUDENT SUPPORT</p><h1>Low-attendance alerts.</h1><p>Review students below the threshold, then send email reminders.</p></div></section>
        <section className="card"><div className="alert-tools"><label>Flag below <input type="number" min="1" max="100" value={threshold} onChange={(e) => setThreshold(e.target.value)} />%</label><button className="secondary" onClick={loadAlerts} disabled={busy}>Refresh list</button><button className="primary" onClick={sendAlerts} disabled={busy}>Send email alerts</button></div><p className="muted small-gap">Email sends only after SMTP is set in the server <code>.env</code>; otherwise this safely previews alerts in the server log.</p>{alerts.length ? <div className="alert-list">{alerts.map((alert, index) => <div className="alert-row" key={`${alert.student._id}-${alert.courseId}-${index}`}><span className="avatar warn">!</span><span><b>{alert.student.name}</b><small>{alert.student.rollNumber || alert.student.email} · {alert.code}</small></span><strong>{alert.percentage}%</strong></div>)}</div> : <Empty text="No low-attendance students at this threshold, or select Refresh list to check." />}</section>
        <section className="card report-card"><div><h2>Export report</h2><p className="muted">Download a course-wise attendance summary as CSV.</p></div><div className="report-controls"><select value={selected?._id || ""} onChange={(e) => setSelectedId(e.target.value)}><option value="">Choose course</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.code}</option>)}</select><button className="secondary" onClick={downloadReport}>↓ Download CSV</button></div></section>
      </>}
    </main>
  </div></>;
}

function StudentDashboard({ user }) {
  const [dashboard, setDashboard] = useState({ subjects: [], overall: { present: 0, total: 0, percentage: 0 } });
  const [error, setError] = useState("");
  useEffect(() => { api("/attendance/dashboard").then(setDashboard).catch((err) => setError(err.message)); }, []);
  const status = dashboard.overall.percentage >= 75 ? "On track" : dashboard.overall.total ? "Needs attention" : "Getting started";
  return <><Header user={user} onLogout={() => { localStorage.clear(); location.reload(); }} /><main className="student-page"><Notice notice={error ? { type: "error", text: error } : null} /><section className="student-hero"><div><p className="eyebrow">STUDENT DASHBOARD</p><h1>Hello, {user.name.split(" ")[0]}.</h1><p>Here is your attendance at a glance.</p></div><div className={`attendance-ring ${dashboard.overall.percentage < 75 && dashboard.overall.total ? "low" : ""}`} style={{ "--progress": dashboard.overall.percentage }}><strong>{dashboard.overall.percentage}%</strong><span>overall</span></div></section>
  <section className="summary-strip"><div><span>Classes attended</span><b>{dashboard.overall.present} / {dashboard.overall.total}</b></div><div><span>Attendance status</span><b className={dashboard.overall.percentage < 75 && dashboard.overall.total ? "danger-text" : "good-text"}>{status}</b></div><div><span>Target</span><b>75%</b></div></section>
  <section className="subject-section"><div className="section-title"><div><p className="eyebrow">BY SUBJECT</p><h2>Your attendance</h2></div><span className="muted">Updates after faculty saves each period</span></div>{dashboard.subjects.length ? <div className="subject-grid">{dashboard.subjects.map((subject) => <article className="subject-card" key={subject.courseId}><div className="subject-top"><span className="course-icon">⌁</span><span className={subject.percentage < 75 && subject.total ? "badge low-badge" : "badge"}>{subject.percentage < 75 && subject.total ? "Below target" : "On track"}</span></div><p className="course-code">{subject.code}</p><h3>{subject.title}</h3><div className="meter"><i style={{ width: `${subject.percentage}%` }} className={subject.percentage < 75 && subject.total ? "low-fill" : ""} /></div><div className="subject-percent"><strong>{subject.percentage}%</strong><span>{subject.present} of {subject.total} classes</span></div></article>)}</div> : <Empty text="You are not enrolled in a course yet. Ask your faculty to add your account email to their course." />}</section></main></>;
}

function Empty({ text }) { return <div className="empty"><span>⌁</span><p>{text}</p></div>; }

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("attendance_user")); } catch { return null; } });
  return user ? user.role === "faculty" ? <FacultyDashboard user={user} /> : <StudentDashboard user={user} /> : <AuthScreen onSignedIn={setUser} />;
}
