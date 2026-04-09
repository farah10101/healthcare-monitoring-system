// db/schema.js — DBMS Layer: All table definitions
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'hospital.db');

function initDB() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- ========================================================
    -- DBMS PROJECT: Healthcare Patient Monitoring System
    -- ER Diagram Tables
    -- ========================================================

    CREATE TABLE IF NOT EXISTS doctors (
      doctor_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      specialty   TEXT    NOT NULL,
      email       TEXT    UNIQUE NOT NULL,
      phone       TEXT,
      ward        TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patients (
      patient_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      age            INTEGER NOT NULL,
      gender         TEXT    CHECK(gender IN ('Male','Female','Other')) NOT NULL,
      blood_group    TEXT,
      condition      TEXT    NOT NULL,
      ward           TEXT    NOT NULL,
      room_no        TEXT,
      doctor_id      INTEGER REFERENCES doctors(doctor_id),
      admitted_on    DATE    DEFAULT (date('now')),
      contact_phone  TEXT,
      status         TEXT    CHECK(status IN ('Stable','Critical','Discharged')) DEFAULT 'Stable',
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vitals (
      vital_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
      heart_rate      INTEGER,          -- bpm
      systolic_bp     INTEGER,          -- mmHg
      diastolic_bp    INTEGER,          -- mmHg
      oxygen_level    REAL,             -- SpO2 %
      temperature     REAL,             -- Celsius
      glucose_level   REAL,             -- mg/dL
      recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      source          TEXT DEFAULT 'Manual'  -- Manual | Wearable | EHR
    );

    CREATE TABLE IF NOT EXISTS alerts (
      alert_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id   INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
      vital_id     INTEGER REFERENCES vitals(vital_id),
      alert_type   TEXT NOT NULL,   -- e.g., "High Heart Rate"
      severity     TEXT CHECK(severity IN ('Low','Medium','High','Critical')) NOT NULL,
      message      TEXT NOT NULL,
      is_read      INTEGER DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS medications (
      med_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id   INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
      drug_name    TEXT NOT NULL,
      dosage       TEXT NOT NULL,
      frequency    TEXT NOT NULL,
      start_date   DATE,
      end_date     DATE,
      prescribed_by INTEGER REFERENCES doctors(doctor_id)
    );

    -- Indexes for fast lookups (DAA: improves search from O(n) to O(log n))
    CREATE INDEX IF NOT EXISTS idx_vitals_patient    ON vitals(patient_id);
    CREATE INDEX IF NOT EXISTS idx_vitals_recorded   ON vitals(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_patient    ON alerts(patient_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_unread     ON alerts(is_read) WHERE is_read = 0;
    CREATE INDEX IF NOT EXISTS idx_patients_status   ON patients(status);
    CREATE INDEX IF NOT EXISTS idx_patients_ward     ON patients(ward);
  `);

  console.log('✅ Database initialized at', DB_PATH);
  return db;
}

module.exports = { initDB, DB_PATH };
