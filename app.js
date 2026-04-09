// app.js — Healthcare Patient Monitoring System
// Frontend Controller

const API = 'http://localhost:3000/api';
let wardChart = null;
let detailChart = null;

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`)?.classList.add('active');
  document.getElementById('page-title').textContent =
    { dashboard:'Dashboard', patients:'Patients', vitals:'Record Vitals',
      alerts:'Alerts', doctors:'Doctors', algorithms:'DAA Info',
      'patient-detail':'Patient Detail' }[name] || name;

  if (name === 'dashboard')   loadDashboard();
  if (name === 'patients')    loadPatients();
  if (name === 'alerts')      loadAlerts();
  if (name === 'doctors')     loadDoctors();
  if (name === 'algorithms')  loadAlgorithms();
  if (name === 'vitals')      populatePatientSelect();
}

// ══════════════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════════════

function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════

async function loadDashboard() {
  const { data } = await fetchJSON(`${API}/dashboard`);
  document.getElementById('stat-total').textContent    = data.totalPatients;
  document.getElementById('stat-critical').textContent = data.criticalCount;
  document.getElementById('stat-alerts').textContent   = data.unreadAlerts;
  document.getElementById('stat-vitals').textContent   = data.todayVitals;
  document.getElementById('alert-badge').textContent   = data.unreadAlerts;

  // Ward bar chart
  if (wardChart) wardChart.destroy();
  const ctx = document.getElementById('wardChart').getContext('2d');
  wardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.wardStats.map(w => w.ward),
      datasets: [
        { label: 'Total',    data: data.wardStats.map(w => w.total),    backgroundColor: 'rgba(59,130,246,0.6)' },
        { label: 'Critical', data: data.wardStats.map(w => w.critical), backgroundColor: 'rgba(239,68,68,0.6)'  },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8896b3', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8896b3' }, grid: { color: '#2a3347' } },
        y: { ticks: { color: '#8896b3', stepSize: 1 }, grid: { color: '#2a3347' }, beginAtZero: true },
      },
    }
  });

  // Recent alerts
  const list = document.getElementById('recent-alerts-list');
  list.innerHTML = data.recentAlerts.length === 0
    ? '<p style="color:var(--text-muted);font-size:0.85rem">No recent alerts.</p>'
    : data.recentAlerts.map(a => `
      <div class="alert-item ${a.severity.toLowerCase()}">
        <div>
          <div class="alert-text"><strong>${a.patient_name}</strong> — ${a.alert_type}</div>
          <div class="alert-meta">${a.message}</div>
        </div>
        <span class="pill pill-${a.severity.toLowerCase()}">${a.severity}</span>
      </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// PATIENTS
// ══════════════════════════════════════════════════════════

async function loadPatients() {
  const search = document.getElementById('search-box')?.value || '';
  const ward   = document.getElementById('filter-ward')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const sort   = document.getElementById('sort-by')?.value || 'risk';

  const params = new URLSearchParams({ search, ward, status, sort, order: 'desc' });
  const { data } = await fetchJSON(`${API}/patients?${params}`);

  const tbody = document.getElementById('patients-tbody');
  tbody.innerHTML = data.map(p => {
    const risk = p.risk || {};
    const riskColor = risk.level === 'Critical' ? '#ef4444' : risk.level === 'High' ? '#f59e0b' : risk.level === 'Medium' ? '#3b82f6' : '#10b981';
    return `
    <tr>
      <td>
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">ID: ${p.patient_id}</div>
      </td>
      <td>${p.age} / ${p.gender}</td>
      <td>${p.ward}<br><span style="color:var(--text-muted);font-size:0.75rem">${p.room_no || '—'}</span></td>
      <td style="max-width:130px">${p.condition}</td>
      <td style="font-size:0.82rem">${p.doctor_name || '—'}</td>
      <td>
        <div class="vitals-mini">
          ${vitalChip('❤️', p.heart_rate, 'bpm', 50, 100)}
          ${vitalChip('🩸', p.systolic_bp, 'mmHg', 90, 140)}
          ${vitalChip('💧', p.oxygen_level, '%', 95, 100)}
          ${vitalChip('🌡️', p.temperature, '°C', 36, 37.5)}
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="risk-bar"><div class="risk-fill" style="width:${risk.score||0}%;background:${riskColor}"></div></div>
          <span style="font-size:0.78rem;color:${riskColor}">${risk.score||0}</span>
        </div>
        <div style="font-size:0.72rem;color:${riskColor}">${risk.level||'—'}</div>
      </td>
      <td><span class="pill pill-${(p.status||'stable').toLowerCase()}">${p.status}</span></td>
      <td><button class="btn btn-sm btn-outline" onclick="viewPatient(${p.patient_id})">View</button></td>
    </tr>`;
  }).join('');
}

