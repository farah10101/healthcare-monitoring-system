// db/seed.js — Populate demo data for the project
const { initDB } = require('./schema');

const db = initDB();

// Clear existing data
db.exec(`
  DELETE FROM alerts; DELETE FROM vitals; DELETE FROM medications;
  DELETE FROM patients; DELETE FROM doctors;
`);

// ── Doctors ────────────────────────────────────────────────
const insertDoctor = db.prepare(`
  INSERT INTO doctors (name, specialty, email, phone, ward)
  VALUES (@name, @specialty, @email, @phone, @ward)
`);

const doctors = [
  { name: 'Dr. Ananya Krishnan',  specialty: 'Cardiology',      email: 'ananya@srm.edu',  phone: '9841000001', ward: 'Cardiology' },
  { name: 'Dr. Ramesh Iyer',      specialty: 'Pulmonology',     email: 'ramesh@srm.edu',  phone: '9841000002', ward: 'ICU' },
  { name: 'Dr. Priya Venkat',     specialty: 'General Medicine', email: 'priya@srm.edu',   phone: '9841000003', ward: 'General' },
  { name: 'Dr. Suresh Babu',      specialty: 'Endocrinology',   email: 'suresh@srm.edu',  phone: '9841000004', ward: 'Diabetics' },
];

const doctorIds = doctors.map(d => db.run
  ? insertDoctor.run(d).lastInsertRowid
  : insertDoctor.run(d).lastInsertRowid);

doctors.forEach((d, i) => { doctorIds[i] = insertDoctor.run(d).lastInsertRowid; });

// Undo double insertion
db.exec(`DELETE FROM doctors WHERE doctor_id > 4`);
const [d1, d2, d3, d4] = [1,2,3,4];

// ── Patients ───────────────────────────────────────────────
const insertPatient = db.prepare(`
  INSERT INTO patients (name, age, gender, blood_group, condition, ward, room_no, doctor_id, status)
  VALUES (@name, @age, @gender, @blood_group, @condition, @ward, @room_no, @doctor_id, @status)
`);

const patients = [
  { name: 'Ravi Kumar',      age: 58, gender: 'Male',   blood_group: 'O+',  condition: 'Arrhythmia',        ward: 'Cardiology', room_no: 'C101', doctor_id: d1, status: 'Critical' },
  { name: 'Meena Sharma',    age: 45, gender: 'Female', blood_group: 'A+',  condition: 'Hypertension',      ward: 'Cardiology', room_no: 'C102', doctor_id: d1, status: 'Stable'   },
  { name: 'Arun Patel',      age: 67, gender: 'Male',   blood_group: 'B+',  condition: 'COPD',              ward: 'ICU',        room_no: 'I01',  doctor_id: d2, status: 'Critical' },
  { name: 'Sita Devi',       age: 72, gender: 'Female', blood_group: 'AB-', condition: 'Pneumonia',         ward: 'ICU',        room_no: 'I02',  doctor_id: d2, status: 'Stable'   },
  { name: 'Karthik R',       age: 34, gender: 'Male',   blood_group: 'O-',  condition: 'Viral Fever',       ward: 'General',    room_no: 'G201', doctor_id: d3, status: 'Stable'   },
  { name: 'Deepa Nair',      age: 29, gender: 'Female', blood_group: 'A-',  condition: 'Appendicitis',      ward: 'General',    room_no: 'G202', doctor_id: d3, status: 'Stable'   },
  { name: 'Venkat Subramaniam', age: 55, gender: 'Male', blood_group: 'B-', condition: 'Type 2 Diabetes',  ward: 'Diabetics',  room_no: 'D301', doctor_id: d4, status: 'Stable'   },
  { name: 'Lakshmi Rao',     age: 48, gender: 'Female', blood_group: 'O+',  condition: 'Diabetic Ketoacidosis', ward: 'Diabetics', room_no: 'D302', doctor_id: d4, status: 'Critical' },
];

patients.forEach(p => insertPatient.run(p));

// ── Vitals (last 24 hrs, hourly) ───────────────────────────
const insertVital = db.prepare(`
  INSERT INTO vitals (patient_id, heart_rate, systolic_bp, diastolic_bp, oxygen_level, temperature, glucose_level, recorded_at, source)
  VALUES (@patient_id, @heart_rate, @systolic_bp, @diastolic_bp, @oxygen_level, @temperature, @glucose_level, @recorded_at, @source)
`);

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randF(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(1)); }

