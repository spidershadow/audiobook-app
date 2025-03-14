import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  coverImage: { type: String, required: true },
  audioFile: { type: String, required: true },
  transcript: [{
    text: String,
    startTime: Number,  // in seconds
    endTime: Number     // in seconds
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Book', bookSchema);
