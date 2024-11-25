#!/bin/bash

# Start the backend server
cd backend
npm run dev &

# Wait a bit for the backend to start
sleep 2

# Start the frontend server
cd ..
npm run dev &

# Wait for both processes
wait
