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
let photoHistory = []; // History of photos (max 1440)

const PHOTOS_PER_HOUR = 6;
const PHOTOS_PER_BATCH = 10;
const MAX_HISTORY_SIZE = 1440; // 1440 photos = 24 hours * 60 minutes / 10 minutes per photo
const PHOTO_EXPIRATION_MINUTES = 55; // Expire photos after 55 minutes instead of 1 hour

// Fetch photos from Unsplash API
async function fetchPhotosFromAPI(count) {
  const url = `https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&count=${count}&orientation=landscape`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Check if photos should be refreshed (55 minutes have passed)
function shouldRefreshPhotos() {
  if (lastFetchTimestamp === null) {
    return true; // First fetch
  }
  
  const now = new Date().getTime();
  const elapsedMinutes = (now - lastFetchTimestamp) / (1000 * 60);
  
  return elapsedMinutes >= PHOTO_EXPIRATION_MINUTES;
}

// Add photo to history
function addToHistory(photo) {
  const historyItem = {
    id: photo.id,
    name: photo.user?.name || 'Unknown',
    description: photo.description || photo.alt_description || '',
    link: photo.links?.html || `https://unsplash.com/photos/${photo.id}`,
    timestamp: new Date().toISOString()
  };
  
  photoHistory.push(historyItem);
  
  // Keep only last 1440 items
  if (photoHistory.length > MAX_HISTORY_SIZE) {
    photoHistory.shift();
  }
}

// Ensure we have 6 photos for current hour
async function ensureCurrentPhotos() {
  // Check if 55 minutes have passed since last fetch
  if (shouldRefreshPhotos()) {
    // Time to refresh - get 6 new photos
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
    
    // Add photos to history
    photos.forEach(photo => addToHistory(photo));
    
    currentPhotos = photos;
    lastFetchTimestamp = new Date().getTime();
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

// History endpoint - returns recent photos history
app.get('/api/history', (req, res) => {
  // Return history in chronological order (oldest first) so frontend can display with greatest index at top
  res.json({ history: photoHistory });
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