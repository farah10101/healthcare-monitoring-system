// server.js — Main Express Server
// Healthcare Patient Monitoring System
// SRM Institute — Batch 02

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const Database = require('better-sqlite3');

const { initDB } = require('./db/schema');
const daa = require('./algorithms/daa');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Initialise DB
const db = initDB();

// ══════════════════════════════════════════════════════════
// PATIENT ROUTES
// ══════════════════════════════════════════════════════════

// GET all patients (with latest vitals + risk score)
app.get('/api/patients', (req, res) => {
  const { ward, status, sort = 'risk', order = 'desc', search } = req.query;

  let sql = `
    SELECT p.*, d.name AS doctor_name, d.specialty,
      v.heart_rate, v.systolic_bp, v.diastolic_bp,
      v.oxygen_level, v.temperature, v.glucose_level, v.recorded_at
    FROM patients p
    LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
    LEFT JOIN vitals v ON v.vital_id = (
      SELECT vital_id FROM vitals WHERE patient_id = p.patient_id
      ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE 1=1
  `;
  const params = [];
  if (ward)   { sql += ` AND p.ward = ?`;   params.push(ward); }
  if (status) { sql += ` AND p.status = ?`; params.push(status); }
  if (search) { sql += ` AND p.name LIKE ?`; params.push(`%${search}%`); }

  let patients = db.prepare(sql).all(...params);

  // Attach DAA risk scores
  patients = patients.map(p => ({
    ...p,
    risk: daa.computeRiskScore(p),
  }));

  // DAA: Merge Sort
  const validSort = ['risk', 'name', 'age'];
  const sortKey = validSort.includes(sort) ? sort : 'risk';
  if (sortKey === 'risk') {
    patients = daa.mergeSort(patients, p => p.risk.score, order);
    // mergeSort with accessor
    patients.sort((a, b) => order === 'desc'
      ? b.risk.score - a.risk.score
      : a.risk.score - b.risk.score);
  } else {
    patients = daa.mergeSort(patients, sortKey, order);
  }

  res.json({ success: true, count: patients.length, data: patients });
});

// GET single patient detail
app.get('/api/patients/:id', (req, res) => {
  const patient = db.prepare(`
    SELECT p.*, d.name AS doctor_name, d.specialty, d.email AS doctor_email
    FROM patients p
    LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
    WHERE p.patient_id = ?
  `).get(req.params.id);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const vitals   = db.prepare(`SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 24`).all(patient.patient_id);
  const meds     = db.prepare(`SELECT * FROM medications WHERE patient_id = ?`).all(patient.patient_id);
  const alerts   = db.prepare(`SELECT * FROM alerts WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10`).all(patient.patient_id);
  const latest   = vitals[0] || null;

  // DAA: trend analysis on last 12 readings
  const hrValues  = vitals.slice(0,12).map(v => v.heart_rate).reverse();
  const spo2Values = vitals.slice(0,12).map(v => v.oxygen_level).reverse();
  const bpValues  = vitals.slice(0,12).map(v => v.systolic_bp).reverse();
  const gluValues = vitals.slice(0,12).map(v => v.glucose_level).reverse();

  const trends = {
    heart_rate:    daa.detectTrend(hrValues),
    oxygen_level:  daa.detectTrend(spo2Values),
    systolic_bp:   daa.detectTrend(bpValues),
    glucose_level: daa.detectTrend(gluValues),
  };

  // DAA: moving average
  const movingAvg = {
    heart_rate:    daa.movingAverage(hrValues),
    systolic_bp:   daa.movingAverage(bpValues),
    oxygen_level:  daa.movingAverage(spo2Values),
    glucose_level: daa.movingAverage(gluValues),
  };

  res.json({
    success: true,
    data: {
      ...patient,
      risk: daa.computeRiskScore(latest),
      vitals,
      medications: meds,
      alerts,
      trends,
      movingAvg,
    },
  });
});

