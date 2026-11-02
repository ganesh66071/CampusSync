import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Upload,
  Clock,
  MapPin,
  User,
  Calendar,
  Bell,
  Shield,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
  Check,
  X,
  Filter,
  Printer,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Building,
  Phone,
  Mail,
  RefreshCw,
  UserPlus,
  FileCheck,
  AlertCircle,
  Info,
  CalendarCheck,
  ChevronDown,
  Palette
} from "lucide-react";
import "./App.css";
import { InteractiveCanvas, CampusSkylineSVG } from "./components/BackgroundLayers";

const API_BASE = "http://localhost:8000/api";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEPARTMENTS = ["All", "AIML", "CSE", "ECE", "IT", "MECH"];

const BACKGROUND_THEMES = [
  { id: "blueprint", name: "Campus Blueprint", class: "theme-blueprint", orbColor1: "bg-cyan-500/20", orbColor2: "bg-emerald-500/18", orbColor3: "bg-indigo-500/15", badge: "📐" },
  { id: "aurora", name: "Aurora Glow", class: "bg-mesh-aurora", orbColor1: "bg-emerald-500/15", orbColor2: "bg-indigo-500/18", orbColor3: "bg-sky-500/15", badge: "🌌" },
  { id: "nebula", name: "Midnight Nebula", class: "theme-nebula", orbColor1: "bg-purple-500/20", orbColor2: "bg-pink-500/18", orbColor3: "bg-indigo-500/18", badge: "🔮" },
  { id: "emerald", name: "Emerald Campus", class: "theme-emerald", orbColor1: "bg-emerald-500/25", orbColor2: "bg-teal-500/20", orbColor3: "bg-green-500/18", badge: "🍃" },
  { id: "cyber", name: "Cyber Matrix", class: "theme-cyber", orbColor1: "bg-blue-500/20", orbColor2: "bg-cyan-500/20", orbColor3: "bg-violet-500/18", badge: "⚡" },
];

