const fs = require('fs');
const http = require('http');
const path = require('path');

const targetFile = process.argv[2] || 'sample_log.json';
const logFile = path.join(__dirname, targetFile);

if (!fs.existsSync(logFile)) {
  console.error(`Error: Could not find file ${logFile}`);
  process.exit(1);
}

const rawData = fs.readFileSync(logFile, 'utf8');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/logs/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(rawData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(rawData);
req.end();
