require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all routes
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://preplensadmin.vercel.app',
    'https://www.preplens.com'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Define Question schema
const questionSchema = new mongoose.Schema({
  text: String,
  options: [String],
  answer: String,
  subject: String,
  exam: String,
  difficulty: String,
  tags: [String],
  marks: Number,
  timeLimit: Number,
  blooms: String,
});
const Question = mongoose.model('Question', questionSchema);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'));
    }
  }
});

// Bulk upload endpoint
app.post('/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const filePath = path.resolve(req.file.path);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const marks = req.body.marks;
    const timeLimit = req.body.timeLimit;
    const blooms = req.body.blooms;
    const newQuestions = rows.map((row, idx) => ({
      text: row.text || '',
      options: [row.optionA, row.optionB, row.optionC, row.optionD],
      answer: row.answer,
      subject: row.subject,
      exam: row.exam,
      difficulty: row.difficulty,
      tags: row.tags ? row.tags.split(',') : [],
      marks: marks || row.marks || 4,
      timeLimit: timeLimit || row.timeLimit || 60,
      blooms: blooms || row.blooms || '',
    }));
    const inserted = await Question.insertMany(newQuestions);
    res.json({ added: inserted.length, questions: inserted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse file', details: err.message });
  }
});

// Get all questions
app.get('/questions', async (req, res) => {
  const questions = await Question.find();
  res.json(questions);
});

// Add a new question
app.post('/questions', async (req, res) => {
  const { text, answer, options, subject, exam, difficulty, tags, marks, timeLimit, blooms } = req.body;
  const newQuestion = new Question({ text, answer, options, subject, exam, difficulty, tags, marks, timeLimit, blooms });
  await newQuestion.save();
  res.status(201).json(newQuestion);
});

// Delete a question
app.delete('/questions/:id', async (req, res) => {
  const id = req.params.id;
  await Question.findByIdAndDelete(id);
  res.status(204).end();
});

app.use('/template', (req, res) => {
  res.download(path.join(__dirname, 'bulk_upload_template.csv'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated!');
  });
});