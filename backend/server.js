import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audiobook-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('Uploading file:', file.originalname, 'Type:', file.mimetype);
    if (file.fieldname === 'audio') {
      // Accept any audio file
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid audio file type. Only audio files are allowed.'));
      }
    } else if (file.fieldname === 'cover') {
      // Accept image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image file type. Only image files are allowed.'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // Increased to 500MB
  }
});

// Book Schema
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  coverImage: { type: String, required: true },
  audioFile: { type: String, required: true },
  duration: { type: String, required: true },
  progress: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Book = mongoose.model('Book', bookSchema);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File is too large. Maximum size is 500MB'
      });
    }
    return res.status(400).json({
      message: `Upload error: ${err.message}`
    });
  }
  res.status(500).json({
    message: err.message || 'Something went wrong'
  });
});

// Root route handler
app.get('/', (req, res) => {
  res.json({ message: 'Audiobook API Server' });
});

// API routes
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/books', (req, res) => {
  const uploadFields = upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]);

  uploadFields(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    try {
      console.log('Files received:', req.files);
      console.log('Body received:', req.body);

      if (!req.files?.audio?.[0] || !req.files?.cover?.[0]) {
        return res.status(400).json({ message: 'Both audio and cover files are required' });
      }

      const { title, author } = req.body;
      if (!title || !author) {
        return res.status(400).json({ message: 'Title and author are required' });
      }

      const audioFile = req.files['audio'][0];
      const coverImage = req.files['cover'][0];

      const book = new Book({
        title,
        author,
        coverImage: `/uploads/${coverImage.filename}`,
        audioFile: `/uploads/${audioFile.filename}`,
        duration: '0:00',
        progress: 0
      });

      await book.save();
      res.status(201).json(book);
    } catch (error) {
      console.error('Error saving book:', error);
      res.status(400).json({ message: error.message });
    }
  });
});

app.patch('/api/books/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    const book = await Book.findByIdAndUpdate(
      id,
      { progress },
      { new: true }
    );
    res.json(book);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create uploads directory if it doesn't exist
import { mkdir } from 'fs/promises';
try {
  await mkdir(join(__dirname, 'uploads'), { recursive: true });
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error('Error creating uploads directory:', err);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
