# Unsplash Slideshow

View working [demo](https://sintexer.github.io/unsplash-slideshow/)

A full-screen slideshow that displays Unsplash photos based on the current time—each photo corresponds to a 10-minute block of the hour (0-9, 10-19, 20-29, etc.), creating a time-synced visual experience. The app uses a Node.js proxy server to keep your Unsplash API key secure while the React client displays photos with a live clock and hour progress indicator.

## Setup

1. Install dependencies: `npm install`
2. Create a `.env` file with your Unsplash API key:
   ```
   UNSPLASH_ACCESS_KEY=your_key_here
   ```
3. Start the server: `npm start` (runs on port 5000)
4. Start the client: `npm run client` (runs on port 3000)
