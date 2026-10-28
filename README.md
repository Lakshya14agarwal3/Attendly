# SmartAttend

SmartAttend is a lightweight attendance management application for colleges and small departments. Faculty can create a subject, enrol students, mark attendance for a particular date and period, and download a course report. Students get a simple dashboard showing their attendance percentage for each subject.

The project is intentionally focused on the day-to-day attendance workflow instead of trying to be a complete college ERP system.

## What it does

- Separate faculty and student accounts
- Subject/course creation by faculty
- Student enrolment using the student's registered email address
- Subject-wise and period-wise attendance marking
- Updating an existing period record instead of creating duplicates
- Student dashboard with course-wise and overall attendance percentage
- Low-attendance list based on a configurable threshold
- Email alerts for students below the threshold
- CSV attendance report export for each course

## Built with

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens and bcrypt |
| Email | Nodemailer with SMTP |

## Project structure

```text
SmartAttend/
├── client/                 # React application
│   └── src/
│       ├── App.jsx         # Screens and dashboard UI
│       ├── api.js          # API helper
│       └── styles.css      # Application styles
├── server/                 # Express API
│   ├── config/             # Database connection
│   ├── middleware/         # JWT and role checks
│   ├── models/             # User, Course and Attendance models
│   ├── routes/             # API routes
│   ├── services/           # Attendance summary helper
│   └── .env.example        # Environment variable template
└── package.json            # Root scripts
```

## Prerequisites

Install these before running the project:

- [Node.js](https://nodejs.org/) 18 or newer
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- An SMTP account only if you want real email alerts

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/Lakshya14agarwal3/SmartAttend.git
cd SmartAttend
```

### 2. Install dependencies

This installs packages for the root, API, and React client in one command.

```bash
npm run install-all
```

### 3. Configure the server

Copy the example file:

```powershell
cd server
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cd server
cp .env.example .env
```

Then edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart-attendance
JWT_SECRET=use-a-long-random-string-here
CLIENT_URL=http://localhost:5173

# Optional: leave these blank to run without sending email.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ALERT_FROM=
```

`server/.env` is ignored by Git. Do not commit passwords, app passwords, or database credentials.

### 4. Start MongoDB

If MongoDB was installed as a Windows service, verify that it is running:

```powershell
Get-Service MongoDB
```

If its status is `Stopped`, open an Administrator PowerShell and run:

```powershell
Start-Service MongoDB
```

When the status is `Running`, the local connection string above is ready to use.

### 5. Run the application

From the project root:

```bash
npm run dev
```

Open `http://localhost:5173` in the browser.

The frontend runs on port `5173` and the API runs on port `5000`. You can confirm the API is available at `http://localhost:5000/api/health`.

## First-use walkthrough

1. Create a **faculty** account.
2. Create one or more **student** accounts using their own email addresses.
3. Sign in as faculty and create a course, such as `CS201 — Database Systems`.
4. Enrol students with the email address used when they registered.
5. Select **Mark attendance**, set a date and period, mark each student present or absent, and save.
6. Sign in as a student to see the percentage dashboard.
7. Sign in as faculty, open **Alerts**, select a threshold, and use **Send email alerts** if SMTP is configured.
8. Download a course report from the Alerts page when needed.

## Email alerts

The application sends low-attendance alerts only by email. A student is included when their percentage is below the selected threshold and they have at least one attendance record.

For Gmail SMTP, use the following values:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
ALERT_FROM=your-email@gmail.com
```

Use a Google App Password rather than your normal Gmail password. The server must be restarted after changing `.env` values.

Without SMTP settings, the application stays usable: it prepares the alerts and logs them on the server instead of sending mail.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a faculty or student account |
| `POST` | `/api/auth/login` | Sign in and receive a token |
| `GET` | `/api/courses` | List courses available to the signed-in user |
| `POST` | `/api/courses` | Create a course as faculty |
| `POST` | `/api/courses/:courseId/enroll` | Enrol a student as faculty |
| `POST` | `/api/attendance/mark` | Save one course/date/period attendance sheet |
| `GET` | `/api/attendance/dashboard` | Get a student's attendance summary |
| `GET` | `/api/attendance/low-attendance` | Get low-attendance students for faculty |
| `GET` | `/api/reports/course/:courseId.csv` | Download a course CSV report |

## Notes and scope

- One attendance record is stored per course, date, and period.
- Saving the same course/date/period again updates that period's record.
- The CSV report includes the student's present count, total classes, and percentage.
- This version does not include an administrator panel, timetable management, leave requests, or SMS notifications.

## Scripts

| Command | Description |
| --- | --- |
| `npm run install-all` | Install all project dependencies |
| `npm run dev` | Run API and React app together |
| `npm run server` | Run only the Express API |
| `npm run client` | Run only the React client |
| `npm --prefix client run build` | Create a production frontend build |

## Troubleshooting

**MongoDB connection failed**  
Check that the MongoDB service is running and that `MONGO_URI` is correct.

**No alert email arrives**  
Check the student email used during enrolment, verify the attendance percentage is below the chosen threshold, click **Send email alerts**, then check Spam and All Mail. Restart the server after adding or changing SMTP settings.

**Port already in use**  
Change `PORT` in `server/.env`, or stop the process currently using port 5000 or 5173.
