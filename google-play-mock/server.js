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
// GET /internal/v1/reports/installs/:packageName/:yyyyMM
app.get('/internal/v1/reports/installs/:packageName/:yyyyMM', (req, res) => {
  const { packageName, yyyyMM } = req.params;

  if (!registeredApps.has(packageName)) {
    // If not registered explicitly, register auto for demo smooth workflow
    registeredApps.add(packageName);
  }

  const year = parseInt(yyyyMM.substring(0, 4), 10) || 2026;
  const month = parseInt(yyyyMM.substring(4, 6), 10) || 8;

  const daysInMonth = new Date(year, month, 0).getDate();

  let csvLines = ['Date,Package Name,Daily User Installs'];

  // Base seed from packageName + yyyyMM
  let hashSeed = 0;
  for (let i = 0; i < packageName.length; i++) {
    hashSeed += packageName.charCodeAt(i);
  }
  hashSeed += year * 100 + month;

  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${formattedDay}`;

    const daySeed = hashSeed + day * 10;
    // Generate between 5 and 75 installs per package per day
    const installs = Math.floor(pseudoRandom(daySeed) * 70) + 5;
    csvLines.push(`${dateStr},${packageName},${installs}`);
  }

  const csvContent = csvLines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="installs_${packageName}_${yyyyMM}.csv"`);
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