// Helper time formatters
const formatTime12 = (time) => {
  if (!time) return "--";
  const parts = String(time).split(":");
  if (parts.length < 2) return time;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const formatTimeRange = (start, end) => {
  if (!start || !end) return "--";
  return `${formatTime12(start)} - ${formatTime12(end)}`;
};

export default function App() {
  const [activeApp, setActiveApp] = useState("student"); // 'student' | 'admin'
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toasts, setToasts] = useState([]);
  const [bgTheme, setBgTheme] = useState(() => localStorage.getItem("campus_bg_theme") || "blueprint");
  const [showThemePicker, setShowThemePicker] = useState(false);

  const currentTheme = BACKGROUND_THEMES.find((t) => t.id === bgTheme) || BACKGROUND_THEMES[0];

  const handleSelectTheme = (id) => {
    setBgTheme(id);
    localStorage.setItem("campus_bg_theme", id);
    setShowThemePicker(false);
    const chosen = BACKGROUND_THEMES.find((t) => t.id === id);
    addToast(`Background switched to ${chosen?.badge} ${chosen?.name}`, "info");
  };

  // Toast notification helper
  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`min-h-screen ${currentTheme.class} text-slate-100 font-sans relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200`}>
      {/* Interactive Particle Constellation Canvas */}
      <InteractiveCanvas theme={bgTheme} />

      {/* Collegiate Architectural Skyline Silhouette Layer */}
      <CampusSkylineSVG />

      {/* Geometric Grid & Dot Matrix Textures */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay opacity-40 z-0 no-print" />
      <div className="fixed inset-0 pointer-events-none bg-dots-overlay opacity-25 z-0 no-print" />
      <div className="fixed inset-0 pointer-events-none bg-radial-vignette z-0 no-print" />

      {/* Background Animated Dynamic Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 no-print">
        <div className={`aurora-orb-1 absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full ${currentTheme.orbColor1} blur-[130px]`} />
        <div className={`aurora-orb-2 absolute top-[20%] right-[-10%] w-[650px] h-[650px] rounded-full ${currentTheme.orbColor2} blur-[150px]`} />
        <div className={`aurora-orb-3 absolute bottom-[-10%] left-[25%] w-[600px] h-[600px] rounded-full ${currentTheme.orbColor3} blur-[140px]`} />
      </div>

      {/* Floating In-App Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none no-print">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-xl border animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              toast.type === "success"
                ? "bg-slate-900/90 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40"
                : toast.type === "error"
                ? "bg-slate-900/90 border-rose-500/40 text-rose-300 shadow-rose-950/40"
                : "bg-slate-900/90 border-sky-500/40 text-sky-300 shadow-sky-950/40"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-sky-400 shrink-0" />
              )}
              <span className="text-sm font-medium text-slate-100">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Glass Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Clock */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveApp("student")}>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/30">
                <Calendar className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-white font-display">CampusSync</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    v2.4
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">Faculty Availability & OD Hub</p>
              </div>
            </div>

            {/* Live Clock Chip */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 px-3.5 py-1.5 rounded-full text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-200">
                {currentTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="text-slate-500">|</span>
              <span className="font-mono text-emerald-300">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Controls: Theme Selector + Navigation Mode Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Background Theme Selector Popover */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-700/60 text-xs font-semibold transition-all shadow-sm"
                title="Change Background Atmosphere"
              >
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{currentTheme.badge} {currentTheme.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showThemePicker && (
                <div className="absolute right-0 sm:left-0 top-full mt-2 w-52 glass-panel bg-slate-950/95 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 tracking-wider">
                    Background Style
                  </div>
                  <div className="space-y-1">
                    {BACKGROUND_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          bgTheme === theme.id
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                            : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{theme.badge}</span>
                          <span>{theme.name}</span>
                        </span>
                        {bgTheme === theme.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Mode Pill */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/60 shadow-inner">
              <button
                onClick={() => setActiveApp("student")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 sm:gap-2 ${
                  activeApp === "student"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden xs:inline">Student</span>
                <span className="hidden sm:inline">Portal</span>
              </button>
              <button
                onClick={() => setActiveApp("admin")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 sm:gap-2 ${
                  activeApp === "admin"
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden xs:inline">Admin</span>
                <span className="hidden sm:inline">Center</span>
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* Main App Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {activeApp === "student" ? <StudentApp addToast={addToast} /> : <AdminApp addToast={addToast} />}
      </main>

      <footer className="mt-16 border-t border-slate-800/60 py-8 text-center text-xs text-slate-500 no-print">
        CampusSync • Automated Faculty Timetable & Smart On-Duty Workflow Platform
      </footer>
    </div>
  );
}

// ==========================================
// STUDENT PORTAL
// ==========================================

function StudentApp({ addToast }) {
  const [subTab, setSubTab] = useState("availability"); // 'availability' | 'od_passes' | 'appointments'
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedDay, setSelectedDay] = useState(
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()] || "Monday"
  );
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Modals
  const [bookingModalFaculty, setBookingModalFaculty] = useState(null);
  const [showODModal, setShowODModal] = useState(false);
  const [odSlipToPrint, setOdSlipToPrint] = useState(null);

  // OD requests & appointments
  const [odRequests, setOdRequests] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);

  // Fetch all faculty on mount or when selectedDay changes
  const fetchFaculty = () => {
    setLoading(true);
    const dayParam = selectedDay ? `?day=${encodeURIComponent(selectedDay)}` : "";
    fetch(`${API_BASE}/faculty${dayParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFacultyList(data);
          // If we had a selected faculty, update its active details
          if (selectedFaculty) {
            const updated = data.find((f) => f.faculty_id === selectedFaculty.faculty_id);
            if (updated) setSelectedFaculty(updated);
          }
        }
      })
      .catch((err) => console.error("Error fetching faculty:", err))
      .finally(() => setLoading(false));
  };

  const fetchODRequests = () => {
    fetch(`${API_BASE}/od-requests`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOdRequests(data);
      })
      .catch((err) => console.error("Error fetching OD requests:", err));
  };

  const fetchAppointments = () => {
    fetch(`${API_BASE}/appointments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMyAppointments(data);
      })
      .catch((err) => console.error("Error fetching appointments:", err));
  };

  useEffect(() => {
    fetchFaculty();
  }, [selectedDay]);

  useEffect(() => {
    fetchODRequests();
    fetchAppointments();
  }, []);

  const handleNotify = (fac) => {
    if (!fac) return;
    fetch(`${API_BASE}/faculty/${fac.faculty_id}/notify`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        addToast(data.message || "Notification registered! We will ping you when free.", "info");
      })
      .catch(() => addToast("Alert subscription registered!", "info"));
  };

  // Filtered faculty list
  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const matchSearch =
        !search.trim() ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.department && f.department.toLowerCase().includes(search.toLowerCase())) ||
        (f.designation && f.designation.toLowerCase().includes(search.toLowerCase()));
      const matchDept = selectedDept === "All" || (f.department && f.department.toUpperCase().includes(selectedDept));
      return matchSearch && matchDept;
    });
  }, [facultyList, search, selectedDept]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Student Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 no-print">
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSubTab("availability")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              subTab === "availability"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Faculty Availability</span>
          </button>
          <button
            onClick={() => setSubTab("od_passes")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              subTab === "od_passes"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>On-Duty (OD) Passes</span>
            {odRequests.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/30 text-indigo-300 font-bold">
                {odRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab("appointments")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              subTab === "appointments"
                ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-sm shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>My Appointments</span>
            {myAppointments.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-teal-500/30 text-teal-300 font-bold">
                {myAppointments.length}
              </span>
            )}
          </button>
        </div>

        {subTab === "od_passes" && (
          <button
            onClick={() => setShowODModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply for New OD Pass</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: FACULTY AVAILABILITY & LIVE TIMETABLE               */}
      {/* ========================================================= */}
      {subTab === "availability" && (
        <div className="space-y-8">
          {/* Hero Search & Controls */}
          <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
              Smart Faculty Directory & Schedule
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              Check live presence in cabins, browse weekly schedules, and book direct appointments with professors.
            </p>
          </div>

          {/* Search Bar & Day Switcher */}
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
              </div>
              <input
                type="text"
                className="w-full glass-input text-white rounded-2xl pl-12 pr-10 py-4 focus:outline-none transition-all text-base sm:text-lg shadow-xl"
                placeholder="Search by professor name, department, or cabin location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Row: Days of Week + Department Pills */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-3.5 rounded-2xl">
              {/* Day Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" /> Day:
                </span>
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      selectedDay.toLowerCase() === day.toLowerCase()
                        ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>

              {/* Department Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5" /> Dept:
                </span>
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      selectedDept === dept
                        ? "bg-indigo-500 text-white shadow-md font-bold"
                        : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Selected Faculty Inspector (if clicked) */}
          {selectedFaculty && (
            <div className="max-w-4xl mx-auto glass-card rounded-2xl border-emerald-500/30 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-6 sm:p-8 border-b border-slate-700/60 bg-gradient-to-r from-slate-900/90 via-slate-800/70 to-slate-900/90 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-2xl font-display shadow-inner">
                    {selectedFaculty.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/, "").charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white font-display">{selectedFaculty.name}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {selectedFaculty.department}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-slate-400 text-sm">{selectedFaculty.designation}</p>
                      {selectedFaculty.designation && selectedFaculty.designation.toUpperCase().includes("HOD") && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          👑 HOD
                        </span>
                      )}
                      {selectedFaculty.designation && selectedFaculty.designation.toLowerCase().includes("coordinator") && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          📌 Year Coordinator
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {selectedFaculty.location || "Staff Room"}
                      </span>
                      {selectedFaculty.office_hours && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" /> {selectedFaculty.office_hours}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge + CTA */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        selectedFaculty.available_now
                          ? "bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse"
                          : "bg-amber-400 shadow-[0_0_10px_#fbbf24]"
                      }`}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {selectedFaculty.available_now ? "Available Now" : selectedFaculty.current_status || "Busy"}
                    </span>
                  </div>

                  <button
                    onClick={() => setBookingModalFaculty(selectedFaculty)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <CalendarCheck className="w-4 h-4" /> Book Slot
                  </button>
                  <button
                    onClick={() => setSelectedFaculty(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Schedule Timeline */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>{selectedDay} Schedule</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Recommended Visit:{" "}
                    <strong className="text-emerald-400">{selectedFaculty.best_time_recommended || "Any free slot"}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedFaculty.today_schedule && selectedFaculty.today_schedule.length > 0 ? (
                    selectedFaculty.today_schedule.map((slot, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          slot.status === "FREE"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
                            : slot.status === "LUNCH"
                            ? "bg-slate-800/40 border-slate-700/60 text-slate-400"
                            : "bg-slate-800/80 border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-medium opacity-80">
                            {formatTimeRange(slot.start_time, slot.end_time)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              slot.status === "FREE"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : slot.status === "LUNCH"
                                ? "bg-slate-700 text-slate-300"
                                : "bg-indigo-500/20 text-indigo-300"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white truncate">{slot.subject}</div>
                        {slot.room && <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {slot.room}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                      No scheduled periods recorded for {selectedDay}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Faculty Grid Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Showing {filteredFaculty.length} faculty members</span>
              <span className="text-xs">Schedule showing for: <strong className="text-emerald-400">{selectedDay}</strong></span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="glass-card rounded-2xl p-6 h-56 animate-pulse bg-slate-800/40" />
                ))}
              </div>
            ) : filteredFaculty.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFaculty.map((fac) => {
                  const isAvailable = fac.available_now;
                  return (
                    <div
                      key={fac.faculty_id}
                      className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all group shadow-lg"
                    >
                      <div className="space-y-4">
                        {/* Card Header: Avatar + Status Pill */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-bold text-lg text-emerald-400 font-display">
                              {fac.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/, "").charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                                {fac.name}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <p className="text-xs text-slate-400">
                                  {fac.department} • {fac.designation}
                                </p>
                                {fac.designation && fac.designation.toUpperCase().includes("HOD") && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    👑 HOD
                                  </span>
                                )}
                                {fac.designation && fac.designation.toLowerCase().includes("coordinator") && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    📌 Year Coordinator
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5 shrink-0 ${
                              isAvailable
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isAvailable ? "bg-emerald-400 animate-ping" : "bg-slate-500"
                              }`}
                            />
                            {isAvailable ? "Free" : fac.current_status || "Busy"}
                          </span>
                        </div>

                        {/* Location & Best Time */}
                        <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location:
                            </span>
                            <span className="font-medium text-slate-200">{fac.location || "Staff Room"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Best Time ({selectedDay}):
                            </span>
                            <span className="font-semibold text-emerald-400">
                              {fac.best_time_recommended && fac.best_time_recommended.includes(" - ")
                                ? formatTimeRange(
                                    fac.best_time_recommended.split(" - ")[0],
                                    fac.best_time_recommended.split(" - ")[1]
                                  )
                                : fac.best_time_recommended || "Check schedule"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFaculty(fac)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Full Schedule</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setBookingModalFaculty(fac)}
                          className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold py-2 px-3 rounded-xl transition-colors flex items-center gap-1"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" /> Book
                        </button>
                        {!isAvailable && (
                          <button
                            onClick={() => handleNotify(fac)}
                            title="Notify when free"
                            className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 p-2 rounded-xl transition-colors"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
                <Search className="w-8 h-8 text-slate-500 mx-auto" />
                <h3 className="text-lg font-bold text-white">No faculty found</h3>
                <p className="text-sm text-slate-400">Try adjusting your search query or department filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MY ON-DUTY (OD) PASSES                             */}
      {/* ========================================================= */}
      {subTab === "od_passes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white font-display">My On-Duty (OD) Requests</h2>
              <p className="text-slate-400 text-sm">
                Apply for academic On-Duty approval for hackathons, sports, symposiums, or conferences.
              </p>
            </div>
            <button
              onClick={() => setShowODModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 text-sm transition-all"
            >
              <Sparkles className="w-4 h-4" /> Apply for OD Pass
            </button>
          </div>

          {odRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {odRequests.map((req) => (
                <div
                  key={req.id}
                  className="glass-card rounded-2xl p-6 space-y-4 border border-slate-700/80 shadow-lg relative overflow-hidden"
                >
                  {/* Status Banner */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-indigo-300 border border-indigo-500/30">
                          {req.event_category || "Academic"}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{req.created_at || "Recent"}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">{req.event_name}</h3>
                      <p className="text-xs text-slate-400">
                        Requested to: <strong className="text-slate-200">{req.faculty_name}</strong>
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                        req.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : req.status === "REJECTED"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      {req.status === "APPROVED" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : req.status === "REJECTED" ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {req.status}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Student:</span>
                      <span className="text-slate-200 font-medium">
                        {req.student_name} ({req.student_roll})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date & Duration:</span>
                      <span className="text-slate-200 font-medium">
                        {req.event_date} • {req.periods}
                      </span>
                    </div>
                    {req.reason && (
                      <div className="col-span-2 pt-1 border-t border-slate-800/60 mt-1">
                        <span className="text-slate-500 block">Purpose:</span>
                        <span className="text-slate-300">{req.reason}</span>
                      </div>
                    )}
                    {req.comment && (
                      <div className="col-span-2 pt-1 border-t border-slate-800/60 mt-1 text-emerald-400">
                        <span className="text-slate-400 block text-[10px]">Faculty Remark:</span>
                        <span className="font-semibold">"{req.comment}"</span>
                      </div>
                    )}
                  </div>

                  {/* Footer CTAs */}
                  <div className="flex items-center justify-between pt-2">
                    {req.proof_url ? (
                      <a
                        href={req.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Proof Link
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No proof URL</span>
                    )}

                    {req.status === "APPROVED" && (
                      <button
                        onClick={() => setOdSlipToPrint(req)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" /> View & Print Slip
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
              <FileCheck className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">No OD Passes Yet</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Need to represent your college in an event? Apply for an OD slip to get official attendance credit.
              </p>
              <button
                onClick={() => setShowODModal(true)}
                className="bg-emerald-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm"
              >
                Apply Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MY BOOKED APPOINTMENTS                             */}
      {/* ========================================================= */}
      {subTab === "appointments" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white font-display">My Booked Appointments</h2>
              <p className="text-slate-400 text-sm">Review your upcoming faculty consultations and meetings.</p>
            </div>
            <button
              onClick={() => setSubTab("availability")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" /> Book with another professor
            </button>
          </div>

          {myAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAppointments.map((appt) => (
                <div key={appt.id} className="glass-card rounded-2xl p-5 space-y-3 border-slate-700/80 shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        {appt.day}
                      </span>
                      <h3 className="text-base font-bold text-white">{appt.faculty_name || "Faculty Member"}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      {appt.status || "CONFIRMED"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{appt.time_slot}</span>
                    </div>
                    <div className="text-slate-400 pt-1">
                      Purpose: <span className="text-slate-200">{appt.purpose}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Student: {appt.student_name} ({appt.student_roll || "N/A"})</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Booked Appointments</h3>
              <p className="text-xs text-slate-400">
                Browse faculty schedules in the availability tab to reserve a free consultation slot.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Book Appointment */}
      {bookingModalFaculty && (
        <AppointmentModal
          faculty={bookingModalFaculty}
          onClose={() => setBookingModalFaculty(null)}
          onSuccess={() => {
            setBookingModalFaculty(null);
            fetchAppointments();
            addToast(`Appointment booked successfully with ${bookingModalFaculty.name}!`, "success");
          }}
        />
      )}

      {/* MODAL: Apply for OD Pass */}
      {showODModal && (
        <ODApplicationModal
          faculties={facultyList}
          onClose={() => setShowODModal(false)}
          onSuccess={() => {
            setShowODModal(false);
            fetchODRequests();
            addToast("OD Request submitted! Awaiting faculty verification.", "success");
          }}
        />
      )}

      {/* MODAL: Printable OD Pass Slip */}
      {odSlipToPrint && <PrintableODSlipModal od={odSlipToPrint} onClose={() => setOdSlipToPrint(null)} />}
    </div>
  );
}

// ==========================================
// ADMIN DASHBOARD & WORKFLOWS
// ==========================================

function AdminApp({ addToast }) {
  const [adminTab, setAdminTab] = useState("dashboard"); // 'dashboard' | 'od_approvals' | 'attendance_sync' | 'ocr_upload'
  const [stats, setStats] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [odList, setOdList] = useState([]);
  const [appointmentList, setAppointmentList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Status override modal / prompt
  const [statusOverrideFac, setStatusOverrideFac] = useState(null);
  const [overrideValue, setOverrideValue] = useState("Available");

  // OCR state
  const [file, setFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);

  const fetchStats = () => {
    fetch(`${API_BASE}/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((e) => console.error("Stats error", e));
  };

  const fetchAttendanceData = () => {
    setSyncLoading(true);
    Promise.all([
      fetch(`${API_BASE}/attendance/records`).then((r) => r.json()),
      fetch(`${API_BASE}/attendance/audit-log`).then((r) => r.json())
    ])
      .then(([recData, logData]) => {
        if (recData?.records) setAttendanceRecords(recData.records);
        if (logData?.logs) setAuditLogs(logData.logs);
      })
      .catch((e) => console.error("Attendance fetch error", e))
      .finally(() => setSyncLoading(false));
  };

  const fetchAllFaculty = () => {
    fetch(`${API_BASE}/faculty`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setFacultyList(data);
      })
      .catch((e) => console.error("Faculty error", e));
  };

  const fetchODs = () => {
    fetch(`${API_BASE}/od-requests`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOdList(data);
      })
      .catch((e) => console.error("ODs error", e));
  };

  const fetchAppts = () => {
    fetch(`${API_BASE}/appointments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAppointmentList(data);
      })
      .catch((e) => console.error("Appointments error", e));
  };

  useEffect(() => {
    fetchStats();
    fetchAllFaculty();
    fetchODs();
    fetchAppts();
    fetchAttendanceData();
  }, []);

  const handleUpdateODStatus = (id, newStatus) => {
    const comment = prompt(`Enter comments or signature remarks for ${newStatus}:`, "Approved by faculty in-charge.");
    if (comment === null) return; // user cancelled

    fetch(`${API_BASE}/od-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, comment: comment || "" }),
    })
      .then((res) => res.json())
      .then((data) => {
        addToast(data.message || `OD request marked as ${newStatus}`, "success");
        fetchODs();
        fetchStats();
      })
      .catch(() => addToast("Error updating OD status", "error"));
  };

  const handleApplyStatusOverride = (facId, override) => {
    fetch(`${API_BASE}/faculty/${facId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_override: override || null }),
    })
      .then((res) => res.json())
      .then((data) => {
        addToast(`Faculty status overridden to "${override || "Auto Schedule"}"`, "success");
        fetchAllFaculty();
        setStatusOverrideFac(null);
      })
      .catch(() => addToast("Error updating faculty override", "error"));
  };

  // OCR Upload
  const handleUploadOCR = () => {
    if (!file) return;
    setOcrLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    fetch(`${API_BASE}/admin/timetable/upload`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then((data) => {
        if (data && data.entries) {
          setVerificationData(data);
          addToast("Timetable OCR extracted successfully! Review before saving.", "success");
        } else {
          addToast("Invalid OCR response structure", "error");
        }
      })
      .catch((err) => {
        console.error(err);
        addToast("Error running OCR timetable extraction", "error");
      })
      .finally(() => {
        setOcrLoading(false);
      });
  };

  const handleVerifyCommit = () => {
    if (!verificationData) return;
    fetch(`${API_BASE}/admin/timetable/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verificationData),
    })
      .then((res) => res.json())
      .then((data) => {
        addToast(data.message || "Timetable verified and saved into database!", "success");
        setVerificationData(null);
        setFile(null);
        fetchAllFaculty();
        fetchStats();
      })
      .catch(() => addToast("Error saving verified timetable", "error"));
  };

  const pendingODCount = odList.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Admin Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl p-4 border-emerald-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Faculty Members</span>
            <User className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-display">
            {stats ? stats.total_faculty : facultyList.length}
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">Active across depts</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending OD</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-display">
            {pendingODCount}
          </div>
          <span className="text-[10px] text-amber-400 font-semibold mt-1 block">Awaiting approval</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border-purple-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Approved ODs</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 mt-2 font-display">
            {stats?.approved_od_requests ?? odList.filter(o => o.status === 'APPROVED').length}
          </div>
          <span className="text-[10px] text-purple-400 font-semibold mt-1 block">Sanctioned passes</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border-cyan-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>OD Attendance</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 mt-2 font-display">
            {stats?.od_attendance_count ?? attendanceRecords.filter(r => r.status && r.status.includes('OD')).length}
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold mt-1 block">OD – PRESENT slots</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border-indigo-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Appointments</span>
            <CalendarCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-display">
            {stats ? stats.total_appointments : appointmentList.length}
          </div>
          <span className="text-[10px] text-indigo-400 font-semibold mt-1 block">Consultations</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border-teal-500/30">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sync Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-extrabold text-emerald-400 mt-3 font-mono">
            SYNCED
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Shared SQLite Engine</span>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setAdminTab("dashboard")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            adminTab === "dashboard"
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <User className="w-4 h-4" /> Faculty Overrides & Directory
        </button>
        <button
          onClick={() => setAdminTab("od_approvals")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            adminTab === "od_approvals"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileCheck className="w-4 h-4" /> OD Approval Queue
          {pendingODCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-slate-950 font-extrabold">
              {pendingODCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setAdminTab("attendance_sync");
            fetchAttendanceData();
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            adminTab === "attendance_sync"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" /> Attendance Sync & Audit
          {attendanceRecords.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40">
              {attendanceRecords.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab("ocr_upload")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            adminTab === "ocr_upload"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Upload className="w-4 h-4" /> OCR Timetable Ingestion
        </button>
      </div>

      {/* ========================================================= */}
      {/* ADMIN TAB 1: FACULTY MANAGEMENT & STATUS OVERRIDE          */}
      {/* ========================================================= */}
      {adminTab === "dashboard" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Faculty Live Status Management</h2>
              <p className="text-xs text-slate-400">
                Override automated schedules when professors are in urgent meetings, HOD calls, or on leave.
              </p>
            </div>
            <button
              onClick={fetchAllFaculty}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Faculty Member</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Calculated Status</th>
                    <th className="p-4">Override Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {facultyList.map((fac) => (
                    <tr key={fac.faculty_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {fac.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/, "").charAt(0)}
                        </div>
                          <div>
                            <div>{fac.name}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-xs text-slate-400 font-normal">{fac.designation}</span>
                              {fac.designation && fac.designation.toUpperCase().includes("HOD") && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  👑 HOD
                                </span>
                              )}
                              {fac.designation && fac.designation.toLowerCase().includes("coordinator") && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  📌 Year Coordinator
                                </span>
                              )}
                            </div>
                          </div>
                      </td>
                      <td className="p-4 text-slate-300">{fac.department}</td>
                      <td className="p-4 text-slate-400 text-xs">{fac.location}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            fac.available_now
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {fac.current_status || "BUSY"}
                        </span>
                        {fac.status_override && (
                          <span className="block text-[10px] text-indigo-400 mt-1 font-semibold">
                            (Manual: {fac.status_override})
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleApplyStatusOverride(fac.faculty_id, "In Cabin")}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                          >
                            In Cabin
                          </button>
                          <button
                            onClick={() => handleApplyStatusOverride(fac.faculty_id, "In Meeting")}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30"
                          >
                            Meeting
                          </button>
                          <button
                            onClick={() => handleApplyStatusOverride(fac.faculty_id, "On Leave")}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30"
                          >
                            On Leave
                          </button>
                          {fac.status_override && (
                            <button
                              onClick={() => handleApplyStatusOverride(fac.faculty_id, null)}
                              title="Reset to Timetable"
                              className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADMIN TAB 2: OD APPROVAL QUEUE                             */}
      {/* ========================================================= */}
      {adminTab === "od_approvals" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white font-display">Student On-Duty (OD) Approval Queue</h2>
            <p className="text-xs text-slate-400">
              Inspect student event documentation, verify justification, and grant digital authorization.
            </p>
          </div>

          {odList.length > 0 ? (
            <div className="space-y-4">
              {odList.map((req) => (
                <div
                  key={req.id}
                  className="glass-card rounded-2xl p-6 border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-indigo-300 border border-indigo-500/30">
                        {req.event_category || "Academic"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Date: {req.event_date}</span>
                      <span className="text-xs text-slate-400 font-mono">Periods: {req.periods}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          req.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : req.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400 animate-pulse"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{req.event_name}</h3>
                    <p className="text-xs text-slate-300">
                      <strong>{req.student_name}</strong> (Roll: {req.student_roll}) • {req.department} • {req.year}
                    </p>
                    <p className="text-xs text-slate-400 italic">"{req.reason}"</p>

                    {req.proof_url && (
                      <a
                        href={req.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Supporting Proof URL
                      </a>
                    )}
                  </div>

                  {/* Approve / Reject Controls */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleUpdateODStatus(req.id, "APPROVED")}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                    >
                      <Check className="w-4 h-4" /> Approve OD
                    </button>
                    <button
                      onClick={() => handleUpdateODStatus(req.id, "REJECTED")}
                      className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 text-sm">
              No OD applications found in system.
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ADMIN TAB: ATTENDANCE SYNCHRONIZATION & AUDIT TRAIL       */}
      {/* ========================================================= */}
      {adminTab === "attendance_sync" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> Smart Attendance Synchronizer & Audit Logs
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time automated synchronization status connecting OD approvals with ESP32 classroom attendance records.
              </p>
            </div>
            <button
              onClick={fetchAttendanceData}
              disabled={syncLoading}
              className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
              Refresh Sync Records
            </button>
          </div>

          {/* Integration Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border-purple-500/30">
              <span className="text-xs text-slate-400 font-medium">Automatic OD Attendance Rule</span>
              <p className="text-sm text-purple-200 mt-2 font-semibold">OD – PRESENT Exemption</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Approved ODs automatically excuse students from the 3-strike Bluetooth absence detection on the approved date and periods.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-cyan-500/30">
              <span className="text-xs text-slate-400 font-medium">Hardware Safeguard</span>
              <p className="text-sm text-cyan-200 mt-2 font-semibold">Active Anti-Overwrite Lock</p>
              <p className="text-[11px] text-slate-400 mt-1">
                ESP32 Bluetooth background verification checks institutional OD status prior to marking ABSENT.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-emerald-500/30">
              <span className="text-xs text-slate-400 font-medium">Audit Trail Compliance</span>
              <p className="text-sm text-emerald-200 mt-2 font-semibold">Idempotent Synchronization</p>
              <p className="text-[11px] text-slate-400 mt-1">
                All OD approvals, attendance insertions, and potential revocations maintain an immutable audit log.
              </p>
            </div>
          </div>

          {/* Synced Attendance Records Table */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Integrated Attendance Ledger ({attendanceRecords.length})
              </h3>
              <span className="text-xs text-slate-400">Shared SQLite Database (faculty.db)</span>
            </div>

            {attendanceRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Reg Number</th>
                      <th className="py-3 px-4">Dept</th>
                      <th className="py-3 px-4">Date & Slot</th>
                      <th className="py-3 px-4">Mode / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {attendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/40 transition font-mono">
                        <td className="py-3 px-4 font-sans font-bold">
                          {rec.status && rec.status.includes('OD') ? (
                            <span className="inline-flex items-center gap-1.5 text-purple-300 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-semibold">
                              <Sparkles className="w-3 h-3 text-purple-400" /> OD – PRESENT
                            </span>
                          ) : rec.status === 'ABSENT' ? (
                            <span className="inline-flex items-center gap-1 text-rose-400 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] font-semibold">
                              <XCircle className="w-3 h-3" /> ABSENT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> PRESENT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-200">{rec.student_name}</td>
                        <td className="py-3 px-4 text-slate-300 font-semibold">{rec.registration_number}</td>
                        <td className="py-3 px-4 font-sans text-slate-300">{rec.department}</td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          {rec.date} • <span className="text-amber-300">{rec.period_label || 'Period 1'}</span>
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-slate-300">
                          {rec.completion_reason || (rec.attendance_mode === 'OD_EXEMPTION' ? 'Approved On-Duty' : 'ESP32 Bluetooth')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No synchronized attendance records found. Approve an OD request or run a Bluetooth session to generate records.
              </div>
            )}
          </div>

          {/* Audit Logs Table */}
          {auditLogs.length > 0 && (
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
              <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  OD-to-Attendance Audit Trail ({auditLogs.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Transition</th>
                      <th className="py-2.5 px-4">Audit Note</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-4 font-sans font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            log.action === 'SYNCHRONIZE' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-200">{log.registration_number}</td>
                        <td className="py-2.5 px-4 text-slate-300">{log.date} ({log.periods})</td>
                        <td className="py-2.5 px-4 text-slate-300">
                          <span className="text-slate-400">{log.previous_status}</span> &rarr; <span className="text-purple-300 font-semibold">{log.new_status}</span>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-xs text-slate-300">{log.reason}</td>
                        <td className="py-2.5 px-4 text-slate-400">{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ADMIN TAB 3: OCR TIMETABLE INGESTION                       */}
      {/* ========================================================= */}
      {adminTab === "ocr_upload" && (
        <div className="glass-panel p-8 rounded-2xl border border-slate-700/80 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white font-display">Automated Timetable Ingestion</h2>
            <p className="text-slate-400 text-sm">
              Upload faculty schedule photo or PDF for AI-powered optical character recognition & database synchronization.
            </p>
          </div>

          {!verificationData ? (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-10 text-center hover:bg-slate-800/30 transition-all group cursor-pointer">
                <Upload className="w-12 h-12 text-slate-500 group-hover:text-emerald-400 mx-auto mb-4 transition-colors" />
                <p className="text-base font-semibold text-slate-200 mb-1">Upload Faculty Timetable Sheet</p>
                <p className="text-xs text-slate-500 mb-6">Supports PNG, JPG, PDF snapshots</p>
                <input
                  type="file"
                  className="hidden"
                  id="admin-ocr-file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <label
                  htmlFor="admin-ocr-file"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-600/30"
                >
                  Browse Document
                </label>
                {file && <p className="mt-4 text-emerald-400 text-xs font-semibold">Selected: {file.name}</p>}
              </div>

              <button
                onClick={handleUploadOCR}
                disabled={!file || ocrLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {ocrLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Document with OCR Engine...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Parse Timetable</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-emerald-400 text-sm">Extraction Ready for Verification</h3>
                  <p className="text-xs text-slate-300">
                    Verify faculty name, department, and periods below before writing to database.
                  </p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                  <label className="text-xs text-slate-400 block mb-1">Faculty Name</label>
                  <input
                    value={verificationData.faculty_name}
                    onChange={(e) => setVerificationData({ ...verificationData, faculty_name: e.target.value })}
                    className="w-full bg-transparent text-white font-semibold outline-none border-b border-slate-700 focus:border-emerald-500 pb-1"
                  />
                </div>
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                  <label className="text-xs text-slate-400 block mb-1">Department</label>
                  <input
                    value={verificationData.department}
                    onChange={(e) => setVerificationData({ ...verificationData, department: e.target.value })}
                    className="w-full bg-transparent text-white font-semibold outline-none border-b border-slate-700 focus:border-emerald-500 pb-1"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/80 max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Day</th>
                      <th className="p-3">Time Range</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {verificationData.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="p-3 font-semibold text-white">{entry.day}</td>
                        <td className="p-3 text-slate-400">
                          {entry.start_time} - {entry.end_time}
                        </td>
                        <td className="p-3 text-slate-200">{entry.subject}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.status === "FREE"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  onClick={() => setVerificationData(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Discard
                </button>
                <button
                  onClick={handleVerifyCommit}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Confirm & Sync to Database
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODALS
// ==========================================

function AppointmentModal({ faculty, onClose, onSuccess }) {
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [day, setDay] = useState("Monday");
  const [timeSlot, setTimeSlot] = useState(
    faculty.best_time_recommended || "10:20 - 11:10"
  );
  const [purpose, setPurpose] = useState("Academic Doubts & Consultation");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentName.trim()) return alert("Please enter your name");
    setLoading(true);

    fetch(`${API_BASE}/faculty/${faculty.faculty_id}/appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: studentName,
        student_roll: studentRoll,
        student_email: studentEmail,
        faculty_name: faculty.name,
        day,
        time_slot: timeSlot,
        purpose,
      }),
    })
      .then((res) => res.json())
      .then(() => onSuccess())
      .catch((err) => {
        console.error(err);
        alert("Error booking appointment");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full rounded-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 border-slate-700 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-white font-display">Book Faculty Appointment</h3>
            <p className="text-xs text-slate-400 mt-1">
              Reserve slot with <strong className="text-emerald-400">{faculty.name}</strong> ({faculty.department})
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Your Full Name *</label>
            <input
              required
              className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
              placeholder="e.g. Aakash Sharma"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Roll Number</label>
              <input
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                placeholder="e.g. 22AIML042"
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Email Address</label>
              <input
                type="email"
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                placeholder="student@college.edu"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Preferred Day</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full glass-input bg-slate-900 text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Time Slot</label>
              <input
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="e.g. 10:20 - 11:10"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Consultation Purpose</label>
            <textarea
              rows={2}
              className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm resize-none"
              placeholder="e.g. Clarification on AI project module and OD signature"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
            >
              {loading ? "Confirming..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ODApplicationModal({ faculties, onClose, onSuccess }) {
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [department, setDepartment] = useState("AIML");
  const [year, setYear] = useState("3rd Year");
  const [facultyId, setFacultyId] = useState(faculties[0]?.faculty_id || 1);
  const [eventName, setEventName] = useState("");
  const [eventCategory, setEventCategory] = useState("Hackathon");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [periods, setPeriods] = useState("Period 1 - Period 4");
  const [reason, setReason] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentName.trim() || !eventName.trim()) return alert("Please fill in student name and event name");

    const fac = faculties.find((f) => String(f.faculty_id) === String(facultyId));
    setLoading(true);

    fetch(`${API_BASE}/od-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: studentName,
        student_roll: studentRoll,
        department,
        year,
        faculty_id: Number(facultyId),
        faculty_name: fac?.name || "Faculty In-Charge",
        event_name: eventName,
        event_category: eventCategory,
        event_date: eventDate,
        periods,
        reason,
        proof_url: proofUrl,
      }),
    })
      .then((res) => res.json())
      .then(() => onSuccess())
      .catch((err) => {
        console.error(err);
        alert("Error submitting OD pass request");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card max-w-xl w-full rounded-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-white font-display">Apply for On-Duty (OD) Pass</h3>
            <p className="text-xs text-slate-400 mt-1">Submit academic absence authorization for official events.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Student Full Name *</label>
              <input
                required
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                placeholder="e.g. Deepika V."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Roll Number *</label>
              <input
                required
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                placeholder="e.g. 22CSE108"
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full glass-input bg-slate-900 text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
              >
                {["AIML", "CSE", "ECE", "IT", "MECH"].map((d) => (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Year of Study</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full glass-input bg-slate-900 text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
              >
                {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Faculty Member for Approval *</label>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="w-full glass-input bg-slate-900 text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
            >
              {faculties.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id} className="bg-slate-900 text-white">
                  {f.name} ({f.department} - {f.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Event Name *</label>
              <input
                required
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                placeholder="e.g. Smart India Hackathon 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Category</label>
              <select
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                className="w-full glass-input bg-slate-900 text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
              >
                {["Hackathon", "Sports", "Symposium", "Paper Presentation", "Workshop", "Cultural"].map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Event Date</label>
              <input
                type="date"
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Periods Affected</label>
              <input
                className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
                placeholder="e.g. Periods 1 - 4 (08:30 - 12:00)"
                value={periods}
                onChange={(e) => setPeriods(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Justification & Details</label>
            <textarea
              rows={2}
              className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm resize-none"
              placeholder="State reason, team name, or selection criteria..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Proof Document URL (Drive / Portal link)</label>
            <input
              type="url"
              className="w-full glass-input text-white rounded-xl px-3.5 py-2.5 outline-none text-sm"
              placeholder="https://drive.google.com/file/... or official invite link"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
            >
              {loading ? "Submitting..." : "Submit OD Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrintableODSlipModal({ od, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      {/* Container for both Modal & Print */}
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <div className="flex justify-between items-center no-print">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Official Verified OD Pass Slip
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Slip Document */}
        <div className="p-8 bg-white text-slate-900 rounded-2xl border-2 border-slate-300 space-y-6 shadow-sm">
          {/* Institution Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <h2 className="text-2xl font-black tracking-wider uppercase font-display">CAMPUS ACADEMIC COUNCIL</h2>
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest mt-0.5">
              Official Student On-Duty (OD) Sanction Slip
            </p>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-3">
              <span>Pass Ref: OD-{od.id}-2026-X</span>
              <span>Sanction Date: {od.created_at || "2026-10-09"}</span>
            </div>
          </div>

          {/* Student & Event Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-200 p-3 rounded-lg bg-slate-50">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Student Name</span>
              <strong className="text-sm text-slate-900 block">{od.student_name}</strong>
              <span className="text-slate-600">Roll No: {od.student_roll}</span>
              <span className="block text-slate-600">{od.department} • {od.year}</span>
            </div>

            <div className="border border-slate-200 p-3 rounded-lg bg-slate-50">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Event & Sanction</span>
              <strong className="text-sm text-slate-900 block">{od.event_name}</strong>
              <span className="text-slate-600">Category: {od.event_category}</span>
              <span className="block text-slate-600">Date: {od.event_date} ({od.periods})</span>
            </div>
          </div>

          {/* Purpose & Justification */}
          <div className="text-xs border border-slate-200 p-3 rounded-lg">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Justification & Details</span>
            <p className="text-slate-800 mt-1">{od.reason || "Approved for official college representation."}</p>
          </div>

          {/* Approval & Signature Block */}
          <div className="border-t-2 border-slate-900 pt-4 flex items-end justify-between text-xs">
            <div>
              <div className="inline-block px-3 py-1 bg-emerald-100 border border-emerald-500 text-emerald-800 font-bold uppercase rounded text-[11px] tracking-wider">
                ✓ STATUS: APPROVED & SANCTIONED
              </div>
              {od.comment && <p className="text-[11px] text-slate-600 mt-1 font-medium">Remarks: "{od.comment}"</p>}
            </div>

            <div className="text-right">
              <div className="font-mono text-xs font-bold text-slate-800">Digitally Signed & Verified</div>
              <div className="text-xs text-slate-900 font-semibold mt-0.5">{od.faculty_name}</div>
              <div className="text-[10px] text-slate-500">Faculty Coordinator / HOD</div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2 font-mono">
            This document serves as an authorized attendance waiver pass under College Regulation 14-B.
          </div>
        </div>
      </div>
    </div>
  );
}