const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    done();
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.static(path.join(__dirname)));

// LSL Authentication Middleware
const lslAuthMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ===== LSL HUD API Routes =====

// Player registration/login endpoint for LSL
app.post('/api/lsl/player/login', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid, avatar_name, display_name } = req.body;
    
    if (!avatar_uuid || !avatar_name) {
      return res.status(400).json({ error: 'avatar_uuid and avatar_name required' });
    }

    // Use the get_or_create_player function
    const result = await pool.query(
      'SELECT get_or_create_player($1, $2, $3) as player_id',
      [avatar_uuid, avatar_name, display_name || null]
    );
    
    const playerId = result.rows[0].player_id;
    
    // Fetch player data with stats
    const playerData = await pool.query(
      `SELECT p.*, ps.* 
       FROM players p 
       LEFT JOIN player_stats ps ON p.id = ps.player_id 
       WHERE p.id = $1`,
      [playerId]
    );
    
    res.json({
      success: true,
      player: playerData.rows[0]
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get player stats for LSL
app.get('/api/lsl/player/:avatar_uuid/stats', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid } = req.params;
    
    const result = await pool.query(
      `SELECT ps.*, p.avatar_name, p.last_login
       FROM player_stats ps
       JOIN players p ON ps.player_id = p.id
       WHERE p.avatar_uuid = $1`,
      [avatar_uuid]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({ success: true, stats: result.rows[0] });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update player stats (level, XP, health, stamina)
app.post('/api/lsl/player/:avatar_uuid/stats', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = ['health', 'max_health', 'stamina', 'max_stamina', 
                           'strength', 'agility', 'intelligence', 'defense', 
                           'gold', 'is_online', 'current_zone'];
    const setClauses = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(avatar_uuid);
    
    const query = `
      UPDATE player_stats ps
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      FROM players p
      WHERE ps.player_id = p.id AND p.avatar_uuid = $${paramCount}
      RETURNING ps.*
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({ success: true, stats: result.rows[0] });
  } catch (err) {
    console.error('Update stats error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add XP and handle level ups
app.post('/api/lsl/player/:avatar_uuid/xp', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid } = req.params;
    const { xp_amount } = req.body;
    
    if (!xp_amount || xp_amount <= 0) {
      return res.status(400).json({ error: 'xp_amount must be positive' });
    }
    
    const result = await pool.query(
      'SELECT * FROM add_player_xp($1, $2)',
      [avatar_uuid, xp_amount]
    );
    
    res.json({ 
      success: true, 
      xp_update: result.rows[0]
    });
  } catch (err) {
    console.error('Add XP error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get player quest progress
app.get('/api/lsl/player/:avatar_uuid/quests', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid } = req.params;
    const { status } = req.query;
    
    let query = `
      SELECT pp.*
      FROM player_progress pp
      JOIN players p ON pp.player_id = p.id
      WHERE p.avatar_uuid = $1
    `;
    const values = [avatar_uuid];
    
    if (status) {
      query += ' AND pp.status = $2';
      values.push(status);
    }
    
    query += ' ORDER BY pp.updated_at DESC';
    
    const result = await pool.query(query, values);
    res.json({ success: true, quests: result.rows });
  } catch (err) {
    console.error('Get quests error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create or update quest progress
app.post('/api/lsl/player/:avatar_uuid/quests', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid } = req.params;
    const { 
      quest_id, quest_name, quest_type, status, 
      current_step, total_steps, progress_value, target_value,
      xp_reward, gold_reward, quest_data 
    } = req.body;
    
    if (!quest_id) {
      return res.status(400).json({ error: 'quest_id required' });
    }
    
    // Upsert quest progress
    const query = `
      INSERT INTO player_progress (
        player_id, quest_id, quest_name, quest_type, status,
        current_step, total_steps, progress_value, target_value,
        xp_reward, gold_reward, quest_data, started_at, completed_at
      )
      SELECT 
        p.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        CASE WHEN $5 = 'active' THEN CURRENT_TIMESTAMP ELSE NULL END,
        CASE WHEN $5 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END
      FROM players p
      WHERE p.avatar_uuid = $1
      ON CONFLICT (player_id, quest_id) DO UPDATE SET
        status = EXCLUDED.status,
        quest_name = COALESCE(EXCLUDED.quest_name, player_progress.quest_name),
        current_step = EXCLUDED.current_step,
        total_steps = EXCLUDED.total_steps,
        progress_value = EXCLUDED.progress_value,
        target_value = EXCLUDED.target_value,
        xp_reward = COALESCE(EXCLUDED.xp_reward, player_progress.xp_reward),
        gold_reward = COALESCE(EXCLUDED.gold_reward, player_progress.gold_reward),
        quest_data = EXCLUDED.quest_data,
        completed_at = CASE 
          WHEN EXCLUDED.status = 'completed' AND player_progress.status != 'completed' 
          THEN CURRENT_TIMESTAMP 
          ELSE player_progress.completed_at 
        END,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      avatar_uuid, quest_id, quest_name, quest_type || 'main', status || 'active',
      current_step || 0, total_steps || 1, progress_value || 0, target_value || 100,
      xp_reward || 0, gold_reward || 0, JSON.stringify(quest_data || {})
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({ success: true, quest: result.rows[0] });
  } catch (err) {
    console.error('Update quest error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Record player session start
app.post('/api/lsl/player/:avatar_uuid/session/start', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid } = req.params;
    const { region_name, position_x, position_y, position_z, client_version, hud_version } = req.body;
    
    const result = await pool.query(
      `INSERT INTO player_sessions (player_id, region_name, position_x, position_y, position_z, client_version, hud_version)
       SELECT id, $2, $3, $4, $5, $6, $7 FROM players WHERE avatar_uuid = $1
       RETURNING *`,
      [avatar_uuid, region_name, position_x, position_y, position_z, client_version, hud_version]
    );
    
    // Update online status
    await pool.query(
      `UPDATE player_stats ps
       SET is_online = true, current_zone = $2, updated_at = CURRENT_TIMESTAMP
       FROM players p
       WHERE ps.player_id = p.id AND p.avatar_uuid = $1`,
      [avatar_uuid, region_name]
    );
    
    res.json({ success: true, session: result.rows[0] });
  } catch (err) {
    console.error('Session start error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Record player session end
app.post('/api/lsl/player/:avatar_uuid/session/end', lslAuthMiddleware, async (req, res) => {
  try {
    const { avatar_uuid } = req.params;
    
    // Find and close the most recent session
    await pool.query(
      `UPDATE player_sessions
       SET session_end = CURRENT_TIMESTAMP,
           duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - session_start))::INTEGER
       WHERE player_id = (SELECT id FROM players WHERE avatar_uuid = $1)
       AND session_end IS NULL`,
      [avatar_uuid]
    );
    
    // Update online status
    await pool.query(
      `UPDATE player_stats ps
       SET is_online = false, updated_at = CURRENT_TIMESTAMP
       FROM players p
       WHERE ps.player_id = p.id AND p.avatar_uuid = $1`,
      [avatar_uuid]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Session end error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get leaderboard
app.get('/api/lsl/leaderboard/:category', lslAuthMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    let orderBy = 'level DESC, total_xp DESC';
    if (category === 'gold') orderBy = 'gold DESC';
    if (category === 'quests') orderBy = '(SELECT COUNT(*) FROM player_progress WHERE player_id = ps.player_id AND status = \'completed\') DESC';
    
    const result = await pool.query(
      `SELECT p.avatar_name, p.display_name, ps.level, ps.total_xp, ps.gold
       FROM player_stats ps
       JOIN players p ON ps.player_id = p.id
       WHERE p.is_active = true
       ORDER BY ${orderBy}
       LIMIT $1`,
      [limit]
    );
    
    res.json({ success: true, leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await pool.query('SELECT NOW()');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error: ' + err.message;
  }
  
  res.json({
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing pool...');
  pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🎮 LSL HUD Server running on port ${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
