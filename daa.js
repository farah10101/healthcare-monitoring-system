// algorithms/daa.js
// ================================================================
// DAA (Design and Analysis of Algorithms) MODULE
// Implements core algorithms used in the monitoring system
// ================================================================

/**
 * ALGORITHM 1: VITAL ALERT DETECTION (Threshold-based O(1) per vital)
 * Checks each vital reading against medical thresholds.
 * Time Complexity: O(1) — constant time per reading
 * Space Complexity: O(k) — k = number of alert types
 */
const THRESHOLDS = {
  heart_rate:    { low: 50,  high: 100,  critical_low: 40,  critical_high: 130 },
  systolic_bp:   { low: 90,  high: 140,  critical_low: 70,  critical_high: 180 },
  diastolic_bp:  { low: 60,  high: 90,   critical_low: 40,  critical_high: 120 },
  oxygen_level:  { low: 94,  high: 100,  critical_low: 88,  critical_high: null },
  temperature:   { low: 36.0,high: 37.5, critical_low: 35.0,critical_high: 39.5 },
  glucose_level: { low: 70,  high: 140,  critical_low: 50,  critical_high: 400  },
};

function detectAlerts(vital) {
  const alerts = [];
  const checks = [
    { key: 'heart_rate',    label: 'Heart Rate',    unit: 'bpm' },
    { key: 'systolic_bp',   label: 'Systolic BP',   unit: 'mmHg' },
    { key: 'diastolic_bp',  label: 'Diastolic BP',  unit: 'mmHg' },
    { key: 'oxygen_level',  label: 'Oxygen Level',  unit: '%' },
    { key: 'temperature',   label: 'Temperature',   unit: '°C' },
    { key: 'glucose_level', label: 'Glucose Level', unit: 'mg/dL' },
  ];

  for (const { key, label, unit } of checks) {
    const val = vital[key];
    if (val == null) continue;
    const t = THRESHOLDS[key];

    if (t.critical_high && val >= t.critical_high) {
      alerts.push({ type: `High ${label}`, severity: 'Critical',
        message: `${label} critically high at ${val}${unit}.` });
    } else if (t.critical_low && val <= t.critical_low) {
      alerts.push({ type: `Low ${label}`, severity: 'Critical',
        message: `${label} critically low at ${val}${unit}.` });
    } else if (val > t.high) {
      alerts.push({ type: `High ${label}`, severity: 'High',
        message: `${label} elevated at ${val}${unit}.` });
    } else if (val < t.low) {
      alerts.push({ type: `Low ${label}`, severity: 'Low',
        message: `${label} below normal at ${val}${unit}.` });
    }
  }
  return alerts;
}

/**
 * ALGORITHM 2: MOVING AVERAGE (Sliding Window — O(n))
 * Smooths vital trend data to remove noise.
 * Time Complexity: O(n) where n = number of readings
 * Space Complexity: O(w) where w = window size
 */
function movingAverage(data, windowSize = 5) {
  if (!data || data.length === 0) return [];
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((s, v) => s + v, 0) / window.length;
    result.push(parseFloat(avg.toFixed(2)));
  }
  return result;
}

/**
 * ALGORITHM 3: PATIENT RISK SCORING (Weighted Scoring — O(k))
 * Computes a risk score [0–100] from latest vitals.
 * Based on Modified Early Warning Score (MEWS) concept.
 * Time Complexity: O(k) — k = number of vitals checked
 */
function computeRiskScore(vital) {
  if (!vital) return { score: 0, level: 'Unknown' };
  let score = 0;

  const hrScore = vital.heart_rate < 40 || vital.heart_rate > 130 ? 3
    : vital.heart_rate < 50 || vital.heart_rate > 110 ? 2
    : vital.heart_rate < 60 || vital.heart_rate > 100 ? 1 : 0;

  const sbpScore = vital.systolic_bp < 70 || vital.systolic_bp > 180 ? 3
    : vital.systolic_bp < 90 || vital.systolic_bp > 160 ? 2
    : vital.systolic_bp < 100 || vital.systolic_bp > 140 ? 1 : 0;

  const spo2Score = vital.oxygen_level < 88 ? 3
    : vital.oxygen_level < 92 ? 2
    : vital.oxygen_level < 95 ? 1 : 0;

  const tempScore = vital.temperature > 39.5 || vital.temperature < 35 ? 3
    : vital.temperature > 38.5 || vital.temperature < 36 ? 2
    : vital.temperature > 38.0 ? 1 : 0;

  const glucScore = vital.glucose_level > 400 || vital.glucose_level < 50 ? 3
    : vital.glucose_level > 300 || vital.glucose_level < 70 ? 2
    : vital.glucose_level > 140 ? 1 : 0;

  score = hrScore + sbpScore + spo2Score + tempScore + glucScore;
  const normalized = Math.min(100, Math.round((score / 15) * 100));

  const level = score >= 9 ? 'Critical'
    : score >= 5 ? 'High'
    : score >= 3 ? 'Medium' : 'Low';

  return { score: normalized, level, raw: score };
}

/**
 * ALGORITHM 4: MERGE SORT for patient list (O(n log n))
 * Sorts patients by any key (risk score, name, age).
 * Time Complexity: O(n log n)
 * Space Complexity: O(n)
 */
function mergeSort(arr, key, order = 'desc') {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left  = mergeSort(arr.slice(0, mid), key, order);
  const right = mergeSort(arr.slice(mid),    key, order);
  return merge(left, right, key, order);
}

function merge(left, right, key, order) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    const cmp = order === 'asc'
      ? left[i][key] <= right[j][key]
      : left[i][key] >= right[j][key];
    if (cmp) result.push(left[i++]);
    else      result.push(right[j++]);
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}

/**
 * ALGORITHM 5: BINARY SEARCH on sorted patient list (O(log n))
 * Finds a patient by ID in a sorted array.
 * Time Complexity: O(log n)
 */
function binarySearch(sortedArr, targetId) {
  let lo = 0, hi = sortedArr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if      (sortedArr[mid].patient_id === targetId) return mid;
    else if (sortedArr[mid].patient_id < targetId)   lo = mid + 1;
    else                                              hi = mid - 1;
  }
  return -1;
}

/**
 * ALGORITHM 6: TREND DETECTION — Linear Regression (O(n))
 * Determines if a vital is trending UP, DOWN, or STABLE.
 * Returns slope and trend label.
 */
function detectTrend(values) {
  const n = values.length;
  if (n < 2) return { trend: 'Stable', slope: 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const trend = slope > 0.5 ? 'Rising' : slope < -0.5 ? 'Falling' : 'Stable';
  return { trend, slope: parseFloat(slope.toFixed(3)) };
}

module.exports = {
  detectAlerts,
  movingAverage,
  computeRiskScore,
  mergeSort,
  binarySearch,
  detectTrend,
  THRESHOLDS,
};
