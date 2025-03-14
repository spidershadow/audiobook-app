# Audiobook App

A full-stack web application for uploading, managing, and playing audiobooks with transcript synchronization.

## Features

- Upload and manage audiobooks with cover images
- Play audio with synchronized transcript display
- Admin interface for book management
- Responsive design for mobile and desktop

## Tech Stack

### Frontend
- React with Vite
- Tailwind CSS for styling
- Lucide React for icons

### Backend
- Node.js with Express
- MongoDB with Mongoose for data storage
- Multer for file uploads
- OpenAI API integration

## Project Structure

```
audiobook-app/
├── src/                  # Frontend React code
├── public/               # Static assets
├── backend/              # Backend API server
│   ├── models/           # MongoDB schemas
│   ├── uploads/          # Uploaded files (not in git)
│   └── server.js         # Express server
└── start-app.sh          # Script to start both frontend and backend
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd audiobook-app
   ```

2. Install frontend dependencies:
   ```
   npm install
   ```

3. Install backend dependencies:
   ```
   cd backend
   npm install
   cd ..
   ```

4. Create a `.env` file in the backend directory with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/audiobook-app
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key
   ```

5. Start the application:
   ```
   ./start-app.sh
   ```
   Or manually:
   ```
   # Terminal 1
   npm run dev
   
   # Terminal 2
   cd backend
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`

## Usage

### User Interface
- Browse available audiobooks
- Play audiobooks with synchronized transcript
- Navigate through audio using the transcript

### Admin Interface
- Access the admin interface at `/admin.html`
- Upload new audiobooks with cover images
- Manage existing audiobooks

## Development

- Frontend runs on port 5173 (Vite default)
- Backend API runs on port 5000
- MongoDB should be running locally or accessible via the provided connection string

## License

[MIT License](LICENSE)
