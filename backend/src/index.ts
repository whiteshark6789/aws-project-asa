import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './api/routes';
import { initDB } from './adapters/db.adapter';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Init Database
initDB();
console.log('Local SQLite Database Initialized');

// Routes
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Cloud Security Backend Simulation running on http://localhost:${PORT}`);
});