function vitalChip(icon, val, unit, lo, hi) {
  if (val == null) return '';
  const cls = val > hi ? 'danger' : val < lo ? 'warn' : '';
  return `<span class="vital-chip ${cls}">${icon} ${val}${unit}</span>`;
}

// ══════════════════════════════════════════════════════════
// PATIENT DETAIL
// ══════════════════════════════════════════════════════════

async function viewPatient(id) {
  const { data: p } = await fetchJSON(`${API}/patients/${id}`);
  showPage('patient-detail');

  const trendTag = (t) => `<span class="trend-tag trend-${t.trend.toLowerCase()}">${t.trend === 'Rising' ? '↑' : t.trend === 'Falling' ? '↓' : '→'} ${t.trend}</span>`;

  const latest = p.vitals[0] || {};
  document.getElementById('patient-detail-content').innerHTML = `
    <div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem">
      <div style="flex:1;min-width:280px">
        <h2 style="font-size:1.3rem;margin-bottom:0.3rem">${p.name}</h2>
        <div style="color:var(--text-muted);margin-bottom:0.8rem">${p.condition} · ${p.ward}, Room ${p.room_no || '—'}</div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <span class="pill pill-${(p.status||'stable').toLowerCase()}">${p.status}</span>
          <span class="pill" style="background:rgba(139,92,246,0.15);color:#a78bfa">Risk: ${p.risk?.score}/100 ${p.risk?.level}</span>
          <span class="pill" style="background:var(--bg3);color:var(--text-muted)">${p.age} yrs · ${p.gender} · ${p.blood_group}</span>
        </div>
      </div>
      <div class="card" style="min-width:200px">
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem">Doctor</div>
        <div style="font-weight:600">${p.doctor_name||'—'}</div>
        <div style="font-size:0.8rem;color:var(--blue-light)">${p.specialty||''}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.3rem">${p.doctor_email||''}</div>
      </div>
    </div>

    <div class="detail-grid">
      <!-- Left: Info + Meds + Alerts -->
      <div style="display:flex;flex-direction:column;gap:1rem">
        <!-- Latest Vitals -->
        <div class="card">
          <div class="card-header">Latest Vitals</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.7rem">
            ${vitalDetail('❤️ Heart Rate', latest.heart_rate, 'bpm', p.trends?.heart_rate, trendTag)}
            ${vitalDetail('💧 SpO2', latest.oxygen_level, '%', p.trends?.oxygen_level, trendTag)}
            ${vitalDetail('🩸 Systolic BP', latest.systolic_bp, 'mmHg', p.trends?.systolic_bp, trendTag)}
            ${vitalDetail('🩸 Diastolic BP', latest.diastolic_bp, 'mmHg', null, null)}
            ${vitalDetail('🌡️ Temperature', latest.temperature, '°C', null, null)}
            ${vitalDetail('🍬 Glucose', latest.glucose_level, 'mg/dL', p.trends?.glucose_level, trendTag)}
          </div>
        </div>

        <!-- Medications -->
        <div class="card">
          <div class="card-header">💊 Medications</div>
          ${p.medications.length === 0 ? '<p style="color:var(--text-muted);font-size:0.83rem">None prescribed.</p>' : `
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Drug</th><th>Dosage</th><th>Frequency</th></tr></thead>
            <tbody>${p.medications.map(m => `<tr><td>${m.drug_name}</td><td>${m.dosage}</td><td>${m.frequency}</td></tr>`).join('')}</tbody>
          </table>`}
        </div>

        <!-- Alerts -->
        <div class="card">
          <div class="card-header">🔔 Recent Alerts</div>
          <div class="alert-list">
            ${p.alerts.length === 0
              ? '<p style="color:var(--text-muted);font-size:0.83rem">No alerts.</p>'
              : p.alerts.map(a => `
                <div class="alert-item ${a.severity.toLowerCase()}">
                  <div><div class="alert-text">${a.alert_type}</div><div class="alert-meta">${a.message}</div></div>
                  <span class="pill pill-${a.severity.toLowerCase()}">${a.severity}</span>
                </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Right: Chart -->
      <div class="card" style="height:fit-content">
        <div class="card-header">Vital Trends (Last 12 Readings)</div>
        <canvas id="detail-chart" height="280"></canvas>
      </div>
    </div>`;

  // Draw chart
  if (detailChart) detailChart.destroy();
  const labels = p.vitals.slice(0,12).reverse().map(v => v.recorded_at.slice(11,16));
  const hrData  = p.vitals.slice(0,12).reverse().map(v => v.heart_rate);
  const spo2Data = p.vitals.slice(0,12).reverse().map(v => v.oxygen_level);
  const bpData  = p.vitals.slice(0,12).reverse().map(v => v.systolic_bp);
  const maHR    = movingAvg(hrData, 3);

  detailChart = new Chart(document.getElementById('detail-chart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Heart Rate', data: hrData,   borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',  fill: true, tension: 0.4 },
        { label: 'MA (HR)',    data: maHR,      borderColor: '#f97316', borderDash: [4,4], fill: false, tension: 0.4, pointRadius: 0 },
        { label: 'SpO2 %',    data: spo2Data,  borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
        { label: 'Sys BP',    data: bpData,    borderColor: '#a78bfa', fill: false, tension: 0.4 },
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#8896b3', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8896b3', font: { size: 10 } }, grid: { color: '#2a3347' } },
        y: { ticks: { color: '#8896b3' }, grid: { color: '#2a3347' }, min: 50 },
      },
    }
  });
}

function vitalDetail(label, val, unit, trend, trendFn) {
  return `<div style="background:var(--bg3);border-radius:8px;padding:0.6rem">
    <div style="font-size:0.72rem;color:var(--text-muted)">${label}</div>
    <div style="font-size:1.2rem;font-weight:700">${val ?? '—'}<span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)"> ${val != null ? unit : ''}</span></div>
    ${trend && trendFn ? trendFn(trend) : ''}
  </div>`;
}

function movingAvg(arr, w) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - w + 1), i + 1);
    return parseFloat((slice.reduce((a,b) => a+b, 0) / slice.length).toFixed(1));
  });
}

// ══════════════════════════════════════════════════════════
// VITALS FORM
// ══════════════════════════════════════════════════════════

async function populatePatientSelect() {
  const { data } = await fetchJSON(`${API}/patients`);
  const sel = document.getElementById('vital-patient-id');
  sel.innerHTML = '<option value="">— Select Patient —</option>' +
    data.map(p => `<option value="${p.patient_id}">${p.name} (${p.ward})</option>`).join('');
}

async function submitVital() {
  const patient_id = parseInt(document.getElementById('vital-patient-id').value);
  if (!patient_id) return toast('Select a patient first.', 'error');

  const payload = {
    patient_id,
    heart_rate:    parseInt(document.getElementById('v-hr').value)   || null,
    systolic_bp:   parseInt(document.getElementById('v-sbp').value)  || null,
    diastolic_bp:  parseInt(document.getElementById('v-dbp').value)  || null,
    oxygen_level:  parseFloat(document.getElementById('v-spo2').value)|| null,
    temperature:   parseFloat(document.getElementById('v-temp').value)|| null,
    glucose_level: parseFloat(document.getElementById('v-glu').value) || null,
    source: document.getElementById('v-source').value,
  };

  const res = await fetchJSON(`${API}/vitals`, { method: 'POST', body: JSON.stringify(payload) });
  const el  = document.getElementById('vital-result');

  if (res.success) {
    toast('Vital recorded successfully!', 'success');
    el.innerHTML = `
      <div class="card">
        <div class="card-header">Result</div>
        <div>Risk Score: <strong>${res.risk.score}/100</strong> — <strong style="color:${res.risk.level==='Critical'?'var(--red)':res.risk.level==='High'?'var(--orange)':'var(--green)'}">${res.risk.level}</strong></div>
        ${res.alerts.length > 0
          ? `<div style="margin-top:0.7rem"><strong>Alerts triggered (${res.alerts.length}):</strong>
             ${res.alerts.map(a => `<div class="alert-item ${a.severity.toLowerCase()}" style="margin-top:4px"><div class="alert-text">${a.type}</div><div class="alert-meta">${a.message}</div></div>`).join('')}</div>`
          : '<div style="color:var(--green);margin-top:0.5rem">✅ All vitals within normal range.</div>'
        }
      </div>`;
    document.getElementById('alert-badge').textContent = parseInt(document.getElementById('alert-badge').textContent||0) + res.alerts.length;
  }
}

// ══════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════

async function loadAlerts() {
  const { data } = await fetchJSON(`${API}/alerts`);
  const el = document.getElementById('alerts-content');
  if (data.length === 0) {
    el.innerHTML = '<div class="card"><p style="color:var(--text-muted)">✅ No unread alerts.</p></div>';
    return;
  }
  el.innerHTML = `
    <div style="margin-bottom:1rem;color:var(--text-muted);font-size:0.85rem">${data.length} unread alert(s)</div>
    <div class="alert-list">
      ${data.map(a => `
        <div class="alert-item ${a.severity.toLowerCase()}" id="alert-row-${a.alert_id}">
          <div>
            <div class="alert-text"><strong>${a.patient_name}</strong> (${a.ward}, ${a.room_no||'—'}) — ${a.alert_type}</div>
            <div class="alert-meta">${a.message} &nbsp;·&nbsp; ${a.created_at?.slice(0,16)}</div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-shrink:0">
            <span class="pill pill-${a.severity.toLowerCase()}">${a.severity}</span>
            <button class="btn btn-sm btn-outline" onclick="markRead(${a.alert_id})">Mark Read</button>
          </div>
        </div>`).join('')}
    </div>`;
}

async function markRead(id) {
  await fetchJSON(`${API}/alerts/${id}/read`, { method: 'PUT' });
  document.getElementById(`alert-row-${id}`)?.remove();
  const badge = document.getElementById('alert-badge');
  badge.textContent = Math.max(0, parseInt(badge.textContent) - 1);
  toast('Alert marked as read.', 'info');
}

// ══════════════════════════════════════════════════════════
// DOCTORS
// ══════════════════════════════════════════════════════════

async function loadDoctors() {
  const { data } = await fetchJSON(`${API}/doctors`);
  document.getElementById('doctors-grid').innerHTML = data.map(d => `
    <div class="doctor-card">
      <div class="doctor-avatar">👨‍⚕️</div>
      <div class="doctor-name">${d.name}</div>
      <div class="doctor-spec">${d.specialty}</div>
      <div style="margin-top:0.8rem;font-size:0.82rem;color:var(--text-muted)">${d.email}</div>
      <div style="font-size:0.82rem;color:var(--text-muted)">${d.phone}</div>
      <div style="margin-top:0.8rem;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:0.8rem;color:var(--text-muted)">Ward: ${d.ward}</span>
        <span class="pill" style="background:rgba(59,130,246,0.15);color:var(--blue-light)">${d.patient_count} patients</span>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// ALGORITHMS
