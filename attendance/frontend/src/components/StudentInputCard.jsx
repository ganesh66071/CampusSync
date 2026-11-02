import React, { useState } from 'react';
import { UserCheck, Search, CheckCircle2, AlertCircle, Loader2, GraduationCap, Building2, Calendar, Hash } from 'lucide-react';
import { verifyStudent } from '../services/api';

export default function StudentInputCard({ studentData, onStudentVerified, onReset }) {
  const [regNo, setRegNo] = useState('RA2511026020082');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerify = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!regNo.trim()) {
      setError('Please enter a valid Registration Number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await verifyStudent(regNo.trim());
      if (response.success && response.student) {
        setIsSuccess(true);
        onStudentVerified(response.student);
      }
    } catch (err) {
      setError(err.message || 'Registration Number not recognized in records.');
      setIsSuccess(false);
      onReset();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleVerify(e);
    }
  };

  const handleBlur = () => {
    if (regNo.trim() && (!studentData || studentData.registrationNumber !== regNo.trim().toUpperCase())) {
      handleVerify();
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative overflow-hidden transition-all duration-300 flex flex-col justify-between h-full border border-slate-800">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              isSuccess ? 'bg-emerald-500/20 text-emerald-400' :
              loading ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Factor 2: Student Identity
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">Database</span>
              </h2>
              <p className="text-xs text-slate-400">Institutional registration lookup</p>
            </div>
          </div>

          {/* Dynamic Status Indicator */}
          <div>
            {loading && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Querying DB...
              </span>
            )}
            {!loading && isSuccess && studentData && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Identity Verified
              </span>
            )}
            {!loading && error && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                Not Found
              </span>
            )}
            {!loading && !isSuccess && !error && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                Input Required
              </span>
            )}
          </div>
        </div>

        {/* Input Box */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Student Registration ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={regNo}
                onChange={(e) => {
                  setRegNo(e.target.value);
                  if (error) setError('');
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="e.g. RA2511026020082"
                className={`w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 text-sm font-mono tracking-wider rounded-xl pl-10 pr-24 py-3 border transition focus:outline-none focus:ring-2 ${
                  isSuccess
                    ? 'border-emerald-500/60 focus:ring-emerald-500/30'
                    : error
                    ? 'border-rose-500/60 focus:ring-rose-500/30'
                    : 'border-slate-700/80 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                Verify
              </button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          {/* Student Profile Card once verified */}
          {studentData && isSuccess ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-800/60 border border-emerald-500/30 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                    {studentData.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-wide">{studentData.name}</h3>
                    <p className="text-[11px] font-mono text-emerald-400">{studentData.registrationNumber}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                  Active Enrolled
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-slate-500 block">Department</span>
                    <span className="font-medium text-slate-200">{studentData.department}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-slate-500 block">Year & Sec</span>
                    <span className="font-medium text-slate-200">{studentData.year} ({studentData.section})</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center">
              <GraduationCap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Enter registration ID above to authenticate student records.</p>
              <div className="mt-3 flex justify-center gap-2">
                <span 
                  onClick={() => { setRegNo('RA2511026020082'); }} 
                  className="cursor-pointer text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded transition"
                >
                  RA2511026020082 (Ganesh)
                </span>
                <span 
                  onClick={() => { setRegNo('RA2511026020083'); }} 
                  className="cursor-pointer text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded transition"
                >
                  RA2511026020083 (Priya)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <p className="text-[11px] text-slate-500 flex items-center justify-between">
          <span>Backend Validation API:</span>
          <code className="text-indigo-400 font-mono">POST /api/verify-student</code>
        </p>
      </div>
    </div>
  );
}
