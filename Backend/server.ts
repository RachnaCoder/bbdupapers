import express from "express";
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
import cors from "cors";
import { GoogleGenAI } from "@google/genai";


dotenv.config();

dotenv.config({ path: "./.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "paperstack-secret-key";
const MONGODB_URI = process.env.MONGODB_URI;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


if (!MONGODB_URI) {
  console.error("CRITICAL: MONGODB_URI is not defined.");
  process.exit(1);
} else {
  console.log("Attempting to connect to MongoDB...");
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("Successfully connected to MongoDB Atlas");
    startServer(); // Only start server AFTER DB connects
  })
  .catch((err) => {
    console.error("MongoDB Connection Failed!", err.message);
    process.exit(1);
  });
}

// Middleware to check DB connection
const checkDbConnection = (req: any, res: any, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: "Database is currently disconnected. Please check the server logs for connection errors.",
      details: "Ensure your MONGODB_URI is correct and IP whitelisting is enabled in MongoDB Atlas."
    });
  }
  next();
};

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const paperSchema = new mongoose.Schema({
  course: { type: String, required: true },
  subject: { type: String, required: true },
  examYear: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadDate: { type: Date, default: Date.now },
  fileUrl: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
const Paper = mongoose.model("Paper", paperSchema);



const app = express();

app.use(cors({
  origin: process.env.APP_URL || "http://localhost:5173",
  
  credentials: true
}));


app.use(express.json());

// Ensure temp uploads directory exists
// const tempDir = path.join(__dirname, "temp");
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer setup for temp storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};



const verifyPaperWithAI = async (filePath: string, metadata: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

    // Convert file to base64 (Node.js way)
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `
You are an AI that verifies university question papers.
Rules:
- Accept if document contains questions, exam format, or academic content
- Even partial or unclear content should be accepted
- Reject ONLY if completely unrelated (like memes, random images)

              Subject: ${metadata.subject} 
              Course: ${metadata.course}

              Return JSON: { "isValid": boolean, "reason": string }
              `,
            },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });


    let result;

try {
  const text = response.text?.trim();

  // Extract JSON safely
  const jsonMatch = text?.match(/\{.*\}/s);
  result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

} catch (err) {
  console.log(" AI JSON parse failed:", response.text);
  return { isValid: true, reason: "AI parse failed, allowed" };
}

if (!result || typeof result.isValid !== "boolean") {
  return { isValid: true, reason: "Invalid AI format, allowed" };
}

return result;

  } catch (err) {
    console.error("AI Verification error:", err);
    return { isValid: true, reason: "Skipped due to error" };
  }
};

// --- API ROUTES ---
app.use("/api", checkDbConnection);

// Auth
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id, name, email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name, email } });
  } catch (error: any) {
    if (error.code === 11000) {
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
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

// Papers
app.post("/api/papers/upload", authenticateToken, upload.array("files", 4), async (req: any, res) => {
  const { course, subject, examYear,} = req.body;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  let localFilePath = "";
  const isPdf = files[0].mimetype === "application/pdf";

  try {
    if (isPdf) {
      localFilePath = path.resolve(files[0].path);
    } else {
      // Convert images to PDF
      const pdfPath = path.resolve(path.join(tempDir, `${Date.now()}-converted.pdf`));
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      files.forEach((file, index) => {
        if (index > 0) doc.addPage();
        doc.image(path.resolve(file.path), {
          fit: [500, 700],
          align: "center",
          valign: "center",
        });
      });
      doc.end();

      await new Promise<void>((resolve) => stream.on("finish", () => resolve()));
      localFilePath = pdfPath;

      // Clean up source images
      //  files.forEach((file) => fs.unlinkSync(file.path));
      files.forEach((file) => {
        const fullPath = path.resolve(file.path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }


    const aiResult = await verifyPaperWithAI(localFilePath, {
  subject,
  course,
  });

  if (!aiResult.isValid) {
  console.log("AI rejected but allowing:", aiResult.reason);
}
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: "bbdu-papers",
      resource_type: "auto",
    });

    // Clean up local temp file
    // fs.unlinkSync(localFilePath);
    
    const paper = new Paper({
      course,
      subject,
      examYear,
      uploadedBy: req.user.id,
      fileUrl: result.secure_url,
      cloudinaryId: result.public_id,
    });

    await paper.save();
    res.json({ success: true });
  } catch (error: any) {
  console.error("FULL ERROR:", error);

  res.status(500).json({
    error: "Upload failed",
    message: error.message,
  });
}

finally{
  if (localFilePath && fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath);
    console.log("Temp file deleted:", localFilePath);
  }
}
});


app.get("/api/papers", async (req, res) => {
  const { search, course, examYear} = req.query;
  const filter: any = {};

  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: "i" } },
      
    ];
  }
  if (course) filter.course = course;
  if (examYear) filter.examYear = examYear;

  try {
    const papers = await Paper.find(filter)
      .populate("uploadedBy", "name")
      .sort({ uploadDate: -1 });

    // Map to match frontend expectations (id instead of _id, uploaderName)
    const formattedPapers = papers.map((p: any) => ({
      id: p._id,
      course: p.course,
      subject: p.subject,
      examYear: p.examYear,
      uploadedBy: p.uploadedBy?._id,
      uploaderName: p.uploadedBy?.name || "Unknown",
      uploadDate: p.uploadDate,
      fileUrl: p.fileUrl,
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

app.delete("/api/papers/:id", authenticateToken, async (req: any, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    
    if (paper.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own papers" });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(paper.cloudinaryId);
    
    // Delete from DB
    await Paper.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete paper" });
  }
});


async function startServer() {

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

