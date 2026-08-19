import campaignRoutes from './routes/campaignRoutes';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { pool } from './config/db';

pool.getConnection()
  .then((conn) => {
    console.log('✅ MySQL connected successfully');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed:', err.message);
  });

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', campaignRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});