import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Radio, 
  ScanFace, 
  UserCheck, 
  History, 
  Sparkles,
  ChevronRight,
  LogOut,
  AlertTriangle,
  Building,
  StopCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

import FaceVerificationCard from './components/FaceVerificationCard';
import StudentInputCard from './components/StudentInputCard';
import BluetoothConnectCard from './components/BluetoothConnectCard';
import { startAttendanceSession, getCurrentSession, stopAttendanceSession, getAttendanceLogs } from './services/api';

export default function App() {
  // 3 Verification Factors
  const [faceVerified, setFaceVerified] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [bleConnected, setBleConnected] = useState(false);
  const [beaconInfo, setBeaconInfo] = useState(null);

  // Active session tracking from Python backend
  const [activeSession, setActiveSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Logs modal / tab view
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Poll current session every 2 seconds to reflect real-time 5-minute countdown, warnings, or ABSENT status
  const pollSession = async () => {
    try {
      const data = await getCurrentSession();
      if (data.active && data.session) {
        setActiveSession(data.session);
        setBleConnected(true);
      } else {
        setActiveSession(null);
      }
    } catch (e) {
      // Backend temporarily offline
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await getAttendanceLogs();
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    pollSession();
    fetchLogs();
    const interval = setInterval(pollSession, 2000);
    return () => clearInterval(interval);
  }, []);

  // Guarding logic: Must have verified face and enrolled student record
  const canStartSession = faceVerified && Boolean(studentData) && !activeSession;

  const handleStartAttendance = async () => {
    if (!canStartSession || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmissionError('');

      const result = await startAttendanceSession(studentData.registrationNumber, true);

      if (result.success) {
        setActiveSession(result.session);
        setBleConnected(true);

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        fetchLogs();
      }
    } catch (err) {
      setSubmissionError(err.message || 'Failed to start attendance session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopSession = async () => {
    try {
      await stopAttendanceSession();
      setActiveSession(null);
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background glowing ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Smart Classroom Attendance System
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ESP32 SPP ({beaconInfo?.port || 'COM15'})
                </span>
              </h1>
              <p className="text-xs text-slate-400">SRM Institute of Science & Technology • NodeMCU ESP32</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowLogs(!showLogs);
                if (!showLogs) fetchLogs();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition flex items-center gap-2"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showLogs ? 'Back to Portal' : 'Admin Logs'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] text-slate-300 font-mono">
                {logs.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {showLogs ? (
          /* Administrative Attendance Logs View */
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  Classroom Attendance Records & Watchdog Logs
                </h2>
                <p className="text-xs text-slate-400">Real-time database records tracking PRESENT and ABSENT results</p>
              </div>
              <button
                onClick={fetchLogs}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
              >
                Refresh Log Data
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading attendance records...</div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-60" />
                <p className="text-sm font-medium">No attendance records logged yet today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Reg. Number</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Verification Mode</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3.5 px-4 font-sans font-bold">
                          {log.status === 'ABSENT' ? (
                            <span className="inline-flex items-center gap-1 text-rose-400 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> ABSENT
                            </span>
                          ) : (log.status && log.status.includes('OD')) || log.attendance_mode === 'OD_EXEMPTION' ? (
                            <span className="inline-flex items-center gap-1.5 text-purple-300 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-semibold shadow-sm shadow-purple-500/20">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> OD – PRESENT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> PRESENT
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-sans font-medium text-slate-200">{log.student_name}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-semibold">{log.registration_number}</td>
                        <td className="py-3.5 px-4 font-sans text-slate-300">{log.department}</td>
                        <td className="py-3.5 px-4 font-sans text-amber-300">{log.period_label || 'Period 1'}</td>
                        <td className="py-3.5 px-4">
                          {(log.status && log.status.includes('OD')) || log.attendance_mode === 'OD_EXEMPTION' ? (
                            <span className="inline-flex items-center gap-1 text-purple-300 font-sans text-xs bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> OD Exemption
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-indigo-400 font-sans text-xs">
                              <Radio className="w-3.5 h-3.5" /> {log.beacon_id}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-sans">
                          {log.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Single-Page 3-Card Verification Portal */
          <div className="space-y-8">
            {/* Live Active Session Telemetry Banner */}
            {activeSession && (
              <div className={`rounded-2xl p-6 shadow-2xl relative overflow-hidden border ${
                activeSession.status === 'ABSENT'
                  ? 'bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 border-rose-500/50'
                  : activeSession.status === 'WARNING'
                  ? 'bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-amber-500/50'
                  : activeSession.status && activeSession.status.includes('OD')
                  ? 'bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border-purple-500/50'
                  : 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-emerald-500/40'
              }`}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activeSession.status === 'ABSENT' ? 'bg-rose-500/20 text-rose-400' :
                      activeSession.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400 animate-bounce' :
                      activeSession.status && activeSession.status.includes('OD') ? 'bg-purple-500/25 text-purple-300 ring-2 ring-purple-500/30' :
                      'bg-emerald-500/20 text-emerald-400 glow-success'
                    }`}>
                      {activeSession.status === 'ABSENT' ? <XCircle className="w-7 h-7" /> :
                       activeSession.status === 'WARNING' ? <AlertTriangle className="w-7 h-7" /> :
                       activeSession.status && activeSession.status.includes('OD') ? <Sparkles className="w-7 h-7 text-purple-400" /> :
                       <CheckCircle2 className="w-7 h-7" />}
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest font-semibold flex items-center gap-2">
                        Status: <strong className={
                          activeSession.status === 'ABSENT' ? 'text-rose-400' :
                          activeSession.status === 'WARNING' ? 'text-amber-400' :
                          activeSession.status && activeSession.status.includes('OD') ? 'text-purple-300' :
                          'text-emerald-400'
                        }>{activeSession.status}</strong>
                        {activeSession.od_exempted && <span className="text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30 font-sans text-[11px]">OD Exemption Active</span>}
                        {activeSession.test_mode && !activeSession.od_exempted && <span className="text-amber-400">(Test Mode: 15s)</span>}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-0.5">
                        {activeSession.student_name} ({activeSession.student_id})
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Started: <strong>{activeSession.start_time}</strong></span>
                        {activeSession.od_exempted ? (
                          <>
                            <span className="text-purple-300 font-sans">OD Event: <strong>{activeSession.od_details?.event_name || 'Official Duty'}</strong></span>
                            <span className="text-purple-300 font-sans">Approved By: <strong>{activeSession.od_details?.faculty_name || 'Faculty'}</strong></span>
                            <span className="text-emerald-400 font-sans">Bluetooth Penalty: <strong>EXEMPTED</strong></span>
                          </>
                        ) : (
                          <>
                            <span>Last Heartbeat: <strong>{activeSession.last_successful_heartbeat}</strong></span>
                            <span>Next Check: <strong className="text-amber-400">{activeSession.seconds_until_next_check}s</strong></span>
                            <span>Consecutive Misses: <strong className={activeSession.consecutive_failures > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                              {activeSession.consecutive_failures}/3
                            </strong></span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleStopSession}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Conclude Attendance Session</span>
                  </button>
                </div>
              </div>
            )}

            {/* Verification Status Progress Bar */}
            <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Gateway:</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {Number(faceVerified) + Number(Boolean(studentData)) + Number(bleConnected)} of 3 Passed
                </span>
              </div>

              {/* Badges */}
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:space-x-3">
                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-medium border ${
                  faceVerified 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}>
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>1. Face Verified</span>
                  {faceVerified ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                </div>

                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-medium border ${
                  studentData 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>2. Reg. Number</span>
                  {studentData ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                </div>

                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-medium border ${
                  (bleConnected || activeSession)
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}>
                  <Radio className="w-3.5 h-3.5" />
                  <span>3. ESP32 ({beaconInfo?.port || 'COM15'})</span>
                  {(bleConnected || activeSession) ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                </div>
              </div>
            </div>

            {/* 3 Prominent Verification Factor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {/* Card 1: Facial Recognition */}
              <FaceVerificationCard 
                isVerified={faceVerified}
                onVerificationChange={setFaceVerified}
                studentData={studentData}
              />

              {/* Card 2: Student Registration Input */}
              <StudentInputCard 
                studentData={studentData}
                onStudentVerified={setStudentData}
                onReset={() => {
                  setStudentData(null);
                  setFaceVerified(false);
                }}
              />

              {/* Card 3: ESP32 Bluetooth Hardware Card */}
              <BluetoothConnectCard 
                isConnected={bleConnected}
                onConnectionChange={setBleConnected}
                beaconInfo={beaconInfo}
                setBeaconInfo={setBeaconInfo}
                activeSession={activeSession}
              />
            </div>

            {/* Action Bar Section: Start Attendance Monitoring */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Attendance Monitoring Controller
                  {activeSession ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active: {activeSession.status}
                    </span>
                  ) : canStartSession ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      Ready to Start
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Guarded • Face & Reg. No Required
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  {activeSession
                    ? `Monitoring active for ${activeSession.student_name}. Checks ESP32 on ${beaconInfo?.port || 'COM15'} every 5 minutes. 3 consecutive failures = ABSENT.`
                    : `Once verified, starting attendance establishes the Python Bluetooth SPP connection to ${beaconInfo?.port || 'COM15'} and begins periodic 5-minute watchdog checks.`}
                </p>
                {submissionError && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">⚠️ {submissionError}</p>
                )}
              </div>

              {/* Primary Action Button */}
              {!activeSession ? (
                <button
                  type="button"
                  id="submit-attendance-btn"
                  onClick={handleStartAttendance}
                  disabled={!canStartSession || isSubmitting}
                  className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 shadow-lg ${
                    canStartSession && !isSubmitting
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30 hover:scale-[1.02] cursor-pointer'
                      : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      <span>Connecting to {beaconInfo?.port || 'COM15'}...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Start Attendance Monitoring</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopSession}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-5 h-5" />
                  <span>Conclude Session</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-5 text-center text-xs text-slate-500">
        <p>Smart Classroom Attendance System • Python pySerial ({beaconInfo?.port || 'COM15'}) + NodeMCU ESP32 (COM13 Debug)</p>
      </footer>
    </div>
  );
}
