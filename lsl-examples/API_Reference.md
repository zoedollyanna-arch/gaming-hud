# LSL HUD API Reference

## Base URL
```
https://your-render-app.onrender.com/api/lsl
```

## Authentication
All requests require the `X-API-Key` header matching your `API_SECRET_KEY` environment variable.

```
X-API-Key: your-secret-api-key
```

---

## Endpoints

### Player Login/Registration
**POST** `/api/lsl/player/login`

Creates a new player or updates existing player on login.

**Request Body:**
```json
{
  "avatar_uuid": "12345678-1234-1234-1234-123456789012",
  "avatar_name": "Avatar Resident",
  "display_name": "Avatar"
}
```

**Response:**
```json
{
  "success": true,
  "player": {
    "id": "uuid",
    "avatar_uuid": "...",
    "avatar_name": "...",
    "level": 1,
    "current_xp": 0,
    "health": 100,
    "gold": 0
  }
}
```

---

### Get Player Stats
**GET** `/api/lsl/player/:avatar_uuid/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "level": 5,
    "current_xp": 250,
    "total_xp": 1250,
    "xp_to_next_level": 500,
    "health": 85,
    "max_health": 100,
    "stamina": 100,
    "gold": 500
  }
}
```

---

### Update Player Stats
**POST** `/api/lsl/player/:avatar_uuid/stats`

**Request Body:**
```json
{
  "health": 90,
  "stamina": 80,
  "gold": 550
}
```

**Allowed Fields:**
- `health`, `max_health`
- `stamina`, `max_stamina`
- `strength`, `agility`, `intelligence`, `defense`
- `gold`
- `is_online`, `current_zone`

---

### Add XP (Auto Level-Up)
**POST** `/api/lsl/player/:avatar_uuid/xp`

**Request Body:**
```json
{
  "xp_amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "xp_update": {
    "new_level": 6,
    "levels_gained": 1,
    "current_xp": 50,
    "xp_to_next": 450,
    "leveled_up": true
  }
}
```

---

### Get Player Quests
**GET** `/api/lsl/player/:avatar_uuid/quests`

**Query Parameters:**
- `status` (optional): `active`, `completed`, `not_started`, `failed`

---

### Update Quest Progress
**POST** `/api/lsl/player/:avatar_uuid/quests`

**Request Body:**
```json
{
  "quest_id": "quest_001",
  "quest_name": "First Steps",
  "quest_type": "main",
  "status": "active",
  "current_step": 2,
  "total_steps": 5,
  "progress_value": 40,
  "target_value": 100,
  "xp_reward": 200,
  "gold_reward": 50
}
```

**Status Values:** `not_started`, `active`, `completed`, `failed`

**Quest Types:** `main`, `side`, `daily`, `achievement`

---

### Record Session Start
**POST** `/api/lsl/player/:avatar_uuid/session/start`

**Request Body:**
```json
{
  "region_name": "Sandbox Island",
  "position_x": 128.5,
  "position_y": 128.5,
  "position_z": 23.0,
  "hud_version": "1.0.0"
}
```

---

### Record Session End
**POST** `/api/lsl/player/:avatar_uuid/session/end`

Closes the active session and calculates duration.

---

### Get Leaderboard
**GET** `/api/lsl/leaderboard/:category`

**Categories:**
- `level` - Sorted by level then XP
- `gold` - Richest players
- `quests` - Most quests completed

**Query Parameters:**
- `limit` (default: 10) - Number of results

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "avatar_name": "Top Player",
      "level": 25,
      "total_xp": 50000,
      "gold": 10000
    }
  ]
}
```

---

## Error Responses

**401 Unauthorized:**
```json
{ "error": "Unauthorized" }
```

**404 Player Not Found:**
```json
{ "error": "Player not found" }
```

**400 Bad Request:**
```json
{ "error": "avatar_uuid and avatar_name required" }
```

**500 Server Error:**
```json
{ "error": "Database error", "details": "..." }
```
