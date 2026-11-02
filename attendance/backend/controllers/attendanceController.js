import db from '../config/db.js';

/**
 * 1. POST /api/verify-student
 * Body: { "registrationNumber": "RA2511026020082" }
 */
export const verifyStudent = (req, res) => {
  try {
    const { registrationNumber } = req.body;

    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Registration number is required and must be a valid string.'
      });
    }

    const student = db.getStudentByRegNo(registrationNumber);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student not found for Registration Number: ${registrationNumber.trim().toUpperCase()}`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student record verified successfully',
      student: {
        registrationNumber: student.registration_number,
        name: student.name,
        department: student.department,
        year: student.year,
        section: student.section
      }
    });
  } catch (error) {
    console.error('Error in verifyStudent:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while verifying student'
    });
  }
};

/**
 * 2. POST /api/mark-attendance
 * Body: { "registrationNumber": "...", "faceVerified": true, "bleConnected": true, "beaconId": "..." }
 */
export const markAttendance = (req, res) => {
  try {
    const { registrationNumber, faceVerified, bleConnected, beaconId } = req.body;

    if (!registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Registration number is required.'
      });
    }

    // Strict Guarding: 3 Factors must be present
    if (!faceVerified) {
      return res.status(400).json({
        success: false,
        message: 'Facial recognition verification has not passed.'
      });
    }

    if (!bleConnected) {
      return res.status(400).json({
        success: false,
        message: 'Classroom Bluetooth Beacon proximity verification has not passed.'
      });
    }

    const student = db.getStudentByRegNo(registrationNumber);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student registration record not found in system.'
      });
    }

    // Check duplicate check-in today
    const existingLog = db.getRecentAttendanceLog(registrationNumber);
    if (existingLog && existingLog.status !== 'REVOKED_ABSENT') {
      return res.status(409).json({
        success: false,
        message: `Attendance already marked for today at ${new Date(existingLog.timestamp).toLocaleTimeString()}`,
        timestamp: existingLog.timestamp
      });
    }

    const logRecord = db.insertAttendanceLog({
      registration_number: student.registration_number,
      student_name: student.name,
      department: student.department,
      face_verified: !!faceVerified,
      ble_connected: !!bleConnected,
      beacon_id: beaconId || 'ESP32_Attendance',
      status: 'PRESENT'
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance successfully logged!',
      timestamp: logRecord.timestamp,
      record: logRecord
    });
  } catch (error) {
    console.error('Error in markAttendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while logging attendance'
    });
  }
};

/**
 * 3. POST /api/mark-absent
 * Invoked when ESP32 Bluetooth disconnects > 2 consecutive check cycles (5s intervals)
 * Body: { "registrationNumber": "RA2511026020082", "reason": "BLE_DISCONNECTED_2_CYCLES" }
 */
export const markAbsent = (req, res) => {
  try {
    const { registrationNumber, reason } = req.body;

    if (!registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Registration number is required to update attendance.'
      });
    }

    const student = db.getStudentByRegNo(registrationNumber);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student registration record not found.'
      });
    }

    // Revoke today's attendance or mark as ABSENT
    const absentRecord = db.insertAttendanceLog({
      registration_number: student.registration_number,
      student_name: student.name,
      department: student.department,
      face_verified: 0,
      ble_connected: 0,
      beacon_id: 'DISCONNECTED',
      status: 'ABSENT',
      reason: reason || 'Bluetooth Disconnected (>2 cycles of 5s intervals)'
    });

    console.warn(`⚠️ Student ${registrationNumber} (${student.name}) marked ABSENT due to BLE disconnection.`);

    return res.status(200).json({
      success: true,
      message: `Student marked ABSENT due to Bluetooth disconnection from ESP32.`,
      status: 'ABSENT',
      timestamp: absentRecord.timestamp,
      record: absentRecord
    });
  } catch (error) {
    console.error('Error in markAbsent:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while marking student absent.'
    });
  }
};

/**
 * 4. GET /api/attendance-logs
 */
export const getAttendanceLogs = (req, res) => {
  try {
    const logs = db.getAllAttendanceLogs();
    return res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Error in getAttendanceLogs:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving attendance logs'
    });
  }
};
