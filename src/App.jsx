import React, { useState, useEffect, useRef } from 'react';

const API_URL = '';

function AudiobookPlayer({ book, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = `${API_URL}${book.audioFile}`;
      audioRef.current.load();
      console.log('Loading audio:', book.audioFile);
    }
  }, [book]);

  useEffect(() => {
    if (audioRef.current) {
      const handleTimeUpdate = () => setCurrentTime(audioRef.current.currentTime);
      const handleLoadedMetadata = () => setDuration(audioRef.current.duration);
      const handleEnded = () => setIsPlaying(false);

      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('ended', handleEnded);

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audioRef.current.removeEventListener('ended', handleEnded);
        }
      };
    }
  }, [audioRef.current]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error('Error playing:', err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeChange = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const skipTime = (seconds) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center p-8">
      <button 
        onClick={onClose}
        className="absolute top-8 left-8 text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Library
      </button>

      <div className="w-full max-w-3xl bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        <div className="relative aspect-video w-full bg-black">
          <img 
            src={`${API_URL}${book.coverImage}`}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{book.title}</h2>
            <p className="text-lg text-gray-400">{book.author}</p>
          </div>

          <div 
            ref={transcriptRef}
            className="max-w-2xl mx-auto mb-6 p-4 bg-gray-900 rounded-lg h-48 overflow-y-auto"
          >
            {book.transcript ? (
              <div className="space-y-4">
                {book.transcript.map((sentence, index) => (
                  <p
                    key={index}
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = sentence.startTime;
                      }
                    }}
                    className={`text-lg cursor-pointer hover:text-blue-400 transition-colors ${
                      currentTime >= sentence.startTime && currentTime <= sentence.endTime
                        ? 'text-blue-500 font-medium'
                        : 'text-gray-300'
                    }`}
                  >
                    {sentence.text}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400">No transcript available</p>
            )}
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime || 0}
                onChange={handleTimeChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <button 
                onClick={() => skipTime(-30)}
                className="group flex flex-col items-center"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-blue-400 transition-colors">
                  <path d="M19 20L9 12l10-8v16z"/>
                  <path d="M5 19V5"/>
                </svg>
                <span className="text-xs mt-1">30s</span>
              </button>

              <button
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                {isPlaying ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
              </button>

              <button 
                onClick={() => skipTime(30)}
                className="group flex flex-col items-center"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-blue-400 transition-colors">
                  <path d="M5 20l10-8L5 4v16z"/>
                  <path d="M19 19V5"/>
                </svg>
                <span className="text-xs mt-1">30s</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} />
    </div>
  );
}

function AudiobookTile({ book, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
    >
      <div className="relative aspect-square">
        <img
          src={`${API_URL}${book.coverImage}`}
          alt={book.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 truncate">{book.title}</h3>
        <p className="text-gray-600 text-sm truncate">{book.author}</p>
      </div>
    </div>
  );
}

function App() {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/books`)
      .then(res => res.json())
      .then(data => {
        console.log('Fetched books:', data);
        setBooks(data);
      })
      .catch(err => console.error('Error fetching books:', err));
  }, []);

  if (selectedBook) {
    return (
      <AudiobookPlayer 
        book={selectedBook} 
        onClose={() => setSelectedBook(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Audiobooks</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map(book => (
            <AudiobookTile
              key={book._id}
              book={book}
              onClick={() => setSelectedBook(book)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
