const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for React app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Your Unsplash API Access Key (from environment variable)
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'xxxxxxx';

// Photo storage
let currentPhotos = []; // 6 photos for current hour
let photoQueue = []; // Queue of extra photos
let lastFetchTimestamp = null; // Timestamp of last fetch

const PHOTOS_PER_HOUR = 6;
const PHOTOS_PER_BATCH = 10;

// Fetch photos from Unsplash API
async function fetchPhotosFromAPI(count) {
  const url = `https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&count=${count}&orientation=landscape`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Get current hour timestamp (hour precision)
function getCurrentHourTimestamp() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
}

// Ensure we have 6 photos for current hour
async function ensureCurrentPhotos() {
  const currentHour = getCurrentHourTimestamp();
  
  // Check if new hour started
  if (lastFetchTimestamp === null || currentHour !== lastFetchTimestamp) {
    // New hour - get 6 new photos
    const needed = PHOTOS_PER_HOUR;
    const photos = [];
    
    // First, take from queue
    while (photos.length < needed && photoQueue.length > 0) {
      photos.push(photoQueue.shift());
    }
    
    // If not enough, fetch from API
    if (photos.length < needed) {
      const fetchCount = PHOTOS_PER_BATCH;
      const fetched = await fetchPhotosFromAPI(fetchCount);
      
      // Take what we need
      const takeCount = needed - photos.length;
      photos.push(...fetched.slice(0, takeCount));
      
      // Put rest in queue
      photoQueue.push(...fetched.slice(takeCount));
    }
    
    currentPhotos = photos;
    lastFetchTimestamp = currentHour;
  }
  
  return currentPhotos;
}

// Main endpoint - returns 6 photos for current hour (idempotent)
app.get('/api/photos', async (req, res) => {
  try {
    const photos = await ensureCurrentPhotos();
    res.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos', message: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (UNSPLASH_ACCESS_KEY === 'xxxxxxx') {
    console.warn('⚠️  Warning: Using default API key. Please set UNSPLASH_ACCESS_KEY environment variable.');
  }
});