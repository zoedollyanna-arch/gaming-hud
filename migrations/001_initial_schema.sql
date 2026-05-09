-- LSL HUD System - Initial Database Migration
-- Created for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- PLAYERS TABLE
-- Maps avatar identities to internal player records
-- ============================================
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avatar_uuid VARCHAR(36) UNIQUE NOT NULL,
    avatar_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_avatar_uuid ON players(avatar_uuid);
CREATE INDEX idx_players_avatar_name ON players(avatar_name);

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PLAYER_STATS TABLE
-- Tracks level, XP, health, stamina
-- ============================================
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Level & XP
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    xp_to_next_level INTEGER DEFAULT 100,
    
    -- Vital Stats
    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    stamina INTEGER DEFAULT 100,
    max_stamina INTEGER DEFAULT 100,
    
    -- Stats
    strength INTEGER DEFAULT 10,
    agility INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    defense INTEGER DEFAULT 10,
    
    -- Currency
    gold INTEGER DEFAULT 0,
    premium_currency INTEGER DEFAULT 0,
    
    -- Status
    is_online BOOLEAN DEFAULT FALSE,
    current_zone VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(player_id)
);

CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX idx_player_stats_level ON player_stats(level);

CREATE TRIGGER update_player_stats_updated_at
    BEFORE UPDATE ON player_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PLAYER_PROGRESS TABLE
-- Quest tracking and completion status
-- ============================================
CREATE TABLE IF NOT EXISTS player_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Quest/Activity Identification
    quest_id VARCHAR(100) NOT NULL,
    quest_type VARCHAR(50) DEFAULT 'main', -- main, side, daily, achievement
    quest_name VARCHAR(255),
    
    -- Progress Tracking
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, active, completed, failed
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 1,
    progress_value INTEGER DEFAULT 0,
    target_value INTEGER DEFAULT 100,
    
    -- Requirements & Rewards
    required_level INTEGER DEFAULT 1,
    xp_reward INTEGER DEFAULT 0,
    gold_reward INTEGER DEFAULT 0,
    item_rewards JSONB DEFAULT '[]',
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    quest_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(player_id, quest_id)
);

CREATE INDEX idx_player_progress_player_id ON player_progress(player_id);
CREATE INDEX idx_player_progress_quest_id ON player_progress(quest_id);
CREATE INDEX idx_player_progress_status ON player_progress(status);

CREATE TRIGGER update_player_progress_updated_at
    BEFORE UPDATE ON player_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PLAYER_SESSIONS TABLE
-- Track login sessions for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS player_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    session_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Location tracking (for virtual world)
    region_name VARCHAR(255),
    position_x FLOAT,
    position_y FLOAT,
    position_z FLOAT,
    
    -- Session metadata
    client_version VARCHAR(50),
    hud_version VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_sessions_player_id ON player_sessions(player_id);
CREATE INDEX idx_player_sessions_start ON player_sessions(session_start);

-- ============================================
-- XP LEVEL CONFIGURATION TABLE
-- Define XP requirements for each level
-- ============================================
CREATE TABLE IF NOT EXISTS xp_levels (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    total_xp_required INTEGER NOT NULL,
    rewards JSONB DEFAULT '{}'
);

-- Insert default level curve (levels 1-50)
INSERT INTO xp_levels (level, xp_required, total_xp_required) VALUES
(1, 100, 0),
(2, 150, 100),
(3, 225, 250),
(4, 338, 475),
(5, 507, 813),
(6, 761, 1320),
(7, 1142, 2081),
(8, 1713, 3223),
(9, 2570, 4936),
(10, 3855, 7506),
(11, 5000, 11361),
(12, 6500, 16361),
(13, 8450, 22861),
(14, 10985, 31311),
(15, 14281, 42296),
(16, 18565, 56577),
(17, 24135, 75142),
(18, 31376, 99277),
(19, 40789, 130653),
(20, 53026, 171442),
(21, 68934, 224468),
(22, 89614, 293402),
(23, 116498, 383016),
(24, 151447, 499514),
(25, 196881, 650961),
(26, 255945, 847842),
(27, 332729, 1103787),
(28, 432548, 1436516),
(29, 562312, 1869064),
(30, 731006, 2431376),
(31, 950308, 3162382),
(32, 1235400, 4112690),
(33, 1606020, 5348090),
(34, 2087826, 6954110),
(35, 2714174, 9041936),
(36, 3528426, 11756110),
(37, 4586954, 15284536),
(38, 5963040, 19871490),
(39, 7751952, 25834530),
(40, 10077538, 33586482),
(41, 13100799, 43664020),
(42, 17031039, 56764819),
(43, 22140351, 73795858),
(44, 28782456, 95936209),
(45, 37417193, 124718665),
(46, 48642351, 162135858),
(47, 63235056, 210778209),
(48, 82205573, 274013265),
(49, 106867245, 356218838),
(50, 138927419, 463086083)
ON CONFLICT (level) DO NOTHING;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Player summary view with stats
CREATE OR REPLACE VIEW player_summary AS
SELECT 
    p.id,
    p.avatar_uuid,
    p.avatar_name,
    p.display_name,
    p.first_seen,
    p.last_login,
    ps.level,
    ps.current_xp,
    ps.total_xp,
    ps.xp_to_next_level,
    ps.health,
    ps.max_health,
    ps.stamina,
    ps.max_stamina,
    ps.strength,
    ps.agility,
    ps.intelligence,
    ps.defense,
    ps.gold,
    ps.is_online,
    ps.current_zone
