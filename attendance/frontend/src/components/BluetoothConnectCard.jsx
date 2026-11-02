import React, { useState, useEffect } from 'react';
import { Bluetooth, Radio, CheckCircle2, AlertCircle, RefreshCw, Cpu, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getBluetoothHardwareStatus, testBluetoothPing, reconnectBluetooth } from '../services/api';

export default function BluetoothConnectCard({ 
  isConnected, 
  onConnectionChange, 
  beaconInfo, 
  setBeaconInfo,
  activeSession
}) {
  const [hwStatus, setHwStatus] = useState(null);
  const [loadingPing, setLoadingPing] = useState(false);
  const [loadingReconnect, setLoadingReconnect] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pingResult, setPingResult] = useState('');

  // Periodically query the Python backend's truthful hardware status for COM15
  const refreshStatus = async () => {
    try {
      const data = await getBluetoothHardwareStatus();
      setHwStatus(data);
      if (data.state === 'CONNECTED' && data.is_open) {
        onConnectionChange(true);
        setBeaconInfo({
          name: 'ESP32_Attendance',
          port: data.port,
          lastHeartbeat: data.last_heartbeat
        });
      } else {
        if (!activeSession) {
          onConnectionChange(false);
        }
      }
    } catch (err) {
      console.warn("Could not query Bluetooth hardware status:", err);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Test direct PING -> PONG over COM15
  const handleTestPing = async () => {
    try {
      setLoadingPing(true);
      setErrorMessage('');
      setPingResult('');
      const res = await testBluetoothPing();
      setPingResult(res.response || 'PONG received!');
      onConnectionChange(true);
      refreshStatus();
    } catch (err) {
      setErrorMessage(err.message || `ESP32 did not respond to PING on ${hwStatus?.port || 'Bluetooth port'}.`);
      onConnectionChange(false);
    } finally {
      setLoadingPing(false);
    }
  };

  // Explicit Manual Reconnect
  const handleManualReconnect = async () => {
    try {
      setLoadingReconnect(true);
      setErrorMessage('');
      setPingResult('');
      const res = await reconnectBluetooth();
      setPingResult('Connected & Handshake verified!');
      onConnectionChange(true);
      refreshStatus();
    } catch (err) {
      setErrorMessage(err.message || `Failed to reconnect to ESP32 on ${hwStatus?.port || 'Bluetooth port'}.`);
      onConnectionChange(false);
    } finally {
      setLoadingReconnect(false);
    }
  };

  // State badge styling helper
  const renderStatusBadge = () => {
    const state = hwStatus?.state || (activeSession ? 'CONNECTED' : 'DISCONNECTED');

    if (state === 'CONNECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(34,197,94,0.3)]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          CONNECTED
        </span>
      );
    }
    if (state === 'RECONNECTING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Activity className="w-3.5 h-3.5 animate-spin" />
          RECONNECTING
        </span>
      );
    }
    if (state === 'ERROR') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3.5 h-3.5" />
          ERROR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
        DISCONNECTED
      </span>
    );
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative overflow-hidden transition-all duration-300 flex flex-col justify-between h-full border border-slate-800">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              hwStatus?.state === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400' :
              hwStatus?.state === 'RECONNECTING' ? 'bg-amber-500/20 text-amber-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Factor 3: ESP32 Bluetooth
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {hwStatus?.port || 'COM15'} (SPP)
                </span>
              </h2>
              <p className="text-xs text-slate-400">Classic SPP handshake & auto-reconnect</p>
            </div>
          </div>

          {/* Dynamic Status Indicator */}
          <div>
            {renderStatusBadge()}
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-800/60 border border-slate-700/60 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">SRM_ATTENDANCE_ESP32</h3>
                  <p className="text-[11px] font-mono text-indigo-300">Port: {hwStatus?.port || 'COM15'} (115200 baud)</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                USB Debug: COM13
              </span>
            </div>

            {/* Live Telemetry details */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Windows Virtual Port:</span>
                <span className={`font-mono font-semibold ${hwStatus?.port_present_on_os ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hwStatus?.port_present_on_os ? `${hwStatus?.port || 'COM15'} Present` : `${hwStatus?.port || 'COM15'} Not Mounted`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Successful Heartbeat:</span>
                <span className="text-emerald-400 font-mono text-[11px]">
                  {activeSession?.last_successful_heartbeat || hwStatus?.last_heartbeat || 'None yet'}
                </span>
              </div>

              {activeSession && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Watchdog Status:</span>
                  <span className={`font-mono font-semibold ${activeSession.consecutive_failures > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {activeSession.consecutive_failures > 0 ? `${activeSession.consecutive_failures}/3 Misses (Warning)` : 'Healthy (0 Misses)'}
                  </span>
                </div>
              )}
            </div>

            {/* Windows Virtual Port Diagnostic Alert */}
            {hwStatus && !hwStatus.port_present_on_os && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                  Windows Bluetooth Toggled Recovery Guide:
                </p>
                <p className="text-slate-300 leading-relaxed">
                  When Windows Bluetooth is toggled OFF and ON, Windows unmounts the virtual COM link.
                  To restore it: Open <strong>Windows Settings &gt; Bluetooth &amp; devices &gt; Devices</strong>, find <strong>SRM_ATTENDANCE_ESP32</strong> and ensure it is paired/connected, then click <strong>Reconnect ESP32</strong> below.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {pingResult && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{pingResult}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleManualReconnect}
          disabled={loadingReconnect || loadingPing}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingReconnect ? 'animate-spin' : ''}`} />
          {loadingReconnect ? 'Connecting...' : 'Reconnect ESP32'}
        </button>

        <button
          onClick={handleTestPing}
          disabled={loadingPing || loadingReconnect}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20"
        >
          <Activity className={`w-3.5 h-3.5 ${loadingPing ? 'animate-spin' : ''}`} />
          {loadingPing ? `Pinging ${hwStatus?.port || 'COM15'}...` : 'Test PING Handshake'}
        </button>
      </div>
    </div>
  );
}