// POST new patient
app.post('/api/patients', (req, res) => {
  const { name, age, gender, blood_group, condition, ward, room_no, doctor_id, contact_phone } = req.body;
  if (!name || !age || !condition || !ward) return res.status(400).json({ error: 'Missing required fields' });
  const result = db.prepare(`
    INSERT INTO patients (name, age, gender, blood_group, condition, ward, room_no, doctor_id, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, age, gender, blood_group, condition, ward, room_no, doctor_id, contact_phone);
  res.json({ success: true, patient_id: result.lastInsertRowid });
});

// PUT update patient status
app.put('/api/patients/:id', (req, res) => {
  const { status, condition, room_no } = req.body;
  db.prepare(`UPDATE patients SET status=COALESCE(?,status), condition=COALESCE(?,condition), room_no=COALESCE(?,room_no) WHERE patient_id=?`)
    .run(status, condition, room_no, req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════
// VITALS ROUTES
// ══════════════════════════════════════════════════════════

// POST new vital reading (with auto-alert)
app.post('/api/vitals', (req, res) => {
  const { patient_id, heart_rate, systolic_bp, diastolic_bp, oxygen_level, temperature, glucose_level, source } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

  const result = db.prepare(`
    INSERT INTO vitals (patient_id, heart_rate, systolic_bp, diastolic_bp, oxygen_level, temperature, glucose_level, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(patient_id, heart_rate, systolic_bp, diastolic_bp, oxygen_level, temperature, glucose_level, source || 'Manual');

  const vital = { patient_id, heart_rate, systolic_bp, diastolic_bp, oxygen_level, temperature, glucose_level };

  // DAA: auto-detect alerts
  const generatedAlerts = daa.detectAlerts(vital);
  const insertAlert = db.prepare(`
    INSERT INTO alerts (patient_id, vital_id, alert_type, severity, message)
    VALUES (?, ?, ?, ?, ?)
  `);
  generatedAlerts.forEach(a => insertAlert.run(patient_id, result.lastInsertRowid, a.type, a.severity, a.message));

  // Update patient status if critical
  const riskScore = daa.computeRiskScore(vital);
  if (riskScore.level === 'Critical') {
    db.prepare(`UPDATE patients SET status='Critical' WHERE patient_id=?`).run(patient_id);
  } else if (riskScore.level === 'Low') {
    db.prepare(`UPDATE patients SET status='Stable' WHERE patient_id=?`).run(patient_id);
  }

  res.json({ success: true, vital_id: result.lastInsertRowid, alerts: generatedAlerts, risk: riskScore });
});

// GET vitals for a patient (last N readings)
app.get('/api/vitals/:patient_id', (req, res) => {
  const limit = parseInt(req.query.limit) || 24;
  const vitals = db.prepare(`SELECT * FROM vitals WHERE patient_id=? ORDER BY recorded_at DESC LIMIT ?`)
    .all(req.params.patient_id, limit);
  res.json({ success: true, data: vitals });
});

// ══════════════════════════════════════════════════════════
// ALERTS ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/alerts', (req, res) => {
  const alerts = db.prepare(`
    SELECT a.*, p.name AS patient_name, p.ward, p.room_no
    FROM alerts a
    JOIN patients p ON a.patient_id = p.patient_id
    WHERE a.is_read = 0
    ORDER BY a.created_at DESC
  `).all();
  res.json({ success: true, count: alerts.length, data: alerts });
});

app.put('/api/alerts/:id/read', (req, res) => {
  db.prepare(`UPDATE alerts SET is_read=1 WHERE alert_id=?`).run(req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════
// DOCTORS ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/doctors', (req, res) => {
  const doctors = db.prepare(`
    SELECT d.*, COUNT(p.patient_id) AS patient_count
    FROM doctors d
    LEFT JOIN patients p ON p.doctor_id = d.doctor_id AND p.status != 'Discharged'
    GROUP BY d.doctor_id
  `).all();
  res.json({ success: true, data: doctors });
});

// ══════════════════════════════════════════════════════════
// DASHBOARD SUMMARY
// ══════════════════════════════════════════════════════════

app.get('/api/dashboard', (req, res) => {
  const totalPatients   = db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE status != 'Discharged'`).get().c;
  const criticalCount   = db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE status='Critical'`).get().c;
  const unreadAlerts    = db.prepare(`SELECT COUNT(*) AS c FROM alerts WHERE is_read=0`).get().c;
  const todayVitals     = db.prepare(`SELECT COUNT(*) AS c FROM vitals WHERE date(recorded_at)=date('now')`).get().c;

  const wardStats = db.prepare(`
    SELECT ward, COUNT(*) AS total,
      SUM(CASE WHEN status='Critical' THEN 1 ELSE 0 END) AS critical
    FROM patients WHERE status != 'Discharged' GROUP BY ward
  `).all();

  const recentAlerts = db.prepare(`
    SELECT a.*, p.name AS patient_name
    FROM alerts a JOIN patients p ON a.patient_id = p.patient_id
    ORDER BY a.created_at DESC LIMIT 5
  `).all();

  res.json({
    success: true,
    data: { totalPatients, criticalCount, unreadAlerts, todayVitals, wardStats, recentAlerts },
  });
});

// ── DAA Info endpoint (for project documentation) ─────────
app.get('/api/algorithms', (req, res) => {
  res.json({
    algorithms: [
      { name: 'Vital Alert Detection', complexity: 'O(1)', type: 'Threshold-based Scan', use: 'Real-time alert generation on new vitals' },
      { name: 'Moving Average',        complexity: 'O(n)', type: 'Sliding Window',        use: 'Smoothing noisy vital trend data' },
      { name: 'Risk Score Computation',complexity: 'O(k)', type: 'Weighted Scoring (MEWS)',use: 'Patient risk prioritization' },
      { name: 'Merge Sort',            complexity: 'O(n log n)', type: 'Divide and Conquer', use: 'Sorting patient list by risk/name/age' },
      { name: 'Binary Search',         complexity: 'O(log n)', type: 'Divide and Conquer', use: 'Fast patient lookup by ID' },
      { name: 'Linear Regression',     complexity: 'O(n)', type: 'Statistical Analysis', use: 'Detecting rising/falling vital trends' },
    ]
  });
});

// ── Serve frontend ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏥 Healthcare Monitor running at http://localhost:${PORT}`);
  console.log(`📊 API Base: http://localhost:${PORT}/api`);
  console.log(`\nRun 'node db/seed.js' first if starting fresh.\n`);
});