FROM players p
LEFT JOIN player_stats ps ON p.id = ps.player_id;

-- Active quests view
CREATE OR REPLACE VIEW active_quests AS
SELECT 
    p.avatar_uuid,
    p.avatar_name,
    pp.quest_id,
    pp.quest_name,
    pp.quest_type,
    pp.status,
    pp.current_step,
    pp.total_steps,
    pp.progress_value,
    pp.target_value,
    ROUND((pp.progress_value::numeric / NULLIF(pp.target_value, 0)) * 100, 2) as progress_percent,
    pp.started_at,
    pp.expires_at
FROM player_progress pp
JOIN players p ON pp.player_id = p.id
WHERE pp.status IN ('active', 'not_started');

-- ============================================
-- FUNCTIONS FOR GAME LOGIC
-- ============================================

-- Function to add XP and handle level ups
CREATE OR REPLACE FUNCTION add_player_xp(
    p_avatar_uuid VARCHAR,
    p_xp_amount INTEGER
)
RETURNS TABLE (
    new_level INTEGER,
    levels_gained INTEGER,
    current_xp INTEGER,
    xp_to_next INTEGER,
    leveled_up BOOLEAN
) AS $$
DECLARE
    v_player_id UUID;
    v_current_level INTEGER;
    v_current_xp INTEGER;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_levels_gained INTEGER := 0;
BEGIN
    -- Get player ID
    SELECT id INTO v_player_id FROM players WHERE avatar_uuid = p_avatar_uuid;
    
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'Player not found: %', p_avatar_uuid;
    END IF;
    
    -- Get current stats
    SELECT level, total_xp INTO v_current_level, v_current_xp
    FROM player_stats WHERE player_id = v_player_id;
    
    -- Add XP
    v_new_xp := v_current_xp + p_xp_amount;
    
    -- Check for level up
    SELECT level INTO v_new_level
    FROM xp_levels
    WHERE total_xp_required <= v_new_xp
    ORDER BY level DESC
    LIMIT 1;
    
    IF v_new_level IS NULL THEN
        v_new_level := 1;
    END IF;
    
    v_levels_gained := v_new_level - v_current_level;
    
    -- Update player stats
    UPDATE player_stats
    SET 
        level = v_new_level,
        total_xp = v_new_xp,
        current_xp = v_new_xp - (SELECT total_xp_required FROM xp_levels WHERE level = v_new_level),
        xp_to_next_level = (SELECT xp_required FROM xp_levels WHERE level = v_new_level + 1) - (v_new_xp - (SELECT total_xp_required FROM xp_levels WHERE level = v_new_level)),
        updated_at = CURRENT_TIMESTAMP
    WHERE player_id = v_player_id;
    
    RETURN QUERY SELECT 
        v_new_level,
        v_levels_gained,
        (SELECT current_xp FROM player_stats WHERE player_id = v_player_id),
        (SELECT xp_to_next_level FROM player_stats WHERE player_id = v_player_id),
        v_levels_gained > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create player
CREATE OR REPLACE FUNCTION get_or_create_player(
    p_avatar_uuid VARCHAR,
    p_avatar_name VARCHAR,
    p_display_name VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_player_id UUID;
BEGIN
    -- Try to get existing player
    SELECT id INTO v_player_id FROM players WHERE avatar_uuid = p_avatar_uuid;
    
    IF v_player_id IS NULL THEN
        -- Create new player
        INSERT INTO players (avatar_uuid, avatar_name, display_name)
        VALUES (p_avatar_uuid, p_avatar_name, p_display_name)
        RETURNING id INTO v_player_id;
        
        -- Create default stats
        INSERT INTO player_stats (player_id)
        VALUES (v_player_id);
    ELSE
        -- Update last login and names
        UPDATE players
        SET 
            last_login = CURRENT_TIMESTAMP,
            avatar_name = p_avatar_name,
            display_name = COALESCE(p_display_name, display_name)
        WHERE id = v_player_id;
    END IF;
    
    RETURN v_player_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Allow all operations" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON player_stats FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON player_progress FOR ALL USING (true);
