import React from "react";
import { LogIn, LogOut, Upload, FileText, Sun, Moon, Search } from "lucide-react";
import { User } from "../types";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Navbar({ user, onLogout, onOpenAuth, onOpenUpload, isDarkMode, toggleDarkMode }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-600 rounded-xl shadow-lg shadow-brand-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-display">
              PAPERSTACK <span className="text-brand-600"></span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 text-zinc-500 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400 transition-all hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={onOpenUpload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload className="w-4.5 h-4.5" />
                  <span className="hidden sm:inline font-semibold">Upload Paper</span>
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{user.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2.5 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-zinc-900/10 dark:shadow-white/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn className="w-4.5 h-4.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