const vitalProfiles = {
  1: { hr: [100,130], sbp: [140,170], dbp: [90,110], spo2: [90,96], temp: [37.5,38.5], glu: [90,110] },  // Arrhythmia
  2: { hr: [70,85],  sbp: [130,150], dbp: [85,95],  spo2: [96,99], temp: [36.5,37.2], glu: [85,100] },  // Hypertension
  3: { hr: [88,105], sbp: [115,130], dbp: [75,85],  spo2: [85,93], temp: [37.8,38.8], glu: [90,110] },  // COPD
  4: { hr: [75,90],  sbp: [120,135], dbp: [78,88],  spo2: [94,98], temp: [38.0,39.0], glu: [88,105] },  // Pneumonia
  5: { hr: [68,82],  sbp: [110,125], dbp: [70,80],  spo2: [97,99], temp: [38.5,39.5], glu: [88,105] },  // Viral Fever
  6: { hr: [72,88],  sbp: [112,128], dbp: [72,82],  spo2: [97,99], temp: [36.5,37.5], glu: [85,100] },  // Normal
  7: { hr: [70,85],  sbp: [118,132], dbp: [76,86],  spo2: [96,99], temp: [36.5,37.2], glu: [150,280] }, // T2D
  8: { hr: [95,120], sbp: [100,120], dbp: [60,75],  spo2: [92,97], temp: [37.0,38.0], glu: [350,500] }, // DKA
};

for (let patient_id = 1; patient_id <= 8; patient_id++) {
  const p = vitalProfiles[patient_id];
  for (let h = 23; h >= 0; h--) {
    const ts = new Date(Date.now() - h * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    insertVital.run({
      patient_id,
      heart_rate:    rand(p.hr[0], p.hr[1]),
      systolic_bp:   rand(p.sbp[0], p.sbp[1]),
      diastolic_bp:  rand(p.dbp[0], p.dbp[1]),
      oxygen_level:  randF(p.spo2[0], p.spo2[1]),
      temperature:   randF(p.temp[0], p.temp[1]),
      glucose_level: randF(p.glu[0], p.glu[1]),
      recorded_at:   ts,
      source:        h % 3 === 0 ? 'Wearable' : 'EHR',
    });
  }
}

// ── Medications ────────────────────────────────────────────
const insertMed = db.prepare(`
  INSERT INTO medications (patient_id, drug_name, dosage, frequency, start_date, prescribed_by)
  VALUES (@patient_id, @drug_name, @dosage, @frequency, @start_date, @prescribed_by)
`);
[
  { patient_id:1, drug_name:'Metoprolol',  dosage:'50mg',  frequency:'Twice daily', start_date:'2026-04-01', prescribed_by:1 },
  { patient_id:2, drug_name:'Amlodipine',  dosage:'5mg',   frequency:'Once daily',  start_date:'2026-03-20', prescribed_by:1 },
  { patient_id:3, drug_name:'Salbutamol',  dosage:'100mcg',frequency:'SOS',         start_date:'2026-04-05', prescribed_by:2 },
  { patient_id:4, drug_name:'Amoxicillin', dosage:'500mg', frequency:'Thrice daily',start_date:'2026-04-06', prescribed_by:2 },
  { patient_id:7, drug_name:'Metformin',   dosage:'500mg', frequency:'Twice daily', start_date:'2026-03-01', prescribed_by:4 },
  { patient_id:8, drug_name:'Insulin',     dosage:'10IU',  frequency:'Every 6 hrs', start_date:'2026-04-08', prescribed_by:4 },
].forEach(m => insertMed.run(m));

// ── Alerts (pre-generated) ─────────────────────────────────
const insertAlert = db.prepare(`
  INSERT INTO alerts (patient_id, alert_type, severity, message, is_read)
  VALUES (@patient_id, @alert_type, @severity, @message, @is_read)
`);
[
  { patient_id:1, alert_type:'High Heart Rate',    severity:'Critical', message:'Heart rate reached 128 bpm — immediate review required.', is_read:0 },
  { patient_id:3, alert_type:'Low Oxygen Level',   severity:'Critical', message:'SpO2 dropped to 86% — oxygen therapy advised.',          is_read:0 },
  { patient_id:8, alert_type:'High Glucose Level', severity:'High',     message:'Blood glucose at 487 mg/dL — DKA protocol initiated.',    is_read:0 },
  { patient_id:2, alert_type:'High Blood Pressure',severity:'Medium',   message:'BP recorded at 148/93 — medication review needed.',       is_read:1 },
  { patient_id:4, alert_type:'High Temperature',   severity:'Medium',   message:'Fever at 39.1°C — antipyretic administered.',             is_read:1 },
].forEach(a => insertAlert.run(a));

console.log('✅ Seed complete — 4 doctors, 8 patients, 192 vitals, 5 alerts, 6 medications.');
db.close();
