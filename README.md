# 🏥 Healthcare Patient Monitoring System
**SRM Institute of Science and Technology, Ramapuram Campus**
**DAA + DBMS Project — Batch 02**

> Farah Sheik Mohammad · Pallavi Nagalla · Harinisha S

---

## 🚀 Quick Start (3 commands)

```bash
cd backend
npm install
node db/seed.js      # Seeds demo data (4 doctors, 8 patients, 192 vitals)
node server.js       # Start server at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## 📁 Project Structure

```
healthcare-monitor/
├── backend/
│   ├── server.js              ← Express REST API (main entry point)
│   ├── package.json
│   ├── algorithms/
│   │   └── daa.js             ← All DAA algorithms
│   └── db/
│       ├── schema.js          ← SQLite database schema (DBMS)
│       └── seed.js            ← Demo data seeder
└── frontend/
    ├── index.html             ← Single Page App
    ├── css/style.css
    └── js/app.js              ← Frontend controller
```

---

## 🗄️ DBMS — Database Design

### Tables (ER Diagram)
| Table | Description |
|-------|-------------|
| `doctors` | Doctor profiles with specialty and ward |
| `patients` | Patient demographics, admission info, FK → doctors |
| `vitals` | Hourly vital readings (HR, BP, SpO2, Temp, Glucose) |
| `alerts` | Auto-generated alerts linked to vitals |
| `medications` | Prescribed drugs per patient |

### Key SQL Features Used
- **Foreign Keys** with `ON DELETE CASCADE`
- **Indexes** on frequently queried columns (`patient_id`, `recorded_at`, `is_read`)
- **JOINs** across 3+ tables for dashboard queries
- **Subqueries** to fetch latest vitals per patient
- **Aggregate functions**: `COUNT`, `SUM`, `GROUP BY`

---

## 🧮 DAA — Algorithms Implemented

| # | Algorithm | Time Complexity | Use Case |
|---|-----------|----------------|----------|
| 1 | **Vital Alert Detection** | O(1) | Real-time threshold check on every new reading |
| 2 | **Moving Average** (Sliding Window) | O(n) | Smooth noisy vital charts |
| 3 | **Risk Score** (Weighted MEWS) | O(k) | Prioritize critical patients |
| 4 | **Merge Sort** | O(n log n) | Sort patient list by risk/name/age |
| 5 | **Binary Search** | O(log n) | Fast patient lookup by ID |
| 6 | **Linear Regression** | O(n) | Detect rising/falling vital trends |

---

## 🌐 API Endpoints

```
GET    /api/dashboard          — Summary stats
GET    /api/patients           — All patients (filter + sort)
GET    /api/patients/:id       — Patient detail with trends
POST   /api/patients           — Add new patient
PUT    /api/patients/:id       — Update status/condition
POST   /api/vitals             — Add vital (auto-triggers alerts)
GET    /api/vitals/:patient_id — Vital history
GET    /api/alerts             — Unread alerts
PUT    /api/alerts/:id/read    — Mark alert read
GET    /api/doctors            — Doctor list
GET    /api/algorithms         — Algorithm documentation
```

---

## 📊 Features

- **Dashboard** — Live stats: total patients, critical count, unread alerts, today's vitals
- **Ward Charts** — Bar chart comparing ward-wise patient distribution
- **Patient Table** — Sortable, filterable table with inline vital chips and risk bar
- **Patient Detail** — Trend charts with Moving Average overlay, medication list, alert history
- **Alert System** — Auto-generated on vital submission; mark-as-read workflow
- **Add Patient / Record Vitals** — Forms with backend validation and instant risk feedback
- **DAA Info Page** — Explains all 6 algorithms with complexity analysis

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Frontend | Vanilla HTML/CSS/JavaScript |
| Charts | Chart.js 4 |
| DAA | Pure JavaScript implementations |
