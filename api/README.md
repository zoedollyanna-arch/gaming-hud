# API Structure

## Current Endpoints

- `GET /api/health` - Health check
- `GET /api/test` - API connectivity test

## Future Supabase Integration

The following endpoints are structured for Supabase integration:

- `GET /api/player/:playerId/stats` - Retrieve player statistics
- `POST /api/player/:playerId/progress` - Save game progress
- `GET /api/leaderboard/:game` - Get game leaderboard

## Database Schema (Planned)

### Players Table
- id (uuid)
- username (text)
- created_at (timestamp)

### Game Stats Table
- id (uuid)
- player_id (uuid, foreign key)
- game_name (text)
- high_score (integer)
- games_played (integer)
- total_playtime (integer)
- last_played (timestamp)

### Game Sessions Table
- id (uuid)
- player_id (uuid, foreign key)
- game_name (text)
- score (integer)
- duration (integer)
- played_at (timestamp)
