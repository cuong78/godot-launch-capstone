const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8082;

// Registered apps store
const registeredApps = new Set([
  'com.godotlaunch.skyadventure',
  'com.godotlaunch.samplegame'
]);

// Helper: Seeded pseudo-random generator for deterministic numbers
function pseudoRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// 1. Register App
app.post('/internal/v1/apps', (req, res) => {
  const { packageName } = req.body;
  if (!packageName) {
    return res.status(400).json({ error: 'packageName is required' });
  }
  registeredApps.add(packageName);
  return res.json({
    message: 'App registered successfully',
    packageName,
    registeredAt: new Date().toISOString()
  });
});

// 2. Unregister App
app.delete('/internal/v1/apps/:packageName', (req, res) => {
  const { packageName } = req.params;
  registeredApps.delete(packageName);
  return res.json({
    message: 'App unregistered successfully',
    packageName
  });
});

// 3. Install CSV Statistics Report
// GET /internal/v1/reports/installs/:packageName?startDate=2026-09-01&endDate=2026-09-05
// GET /internal/v1/reports/installs/:packageName/:yyyyMM
app.get(['/internal/v1/reports/installs/:packageName', '/internal/v1/reports/installs/:packageName/:yyyyMM'], (req, res) => {
  const { packageName, yyyyMM } = req.params;
  const { startDate, endDate } = req.query;

  if (!registeredApps.has(packageName)) {
    // If not registered explicitly, register auto for demo smooth workflow
    registeredApps.add(packageName);
  }

  let hashSeed = 0;
  for (let i = 0; i < packageName.length; i++) {
    hashSeed += packageName.charCodeAt(i);
  }

  let csvLines = ['Date,Package Name,Daily User Installs'];

  if (startDate && endDate) {
    // Handle date range (YYYY-MM-DD to YYYY-MM-DD)
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);

    if (startParts.length === 3 && endParts.length === 3) {
      let curr = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
      const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

      while (curr <= end) {
        const yyyy = curr.getUTCFullYear();
        const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(curr.getUTCDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const startOfYear = new Date(Date.UTC(yyyy, 0, 0));
        const dayOfYear = Math.floor((curr - startOfYear) / 86400000);
        const daySeed = hashSeed + yyyy * 1000 + dayOfYear * 10;
        const installs = Math.floor(pseudoRandom(daySeed) * 70) + 5;

        csvLines.push(`${dateStr},${packageName},${installs}`);
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      const csvContent = csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="installs_${packageName}_${startDate}_to_${endDate}.csv"`);
      return res.send(csvContent);
    }
  }

  // Fallback: Legacy yyyyMM behavior
  let year = 2026;
  let month = 8;

  if (yyyyMM && yyyyMM.length === 6 && !isNaN(yyyyMM)) {
    year = parseInt(yyyyMM.substring(0, 4), 10) || 2026;
    month = parseInt(yyyyMM.substring(4, 6), 10) || 8;
  }

  for (let i = 0; i < (yyyyMM || '').length; i++) {
    hashSeed += yyyyMM.charCodeAt(i) * (i + 1);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  let maxDay = daysInMonth;
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    maxDay = 0;
  } else if (year === currentYear && month === currentMonth) {
    maxDay = Math.min(daysInMonth, currentDay);
  }

  for (let day = 1; day <= maxDay; day++) {
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${formattedDay}`;

    const daySeed = hashSeed + day * 10;
    const installs = Math.floor(pseudoRandom(daySeed) * 70) + 5;
    csvLines.push(`${dateStr},${packageName},${installs}`);
  }

  const csvContent = csvLines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="installs_${packageName}_${yyyyMM || 'all'}.csv"`);
  return res.send(csvContent);
});

// 4. Payout Statements
// POST /internal/v1/payouts
app.post('/internal/v1/payouts', (req, res) => {
  const { packageName, periodKey, totalInstalls, unitPrice } = req.body;

  if (!packageName || !periodKey) {
    return res.status(400).json({ error: 'packageName and periodKey are required' });
  }

  // Idempotent externalPayoutId
  const externalPayoutId = `MOCK-GP-${periodKey}-${packageName}`;
  
  // Calculate gross revenue = totalInstalls * unitPrice
  const installs = parseInt(totalInstalls, 10) || 100;
  const price = parseFloat(unitPrice) || 99000;
  const grossRevenue = installs * price;

  return res.json({
    externalPayoutId,
    packageName,
    periodKey,
    grossRevenue,
    currency: 'VND',
    serviceFeeRate: 15.00,
    status: 'PAID',
    settledAt: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'google-play-mock', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Google Play Mock] Container listening on port ${PORT}`);
});
