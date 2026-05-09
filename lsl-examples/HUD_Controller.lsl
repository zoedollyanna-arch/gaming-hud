// LSL HUD Controller - Player Stats & Progress Integration
// This script demonstrates how to communicate with the REST API from Second Life

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
string API_BASE_URL = "https://your-render-app.onrender.com";  // Replace with your Render URL
string API_KEY = "your-secret-api-key-here";  // Must match API_SECRET_KEY env variable

// Avatar identification (set automatically)
key gAvatarUUID;
string gAvatarName;

// Player state cache
integer gPlayerLevel = 1;
integer gCurrentXP = 0;
integer gHealth = 100;
integer gStamina = 100;
integer gGold = 0;

// HTTP request handles
key gLoginRequest;
key gStatsRequest;
key gUpdateRequest;
key gQuestRequest;
key gXPRequest;

// ============================================
// HELPER FUNCTIONS
// ============================================

// Build JSON string from key-value pairs
string BuildJSON(list keys, list values) {
    string json = "{";
    integer i;
    integer count = llGetListLength(keys);
    
    for (i = 0; i < count; i++) {
        if (i > 0) json += ",";
        string key = llList2String(keys, i);
        string value = llList2String(values, i);
        
        // Check if value is numeric (no quotes) or string (with quotes)
        if (llSubStringIndex("0123456789-", llGetSubString(value, 0, 0)) >= 0 && 
            (llSubStringIndex(value, "{") < 0 && llSubStringIndex(value, "[") < 0)) {
            json += "\"" + key + "\":" + value;
        } else {
            json += "\"" + key + "\":\"" + value + "\"";
        }
    }
    
    json += "}";
    return json;
}

// ============================================
// API FUNCTIONS
// ============================================

// Player Login - Call this on attach/rez
PlayerLogin() {
    gAvatarUUID = llGetOwner();
    gAvatarName = llKey2Name(gAvatarUUID);
    
    string url = API_BASE_URL + "/api/lsl/player/login";
    string body = BuildJSON(
        ["avatar_uuid", "avatar_name", "display_name"],
        [(string)gAvatarUUID, gAvatarName, ""]
    );
    
    gLoginRequest = llHTTPRequest(url, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], body);
}

// Get Player Stats
GetPlayerStats() {
    string url = API_BASE_URL + "/api/lsl/player/" + (string)gAvatarUUID + "/stats";
    
    gStatsRequest = llHTTPRequest(url, [
        HTTP_METHOD, "GET",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], "");
}

// Update Player Stats
UpdatePlayerStats(integer health, integer stamina, integer gold) {
    string url = API_BASE_URL + "/api/lsl/player/" + (string)gAvatarUUID + "/stats";
    string body = BuildJSON(
        ["health", "stamina", "gold"],
        [(string)health, (string)stamina, (string)gold]
    );
    
    gUpdateRequest = llHTTPRequest(url, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], body);
}

// Add XP (handles level ups automatically)
AddXP(integer amount) {
    string url = API_BASE_URL + "/api/lsl/player/" + (string)gAvatarUUID + "/xp";
    string body = BuildJSON(["xp_amount"], [(string)amount]);
    
    gXPRequest = llHTTPRequest(url, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], body);
}

// Update Quest Progress
UpdateQuest(string questId, string questName, string status, integer currentStep, integer progressValue) {
    string url = API_BASE_URL + "/api/lsl/player/" + (string)gAvatarUUID + "/quests";
    string body = BuildJSON(
        ["quest_id", "quest_name", "status", "current_step", "progress_value"],
        [questId, questName, status, (string)currentStep, (string)progressValue]
    );
    
    gQuestRequest = llHTTPRequest(url, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], body);
}

// Get Active Quests
GetActiveQuests() {
    string url = API_BASE_URL + "/api/lsl/player/" + (string)gAvatarUUID + "/quests?status=active";
    
    gQuestRequest = llHTTPRequest(url, [
        HTTP_METHOD, "GET",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], "");
}

// Record Session Start (call on attach)
SessionStart() {
    string url = API_BASE_URL + "/api/lsl/player/" + (string)gAvatarUUID + "/session/start";
    string region = llGetRegionName();
    vector pos = llGetPos();
    
    string body = BuildJSON(
        ["region_name", "position_x", "position_y", "position_z", "hud_version"],
        [region, (string)pos.x, (string)pos.y, (string)pos.z, "1.0.0"]
    );
    
    llHTTPRequest(url, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], body);
}

// Record Session End (call on detach)
SessionEnd() {
    string url = API_BASE_URL + "/api/lsl/player/" + (string)gAvatarUUID + "/session/end";
    
    llHTTPRequest(url, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "X-API-Key", API_KEY
    ], "");
}

// ============================================
// EVENT HANDLERS
// ============================================

default {
    state_entry() {
        llOwnerSay("HUD Controller initialized. Click to login.");
    }
    
    attach(key id) {
        if (id != NULL_KEY) {
            gAvatarUUID = id;
            gAvatarName = llKey2Name(id);
            llOwnerSay("Attaching HUD for " + gAvatarName);
            
            // Login and start session
            PlayerLogin();
            SessionStart();
            
            // Fetch current stats
            llSleep(1.0);  // Wait for login to complete
            GetPlayerStats();
        }
    }
    
    detach() {
        SessionEnd();
        llOwnerSay("HUD detached. Session recorded.");
    }
    
    touch_start(integer total_number) {
        // Menu options
        llDialog(llGetOwner(), "HUD Menu", ["Get Stats", "Add XP", "Update Quest", "Active Quests"], -1);
    }
    
    listen(integer channel, string name, key id, string message) {
        if (message == "Get Stats") {
            GetPlayerStats();
        }
        else if (message == "Add XP") {
            // Example: Add 50 XP
            AddXP(50);
            llOwnerSay("Adding 50 XP...");
        }
        else if (message == "Update Quest") {
            // Example: Update a quest
            UpdateQuest("quest_001", "First Steps", "active", 1, 25);
            llOwnerSay("Quest progress updated!");
        }
        else if (message == "Active Quests") {
            GetActiveQuests();
        }
    }
    
    http_response(key request_id, integer status, list metadata, string body) {
        if (status != 200) {
            llOwnerSay("API Error: " + (string)status);
            return;
        }
        
        if (request_id == gLoginRequest) {
            llOwnerSay("Login successful!");
            // Parse response to show welcome message
            if (llSubStringIndex(body, "\"avatar_name\"") >= 0) {
                llOwnerSay("Welcome, your progress is being tracked.");
            }
        }
        else if (request_id == gStatsRequest) {
            // Parse and display stats
            llOwnerSay("Stats received: " + body);
            
            // Extract values from JSON response
            // (In production, use a proper JSON parser)
            if (llSubStringIndex(body, "\"level\"") >= 0) {
                integer levelPos = llSubStringIndex(body, "\"level\"") + 8;
                string levelStr = llGetSubString(body, levelPos, llSubStringIndex(llGetSubString(body, levelPos, -1), ",") + levelPos - 1);
                gPlayerLevel = (integer)levelStr;
                llOwnerSay("Current Level: " + (string)gPlayerLevel);
            }
        }
        else if (request_id == gXPRequest) {
            if (llSubStringIndex(body, "\"leveled_up\":true") >= 0) {
                llOwnerSay("🎉 LEVEL UP! You gained a level!");
                // Play celebration effect
                llTriggerSound("level_up_sound", 1.0);
            }
            else {
                llOwnerSay("XP added successfully!");
            }
        }
        else if (request_id == gQuestRequest) {
            llOwnerSay("Quest data updated!");
        }
    }
}
