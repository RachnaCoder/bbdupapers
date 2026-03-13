// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var JWT_SECRET = process.env.JWT_SECRET || "paperstack-secret-key";
var MONGODB_URI = process.env.MONGODB_URI;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
if (!MONGODB_URI) {
  console.error("CRITICAL: MONGODB_URI is not defined.");
  process.exit(1);
} else {
  console.log("Attempting to connect to MongoDB...");
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5e3
  }).then(() => {
    console.log("Successfully connected to MongoDB Atlas");
    startServer();
  }).catch((err) => {
    console.error("MongoDB Connection Failed!", err.message);
    process.exit(1);
  });
}
var checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database is currently disconnected. Please check the server logs for connection errors.",
      details: "Ensure your MONGODB_URI is correct and IP whitelisting is enabled in MongoDB Atlas."
    });
  }
  next();
};
var userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
var paperSchema = new mongoose.Schema({
  course: { type: String, required: true },
  branch: { type: String, required: true },
  subject: { type: String, required: true },
  subjectCode: { type: String, required: true },
  year: { type: String, required: true },
  examYear: { type: String, required: true },
  semester: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadDate: { type: Date, default: Date.now },
  fileUrl: { type: String, required: true },
  cloudinaryId: { type: String, required: true }
});
var User = mongoose.model("User", userSchema);
var Paper = mongoose.model("Paper", paperSchema);
var app = express();
app.use(express.json());
var tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "temp/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
var upload = multer({ storage });
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
app.use("/api", checkDbConnection);
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id, name, email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name, email } });
  } catch (error) {
    if (error.code === 11e3) {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
app.post("/api/papers/upload", authenticateToken, upload.array("files", 4), async (req, res) => {
  const { course, branch, subject, subjectCode, year, examYear, semester } = req.body;
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  let localFilePath = "";
  const isPdf = files[0].mimetype === "application/pdf";
  try {
    if (isPdf) {
      localFilePath = files[0].path;
    } else {
      const pdfPath = path.join(tempDir, `${Date.now()}-converted.pdf`);
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);
      files.forEach((file, index) => {
        if (index > 0) doc.addPage();
        doc.image(file.path, {
          fit: [500, 700],
          align: "center",
          valign: "center"
        });
      });
      doc.end();
      await new Promise((resolve) => stream.on("finish", () => resolve()));
      localFilePath = pdfPath;
      files.forEach((file) => fs.unlinkSync(file.path));
    }
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: "bbdu-papers",
      resource_type: "auto"
    });
    fs.unlinkSync(localFilePath);
    const paper = new Paper({
      course,
      branch,
      subject,
      subjectCode,
      year,
      examYear,
      semester,
      uploadedBy: req.user.id,
      fileUrl: result.secure_url,
      cloudinaryId: result.public_id
    });
    await paper.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});
app.get("/api/papers", async (req, res) => {
  const { search, course, branch, semester, examYear, year } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: "i" } },
      { subjectCode: { $regex: search, $options: "i" } }
    ];
  }
  if (course) filter.course = course;
  if (branch) filter.branch = branch;
  if (semester) filter.semester = semester;
  if (examYear) filter.examYear = examYear;
  if (year) filter.year = year;
  try {
    const papers = await Paper.find(filter).populate("uploadedBy", "name").sort({ uploadDate: -1 });
    const formattedPapers = papers.map((p) => ({
      id: p._id,
      course: p.course,
      branch: p.branch,
      subject: p.subject,
      subjectCode: p.subjectCode,
      year: p.year,
      examYear: p.examYear,
      semester: p.semester,
      uploadedBy: p.uploadedBy?._id,
      uploaderName: p.uploadedBy?.name || "Unknown",
      uploadDate: p.uploadDate,
      fileUrl: p.fileUrl
    }));
    res.json(formattedPapers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});
app.get("/api/papers/download/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    res.redirect(paper.fileUrl);
  } catch (error) {
    res.status(500).json({ error: "Download failed" });
  }
});
app.get("/api/papers/view/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    res.redirect(paper.fileUrl);
  } catch (error) {
    res.status(500).json({ error: "View failed" });
  }
});
app.delete("/api/papers/:id", authenticateToken, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    if (paper.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own papers" });
    }
    await cloudinary.uploader.destroy(paper.cloudinaryId);
    await Paper.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete paper" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  const PORT = 3e3;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
