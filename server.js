const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== API Routes =====

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Test endpoint for API connectivity
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    env: process.env.NODE_ENV || 'development'
  });
});

// ===== Future Supabase Integration Structure =====
// Placeholder routes for player stats (to be implemented with Supabase)

// Get player stats
app.get('/api/player/:playerId/stats', (req, res) => {
  // TODO: Integrate with Supabase
  res.json({
    message: 'Player stats endpoint - Supabase integration pending',
    playerId: req.params.playerId,
    stats: null
  });
});

// Save game progress
app.post('/api/player/:playerId/progress', (req, res) => {
  // TODO: Integrate with Supabase
  res.json({
    message: 'Save progress endpoint - Supabase integration pending',
    playerId: req.params.playerId,
    data: req.body
  });
});

// Get leaderboard
app.get('/api/leaderboard/:game', (req, res) => {
  // TODO: Integrate with Supabase
  res.json({
    message: 'Leaderboard endpoint - Supabase integration pending',
    game: req.params.game,
    leaderboard: []
  });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Gaming HUD Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
});
