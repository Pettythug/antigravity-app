/**
 * ANTIGRAVITY v3.7 - CLEAN CORE (LocalStorage)
 * Handles: LocalStorage Data, Async Google Sheets Sync
 */

const SYNC = window.SYNC = (function() {
    console.log("SYNC Module Loaded (v3.7.3)");

    // --- 1. LOCAL STORAGE DATABASE ---
    const KEY_LOGS = 'AG_LOGS';
    
    // --- 1. LOCAL STORAGE DATABASE ---
    // KEY_LOGS declared above implies the log storage key

    async function initDB() {
        if(localStorage.getItem(KEY_LOGS) === null) {
            localStorage.setItem(KEY_LOGS, JSON.stringify([]));
        }
        console.log("Storage Ready (LocalStorage).");
    }

    // --- 2. LOGIC (LocalStorage) ---

    function getLocalLogs() {
        try {
            return JSON.parse(localStorage.getItem(KEY_LOGS)) || [];
        } catch { return []; }
    }

    function saveLocalLogs(logs) {
        localStorage.setItem(KEY_LOGS, JSON.stringify(logs));
    }

    async function addLog(logData) {
        const logs = getLocalLogs();
        const sets = logData.sets || [];
        const note = logData.notes || "";
        const timestamp = new Date().toISOString();
        
        let newEntries = [];

        if (sets.length === 0) {
             newEntries.push({
                id: Date.now(), // Simple ID
                timestamp: timestamp,
                sessionId: logData.sessionId,
                slot: logData.slot,
                exercise: logData.exercise,
                setNumber: 1,
                weight: 0,
                reps: 0,
                rpe: 0,
                notes: note,
                synced: 0
             });
        } else {
            sets.forEach((set, index) => {
                newEntries.push({
                    id: Date.now() + index,
                    timestamp: timestamp,
                    sessionId: logData.sessionId,
                    slot: logData.slot,
                    exercise: logData.exercise,
                    setNumber: index + 1,
                    weight: set.weight,
                    reps: set.reps,
                    rpe: set.rpe,
                    notes: note,
                    synced: 0
                });
            });
        }

        const updated = logs.concat(newEntries);
        saveLocalLogs(updated);

        console.log("Local Saved (LS). Triggering Background Push...");
        setTimeout(() => pushLogs(), 100);
        
        return true;
    }

    function getPendingLogs() {
        return getLocalLogs().filter(l => l.synced === 0);
    }

    function markSynced(ids) {
        const logs = getLocalLogs();
        logs.forEach(l => {
            if (ids.includes(l.id)) l.synced = 1;
        });
        saveLocalLogs(logs);
    }

    function getLogsForSession(sessionId) {
         return getLocalLogs().filter(l => l.sessionId == sessionId);
    }
    
    // v3.7.2 PB FIX: Fuzzy Search + Absolute Max Weight (No Rep Lock)
    async function getPBForRepRange(exerciseName) {
        // v3.7.2 Logic: Direct LocalStorage Access for speed
        const logs = JSON.parse(localStorage.getItem('AG_LOGS') || '[]');
        if (logs.length === 0) return null;

        const searchName = exerciseName.toLowerCase().trim();

        // FUZZY SEARCH
        const matches = logs.filter(l => 
            l.exercise && 
            (l.exercise.toLowerCase().trim().includes(searchName) || searchName.includes(l.exercise.toLowerCase().trim())) &&
            parseFloat(l.weight) > 0
        );

        if (matches.length === 0) return null;

        // SORT: Heaviest first
        matches.sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight));

        const best = matches[0];
        // RETURN: Simple value
        return best.weight; 
    }

    // --- 3. STORAGE & SYNC (Shared) ---

    const KEY_SESSION = 'AG_SESSION_ID';
    const KEY_ODOMETER = 'AG_ODOMETER';
    const KEY_CONFIG = 'AG_CONFIG';

    function getSessionId() { return parseInt(localStorage.getItem(KEY_SESSION)) || 1; }
    function setSessionId(id) { localStorage.setItem(KEY_SESSION, id); }
    
    function getOdometer() {
        try { return JSON.parse(localStorage.getItem(KEY_ODOMETER)) || {}; } catch { return {}; }
    }
    function setOdometerIndex(slot, index) {
        const odo = getOdometer();
        odo[slot] = index;
        localStorage.setItem(KEY_ODOMETER, JSON.stringify(odo));
    }

    // CONFIG & API Bridge
    // CONFIG & API Bridge
    // v3.7 Hardcoded URL (Recovered from v2.8)
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzn6Ms8ytLI7YLKPfMvoFP-rhv-QpV7rSimBfWTYUrg3WarcDS89Ht4wVRVq3y59cIgoA/exec";
    
    let onSyncStatus = null;
    function registerStatusCallback(cb) { onSyncStatus = cb; }
    function notifyStatus(status) { if (onSyncStatus) onSyncStatus(status); }

    function getConfig() {
        const conf = JSON.parse(localStorage.getItem(KEY_CONFIG)) || { apiUrl: '' };
        // v3.7: Force Hardcoded URL if config is empty
        if (!conf.apiUrl) {
            return { apiUrl: SCRIPT_URL };
        }
        return conf;
    }
    function setConfig(conf) { localStorage.setItem(KEY_CONFIG, JSON.stringify(conf)); }

    async function pullState() {
        const config = getConfig();
        if (!config.apiUrl) { notifyStatus('red'); return { status: 'no_url' }; }
        notifyStatus('yellow');
        try {
            const res = await fetch(config.apiUrl, { method: 'GET', mode: 'cors', credentials: 'omit' });
            const data = await res.json();
             if (data.status === 'success') {
                if (data.data.CurrentSessionID) setSessionId(parseInt(data.data.CurrentSessionID));
                
                // HYDRATION LOGIC (v3.7.2 Fix)
                if (data.data.logs && Array.isArray(data.data.logs)) {
                    console.log("Hydrated Logs Count:", data.data.logs.length);
                    // Safe Merge: Server Logs + Pending Local Logs
                    const localLogs = getLocalLogs();
                    const pending = localLogs.filter(l => l.synced === 0);
                    
                    const serverLogs = data.data.logs;
                    const merged = [...serverLogs];
                    
                    // Add pending if they aren't in server list (by ID)
                    pending.forEach(p => {
                        if(!merged.find(m => m.id === p.id)) {
                            merged.push(p);
                        }
                    });
                    
                    localStorage.setItem(KEY_LOGS, JSON.stringify(merged));
                } else {
                    console.log("Hydrated Logs Count: 0 (No logs in response)");
                }

                notifyStatus('green');
                return { status: 'success', data: data.data };
            }
            notifyStatus('red');
            return { status: 'error', message: data.message };
        } catch (e) {
            notifyStatus('red');
            return { status: 'offline', error: e };
        }
    }

    let isPushing = false;

    async function pushLogs() {
        if (isPushing) return; // Prevent double-fire
        isPushing = true;

        const pending = getPendingLogs();
        if (pending.length === 0) { 
            notifyStatus('green'); 
            isPushing = false;
            return; 
        }

        const config = getConfig();
        if (!config.apiUrl) { 
            notifyStatus('red'); 
            console.log("Sync Skipped: No API URL");
            isPushing = false;
            return; 
        }
        
        notifyStatus('yellow');

        // v3.7.1: Optimistic Locking
        // Mark as synced IMMEDIATELY to prevent double-sends
        const ids = pending.map(l => l.id); 
        markSynced(ids);

        const payload = { logs: pending, updateSessionId: getSessionId() };
        
        // Fetch with CORS (Audit Fix)
        fetch(config.apiUrl, {
            method: 'POST', mode: 'cors', credentials: 'omit',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        })
        .then(res => res.text()) // Consume body to ensure completion
        .then(txt => {
            console.log("Background Push Success:", txt);
            notifyStatus('green');
        })
        .catch(e => {
            console.log("Background Push Warning (Silent)", e);
            // We optimized to "Synced". If it failed, data is technically dirty on server, 
            // but user prefers NO DUPLICATES over retry loops.
            notifyStatus('red'); 
        })
        .finally(() => {
            isPushing = false;
        });
    }

    async function manualSync() {
        notifyStatus('yellow');
        const pushRes = await pushLogs();
        const pullRes = await pullState();
        return { push: pushRes, pull: pullRes };
    }

    return {
        initDB,
        addLog,
        getPendingLogs,
        getLogsForSession,
        getSessionId,
        setSessionId,
        getOdometer,
        setOdometerIndex,
        getConfig,
        setConfig,
        pullState,
        pushLogs,
        getPBForRepRange,
        registerStatusCallback,
        manualSync
    };

})();
