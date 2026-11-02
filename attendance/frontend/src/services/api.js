/**
 * API service communicating with the Python FastAPI backend
 */

const BASE_URL = '/api';

const safeJson = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(res.ok ? 'Invalid response format from server.' : `Server error (${res.status}): ${text.slice(0, 100)}`);
  }
};

export const checkHealth = async () => {
  const res = await fetch(`${BASE_URL}/health`);
  return safeJson(res);
};

export const getBluetoothHardwareStatus = async () => {
  const res = await fetch(`${BASE_URL}/bluetooth/status`);
  return safeJson(res);
};

export const testBluetoothPing = async () => {
  const res = await fetch(`${BASE_URL}/bluetooth/test-ping`, { method: 'POST' });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.message || 'Ping failed.');
  return data;
};

export const reconnectBluetooth = async () => {
  const res = await fetch(`${BASE_URL}/bluetooth/reconnect`, { method: 'POST' });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.message || 'Reconnect failed.');
  return data;
};

export const verifyStudent = async (registrationNumber) => {
  const response = await fetch(`${BASE_URL}/verify-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber }),
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Failed to verify student.');
  }
  return data;
};

export const enrollStudent = async (studentPayload) => {
  const response = await fetch(`${BASE_URL}/students/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentPayload),
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Enrollment failed.');
  }
  return data;
};

export const verifyFaceBiometric = async (registrationNumber, imageBase64) => {
  const response = await fetch(`${BASE_URL}/face/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber, image_base64: imageBase64 }),
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Face verification failed.');
  }
  return data;
};

export const startAttendanceSession = async (registrationNumber, faceVerified) => {
  const response = await fetch(`${BASE_URL}/attendance/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber, faceVerified }),
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Failed to start session.');
  }
  return data;
};

export const getCurrentSession = async () => {
  const response = await fetch(`${BASE_URL}/attendance/session/current`);
  return safeJson(response);
};

export const stopAttendanceSession = async () => {
  const response = await fetch(`${BASE_URL}/attendance/stop`, { method: 'POST' });
  return safeJson(response);
};

export const getAttendanceLogs = async () => {
  const response = await fetch(`${BASE_URL}/attendance-logs`);
  return safeJson(response);
};
