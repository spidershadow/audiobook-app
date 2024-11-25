import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Clock, User, Plus } from 'lucide-react';

// Using relative URLs since we have proxy configured
const API_URL = '';

const AudiobookTile = ({ book, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
  >
    <div className="relative group">
      <img
        src={`${API_URL}${book.coverImage}`}
        alt={book.title}
        className="w-full h-48 object-cover"
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
        <Play className="text-white opacity-0 group-hover:opacity-100 transform scale-150" />
      </div>
      {book.progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${book.progress}%` }}
          />
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-bold text-lg mb-1 truncate">{book.title}</h3>
      <div className="flex items-center text-gray-600 text-sm mb-2">
        <User size={14} className="mr-1" />
        <span className="truncate">{book.author}</span>
      </div>
      <div className="flex items-center text-gray-500 text-sm">
        <Clock size={14} className="mr-1" />
        <span>{book.duration}</span>
      </div>
    </div>
  </div>
);

const UploadForm = ({ onClose, onUploadSuccess }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    formData.append('audio', audioFile);
    formData.append('cover', coverFile);

    try {
      const response = await fetch(`${API_URL}/api/books`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const book = await response.json();
      onUploadSuccess(book);
      onClose();
    } catch (error) {
      console.error('Error uploading book:', error);
      alert('Failed to upload book. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Upload Audiobook</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Audio File
            </label>
            <input
              type="file"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="w-full"
              accept="audio/*"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Cover Image
            </label>
            <input
              type="file"
              onChange={(e) => setCoverFile(e.target.files[0])}
              className="w-full"
              accept="image/*"
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [selectedBook, setSelectedBook] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [books, setBooks] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      audioRef.current = new Audio(`${API_URL}${selectedBook.audioFile}`);
      audioRef.current.volume = volume;
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration);
      });

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime);
        // Update progress in the database every 5 seconds
        if (Math.floor(audioRef.current.currentTime) % 5 === 0) {
          updateProgress(selectedBook._id, (audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [selectedBook]);

  const updateProgress = async (bookId, progress) => {
    try {
      await fetch(`${API_URL}/api/books/${bookId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress }),
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const skipForward = (seconds = 30) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration);
    }
  };

  const skipBackward = (seconds = 30) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - seconds, 0);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books`);
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const handleUploadSuccess = (newBook) => {
    setBooks(prevBooks => [newBook, ...prevBooks]);
  };

  if (selectedBook) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <button 
          onClick={() => {
            setSelectedBook(null);
            setIsPlaying(false);
          }}
          className="absolute top-8 left-8 text-gray-300 hover:text-white flex items-center transition-colors z-10"
        >
          ← Back to Library
        </button>

        <div className="min-h-screen fixed inset-0 flex items-center justify-center p-8">
          <div className="w-full max-w-3xl bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="relative aspect-video w-full bg-black">
              <img 
                src={`${API_URL}${selectedBook.coverImage}`}
                alt={selectedBook.title}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">{selectedBook.title}</h2>
                <p className="text-lg text-gray-400">{selectedBook.author}</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleTimeChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-4 mb-8">
                  <button 
                    className="p-2 hover:text-blue-400 transition-colors flex flex-col items-center"
                    onClick={() => skipBackward(30)}
                  >
                    <SkipBack size={28} />
                    <span className="text-xs mt-1">30s</span>
                  </button>
                  <button 
                    className="p-2 hover:text-blue-400 transition-colors flex flex-col items-center"
                    onClick={() => skipBackward(10)}
                  >
                    <SkipBack size={24} />
                    <span className="text-xs mt-1">10s</span>
                  </button>
                  <button 
                    className="p-6 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors transform hover:scale-105"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause size={40} /> : <Play size={40} />}
                  </button>
                  <button 
                    className="p-2 hover:text-blue-400 transition-colors flex flex-col items-center"
                    onClick={() => skipForward(10)}
                  >
                    <SkipForward size={24} />
                    <span className="text-xs mt-1">10s</span>
                  </button>
                  <button 
                    className="p-2 hover:text-blue-400 transition-colors flex flex-col items-center"
                    onClick={() => skipForward(30)}
                  >
                    <SkipForward size={28} />
                    <span className="text-xs mt-1">30s</span>
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-3">
                  <Volume2 size={24} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Audiobook Library</h1>
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Upload Book
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <AudiobookTile
              key={book._id}
              book={book}
              onClick={() => setSelectedBook(book)}
            />
          ))}
        </div>
      </div>

      {showUploadForm && (
        <UploadForm
          onClose={() => setShowUploadForm(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}

export default App;
