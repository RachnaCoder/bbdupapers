import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, X, FileText, Loader2, ChevronRight, GraduationCap, BookOpen, Calendar, Hash, AlertCircle } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import UploadModal from "./components/UploadModal";
import PaperCard from "./components/PaperCard";
import api from "./services/api";
import { User, Paper, AuthResponse } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingPaperId, setViewingPaperId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    course: "",
    branch: "",
    semester: "",
    examYear: "",
    year: "",
  });

  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch (error) {
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const fetchPapers = useCallback(async () => {
    try {
      const { data } = await api.get("/papers", { params: filters });
      if (Array.isArray(data)) {
        setPapers(data);
      } else {
        console.error("Expected array of papers, got:", data);
        setPapers([]);
      }
    } catch (error: any) {
      toast.error(error.presentableMessage || "Failed to fetch papers");
      setPapers([]);
    }
  }, [filters]);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/view/")) {
      const id = path.split("/")[2];
      if (id) {
        setViewingPaperId(id);
      }
    }
  }, []);

  const handleAuthSuccess = (data: AuthResponse) => {
    localStorage.setItem("token", data.token);
    setUser(data.user);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    toast.success("Logged out successfully");
  };

  const handleDeletePaper = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this paper? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/papers/${id}`);
      toast.success("Paper deleted successfully");
      fetchPapers();
    } catch (err: any) {
      toast.error(err.presentableMessage || "Failed to delete paper");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      course: "",
      branch: "",
      semester: "",
      examYear: "",
      year: "",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Toaster position="top-right" />
      
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="relative mb-24 p-8 sm:p-20 bg-zinc-900 dark:bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl shadow-brand-500/10 border border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(70,99,237,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-transparent to-brand-900/30" />
          
          {/* Decorative Elements */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[150px] animate-pulse delay-1000" />
          
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full mb-8 backdrop-blur-md">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-ping" />
              </div>
              <h1 className="text-6xl sm:text-8xl font-black text-white tracking-tight mb-8 leading-[0.95]">
                Master your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-300 to-brand-200">Exams</span>
              </h1>
              <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                The ultimate repository for previous year question papers. Search, download, and share with your peers in seconds.
              </p>
              
              <div className="relative group max-w-2xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-brand-400 rounded-3xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200" />
                <div className="relative flex items-center bg-white border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                  <Search className="ml-6 w-6 h-6 text-zinc-500 group-focus-within:text-brand-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by subject name or code..."
                    className="w-full pl-4 pr-6 py-6 bg-transparent text-black placeholder:text-zinc-500 focus:outline-none text-xl font-medium"
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Sidebar Container */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="sticky top-28 space-y-8">
              {/* Filters Sidebar */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3 font-black text-zinc-900 dark:text-white text-xl font-display">
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-xl">
                      <Filter className="w-5 h-5 text-brand-600" />
                    </div>
                    <span>Filters</span>
                  </div>
                  <button
                    onClick={clearFilters}
                    className="text-[10px] text-brand-600 dark:text-brand-400 hover:text-brand-700 font-black uppercase tracking-[0.2em] transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ml-1">Course</label>
                    <div className="relative">
                      <select
                        className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none cursor-pointer"
                        value={filters.course}
                        onChange={(e) => handleFilterChange("course", e.target.value)}
                      >
                        <option value="">All Courses</option>
                        <option value="B.Tech">B.Tech</option>
                        <option value="B.Sc">B.Sc</option>
                        <option value="MBA">MBA</option>
                        <option value="M.Tech">M.Tech</option>
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ml-1">Semester</label>
                    <div className="relative">
                      <select
                        className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none cursor-pointer"
                        value={filters.semester}
                        onChange={(e) => handleFilterChange("semester", e.target.value)}
                      >
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={`Semester ${s}`}>Semester {s}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ml-1">Exam Year</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="number"
                        placeholder="e.g. 2023"
                        className="w-full pl-12 pr-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        value={filters.examYear}
                        onChange={(e) => handleFilterChange("examYear", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Help Section */}
              <div className="bg-brand-600 p-8 rounded-[2.5rem] shadow-2xl shadow-brand-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-900/20 rounded-full -ml-16 -mb-16 blur-2xl" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-2xl font-black text-white mb-3 leading-tight">Help the Community</h4>
                  <p className="text-brand-100 text-sm mb-8 leading-relaxed font-medium">
                    Found a paper that isn't here? Upload it and help thousands of students.
                  </p>
                  <button
                    onClick={() => user ? setIsUploadOpen(true) : setIsAuthOpen(true)}
                    className="w-full py-4 bg-white text-brand-600 text-sm font-black rounded-2xl hover:bg-brand-50 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Upload Paper
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Papers Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-12">
              <div className="flex flex-col">
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white font-display leading-none">
                  Latest <span className="text-brand-600 underline decoration-brand-500/30 underline-offset-8">Papers</span>
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-sm font-medium">Browse the most recent academic contributions</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
                <span className="w-2 h-2 bg-brand-500 rounded-full" />
                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  {papers.length} Results
                </span>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-80 bg-white dark:bg-zinc-900 rounded-3xl animate-pulse border border-zinc-200 dark:border-zinc-800" />
                ))}
              </div>
            ) : Array.isArray(papers) && papers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {papers.map((paper) => (
                  <div key={paper.id}>
                    <PaperCard
                      paper={paper}
                      onDelete={handleDeletePaper}
                      currentUser={user}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 border-dashed">
                <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-3xl mb-6">
                  <FileText className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">No papers found</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                  We couldn't find any papers matching your current filters. Try broadening your search.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-8 px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchPapers}
      />

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {viewingPaperId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">
                      {papers.find(p => p.id === viewingPaperId)?.subject}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {papers.find(p => p.id === viewingPaperId)?.examYear} • {papers.find(p => p.id === viewingPaperId)?.course}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingPaperId(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 flex flex-col">
                <object
                  data={`/api/papers/view/${viewingPaperId}`}
                  type="application/pdf"
                  className="w-full h-full flex-1"
                >
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-4">
                      <AlertCircle className="w-12 h-12 text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Unable to display PDF</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md">
                      Your browser might be blocking the PDF viewer. You can try opening it in a new tab or download it directly.
                    </p>
                    <div className="flex gap-4">
                      <a
                        href={`/api/papers/view/${viewingPaperId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all"
                      >
                        Open in New Tab
                      </a>
                      <a
                        href={`/api/papers/download/${viewingPaperId}`}
                        className="px-6 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                </object>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-20 py-12 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">PAPERSTACK</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} PAPERSTACK Built for students, by students.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors">Privacy</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors">Terms</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
