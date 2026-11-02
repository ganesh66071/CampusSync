import express from 'express';
import {
  verifyStudent,
  markAttendance,
  markAbsent,
  getAttendanceLogs
} from '../controllers/attendanceController.js';

const router = express.Router();

// Student registration lookup
router.post('/verify-student', verifyStudent);

// 3-factor attendance submission (PRESENT)
router.post('/mark-attendance', markAttendance);

// Mark absent on sustained BLE disconnection (>2 checks of 5s)
router.post('/mark-absent', markAbsent);

// Attendance records log
router.get('/attendance-logs', getAttendanceLogs);

export default router;