// ══════════════════════════════════════════════════════════

async function loadAlgorithms() {
  const { algorithms } = await fetchJSON(`${API}/algorithms`);
  const icons = ['⚡','📉','🎯','🔀','🔍','📐'];
  document.getElementById('algo-list').innerHTML = algorithms.map((a, i) => `
    <div class="algo-card">
      <div style="font-size:1.5rem;margin-bottom:0.5rem">${icons[i]}</div>
      <div class="algo-name">${a.name}</div>
      <div class="algo-complexity">${a.complexity}</div>
      <div class="algo-type">${a.type}</div>
      <div class="algo-use">${a.use}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// ADD PATIENT MODAL
// ══════════════════════════════════════════════════════════

async function openAddPatient() {
  const { data: docs } = await fetchJSON(`${API}/doctors`);
  document.getElementById('p-doctor').innerHTML =
    '<option value="">— None —</option>' +
    docs.map(d => `<option value="${d.doctor_id}">${d.name} (${d.specialty})</option>`).join('');
  document.getElementById('add-patient-modal').classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
}

async function submitPatient() {
  const payload = {
    name:        document.getElementById('p-name').value.trim(),
    age:         parseInt(document.getElementById('p-age').value),
    gender:      document.getElementById('p-gender').value,
    blood_group: document.getElementById('p-bg').value,
    ward:        document.getElementById('p-ward').value,
    room_no:     document.getElementById('p-room').value,
    condition:   document.getElementById('p-condition').value.trim(),
    doctor_id:   parseInt(document.getElementById('p-doctor').value) || null,
    contact_phone: document.getElementById('p-phone').value,
  };
  if (!payload.name || !payload.age || !payload.condition) return toast('Fill required fields.', 'error');
  const res = await fetchJSON(`${API}/patients`, { method: 'POST', body: JSON.stringify(payload) });
  if (res.success) {
    toast(`Patient added (ID: ${res.patient_id})`, 'success');
    closeModal();
    loadPatients();
  }
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
  document.getElementById('modal-overlay').classList.remove('open');
}

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

function toast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Boot ───────────────────────────────────────────────────
showPage('dashboard');
// Auto-refresh alert badge every 30s
setInterval(async () => {
  const { count } = await fetchJSON(`${API}/alerts`);
  document.getElementById('alert-badge').textContent = count;
}, 30000);
