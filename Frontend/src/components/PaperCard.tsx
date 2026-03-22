import React from "react";
import { Download, Eye, Share2, Calendar, User, BookOpen, Hash, GraduationCap, Trash2 } from "lucide-react";
import { Paper, User as UserType } from "../types";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface PaperCardProps {
  paper: Paper;
  onDelete?: (id: string) => void;
  currentUser?: UserType | null;
}

export default function PaperCard({ paper,  onDelete, currentUser }: PaperCardProps) {
  const handleDownload = () => {
    window.open(paper.fileUrl, "_blank");
  };

const handleView =() =>{
  window.open(paper.fileUrl, "_blank");
}

  const handleShare = () => {
    const url = paper.fileUrl;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const isOwner = currentUser?.id === paper.uploadedBy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(70,99,237,0.2)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="p-8 relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div className="p-4 bg-brand-50 dark:bg-brand-900/30 rounded-2xl group-hover:bg-brand-600 transition-all duration-500 transform group-hover:rotate-12 group-hover:scale-110 shadow-lg shadow-brand-500/10">
            <BookOpen className="w-7 h-7 text-brand-600 dark:text-brand-400 group-hover:text-white" />
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => onDelete?.(paper.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Delete Paper"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <span className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                {paper.examYear}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              <span>{new Date(paper.uploadDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {paper.subject}
          </h3>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            <Hash className="w-3 h-3" />
            <span>{paper.subjectCode}</span>
          </div> */}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="flex flex-col gap-1 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group-hover:border-brand-500/20 transition-colors">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Course</span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{paper.course}</span>
          </div>
          {/* <div className="flex flex-col gap-1 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group-hover:border-brand-500/20 transition-colors">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Semester</span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{paper.semester}</span>
          </div> */}
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-xs font-black shadow-lg">
                {paper.uploaderName.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-widest">Contributor</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[120px]">{paper.uploaderName}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl hover:bg-brand-600 hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl hover:bg-brand-600 hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          onClick={handleView}
          className="w-full flex items-center justify-center gap-3 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-black rounded-2xl hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 dark:hover:text-white transition-all duration-300 shadow-xl shadow-zinc-900/10 dark:shadow-white/10 group/btn"
        >
          <Eye className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
          <span>View Document</span>
        </button>
      </div>
    </motion.div>
  );
}
