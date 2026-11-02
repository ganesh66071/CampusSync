import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import attendanceRoutes from './routes/attendanceRoutes.js';
import db from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Attendance Routes
app.use('/api', attendanceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Automated Attendance System API is running healthy.' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    system: 'Automated Classroom Attendance System API',
    endpoints: [
      'POST /api/verify-student',
      'POST /api/mark-attendance',
      'GET  /api/attendance-logs',
      'GET  /health'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Automated Attendance Server active at http://localhost:${PORT}`);
});
