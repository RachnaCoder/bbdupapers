import React, { useState, useRef } from "react";
import { X, Upload, File, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../services/api";
import toast from "react-hot-toast";
import { GoogleGenAI } from "@google/genai";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    course: "",
    branch: "",
    subject: "",
    subjectCode: "",
    year: "",
    examYear: "",
    semester: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const verifyPaperWithAI = async (file: File) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `
                  Quickly verify if this is an academic question paper.
                  Subject: ${formData.subject} (${formData.subjectCode})
                  Course: ${formData.course}
                  
                  Return JSON: { "isValid": boolean, "reason": string }
                `,
              },
              {
                inlineData: {
                  mimeType: file.type || "application/pdf",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: "LOW" as any },
        },
      });

      const result = JSON.parse(response.text || '{"isValid": false, "reason": "No response from AI"}');
      return result;
    } catch (err) {
      console.error("AI Verification error:", err);
      // If AI fails for any reason (like quota), we allow the upload but log it
      return { isValid: true, reason: "AI verification skipped due to error" };
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;
    setError(null);

    const isPdf = selectedFiles[0].type === "application/pdf";
    if (isPdf && selectedFiles.length > 1) {
      setError("Only one PDF file can be uploaded at a time");
      return;
    }

    if (!isPdf && selectedFiles.length > 4) {
      setError("Maximum 4 images allowed");
      return;
    }

    setFiles(selectedFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    setError(null);

    // AI Verification Step (Frontend)
    const verification = await verifyPaperWithAI(files[0]);
    if (!verification.isValid) {
      setError(`Verification failed: ${verification.reason}`);
      setLoading(false);
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value as string));
    files.forEach((file) => data.append("files", file));

    try {
      await api.post("/papers/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Paper uploaded successfully!");
      onSuccess();
      onClose();
      setFiles([]);
      setFormData({
        course: "",
        branch: "",
        subject: "",
        subjectCode: "",
        year: "",
        examYear: "",
        semester: "",
      });
    } catch (err: any) {
      setError(err.presentableMessage || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-full"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 overflow-y-auto custom-scrollbar">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Upload Question Paper</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">Share a PDF or up to 4 images of the question paper</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-red-700 dark:text-red-400">Upload Error</span>
                    <span className="text-xs text-red-600 dark:text-red-400/80">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Course Name</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech, B.Sc"
                    required
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Branch / Department</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE, Mechanical"
                    required
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Data Structures"
                    required
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CS101"
                    required
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Academic Year</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Semester</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                      <option key={s} value={`Semester ${s}`}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Exam Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2023"
                    required
                    min="2000"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
                    value={formData.examYear}
                    onChange={(e) => setFormData({ ...formData, examYear: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Files (PDF or max 4 images)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-500 dark:hover:border-brand-400 transition-all bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept=".pdf,image/*"
                    className="hidden"
                  />
                  {files.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-4">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-700">
                          {file.type === "application/pdf" ? <File className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-blue-500" />}
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-brand-50 dark:bg-brand-900/30 rounded-full w-fit mx-auto">
                        <Upload className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">Click to upload or drag and drop</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">PDF or Images (JPG, PNG)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>If you upload images, they will be automatically converted into a single PDF.</p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <p>AI will verify the document to ensure it's a valid question paper for the selected subject.</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying & Uploading...</span>
                    </>
                  ) : (
                    "Upload Paper"
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
