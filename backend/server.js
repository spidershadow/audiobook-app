import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import Book from './models/Book.js';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

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
    cb(null, uploadsDir);
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
    if (file.fieldname === 'audioFile') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid audio file type. Only audio files are allowed.'));
      }
    } else if (file.fieldname === 'coverImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image file type. Only image files are allowed.'));
      }
    } else if (file.fieldname === 'textFile') {
      if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid text file type. Only .txt files are allowed.'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  }
});

// Function to create transcript from text
function createTranscriptFromText(text, audioDuration) {
  // Clean up text and normalize whitespace
  const cleanText = text
    .replace(/\n+/g, ' ')     // Replace newlines with spaces
    .replace(/\s+/g, ' ')     // Normalize multiple spaces
    .trim();

  // Split text into sentences using regex that handles multiple sentence endings
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
  
  // Clean up sentences and add natural pauses
  const PAUSE_DURATION = 0.5; // Half second pause between sentences
  const totalPauseDuration = (sentences.length - 1) * PAUSE_DURATION;
  const availableDuration = audioDuration - totalPauseDuration;
  
  // Clean up sentences and calculate lengths
  const cleanSentences = sentences.map(sentence => sentence.trim());
  const sentenceLengths = cleanSentences.map(sentence => {
    // Count characters, giving more weight to punctuation and spaces
    return sentence.split('').reduce((count, char) => {
      if (/[.!?,;]/.test(char)) return count + 2; // More weight for punctuation
      if (/\s/.test(char)) return count + 0.5;    // Less weight for spaces
      return count + 1;                           // Normal weight for letters
    }, 0);
  });
  
  const totalWeightedLength = sentenceLengths.reduce((sum, len) => sum + len, 0);
  const timePerUnit = availableDuration / totalWeightedLength;
  
  let currentTime = 0;
  return cleanSentences.map((sentence, index) => {
    const startTime = currentTime;
    const duration = sentenceLengths[index] * timePerUnit;
    currentTime += duration;
    
    // Add pause after sentence (except for the last sentence)
    if (index < sentences.length - 1) {
      currentTime += PAUSE_DURATION;
    }
    
    return {
      text: sentence.trim(),
      startTime: Math.round(startTime * 100) / 100,
      endTime: Math.round((startTime + duration) * 100) / 100
    };
  });
}

// Function to get audio duration
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    exec(`ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`, (error, stdout, stderr) => {
      if (error) {
        console.warn('Error getting duration:', error);
        resolve(0); // Return 0 if there's an error
      } else {
        resolve(parseFloat(stdout.trim()));
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large. Maximum size is 500MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  res.status(500).json({ message: err.message });
});

app.post('/api/books', async (req, res, next) => {
  const uploadMiddleware = upload.fields([
    { name: 'audioFile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'textFile', maxCount: 1 }
  ]);

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error('Upload middleware error:', err);
      return res.status(400).json({ message: err.message });
    }

    try {
      console.log('Received files:', req.files);
      console.log('Received body:', req.body);

      const { title, author } = req.body;
      
      if (!title || !author) {
        return res.status(400).json({ message: 'Title and author are required' });
      }

      if (!req.files['audioFile'] || !req.files['coverImage']) {
        return res.status(400).json({ message: 'Audio file and cover image are required' });
      }

      const audioFile = req.files['audioFile'][0];
      const coverImage = req.files['coverImage'][0];
      const textFile = req.files['textFile'] ? req.files['textFile'][0] : null;

      // Get audio duration
      const duration = await getAudioDuration(audioFile.path);
      console.log('Audio duration:', duration);

      let transcript = [];
      if (textFile) {
        try {
          // Read and process text file
          const text = fs.readFileSync(textFile.path, 'utf8');
          transcript = createTranscriptFromText(text, duration);
          console.log('Generated transcript with', transcript.length, 'sentences');
        } catch (error) {
          console.error('Error processing text file:', error);
          return res.status(400).json({ message: 'Error processing text file' });
        }
      }

      const book = new Book({
        title,
        author,
        audioFile: '/uploads/' + audioFile.filename,
        coverImage: '/uploads/' + coverImage.filename,
        transcript
      });

      await book.save();
      console.log('Book saved successfully:', book._id);
      res.json(book);
    } catch (error) {
      console.error('Error creating book:', error);
      res.status(500).json({ message: error.message || 'Error creating book' });
    }
  });
});

// Root route handler
app.get('/', (req, res) => {
  res.json({ message: 'Audiobook API Server' });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin.html'));
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

// Delete book endpoint
app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Delete the associated files
    const fs = await import('fs/promises');
    const audioPath = join(__dirname, book.audioFile.replace('/uploads/', 'uploads/'));
    const coverPath = join(__dirname, book.coverImage.replace('/uploads/', 'uploads/'));
    
    try {
      await fs.unlink(audioPath);
      await fs.unlink(coverPath);
    } catch (error) {
      console.error('Error deleting files:', error);
    }

    // Delete the book from database
    await Book.findByIdAndDelete(id);
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update book details endpoint
app.put('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ message: 'Title and author are required' });
    }

    const book = await Book.findByIdAndUpdate(
      id,
      { title, author },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
