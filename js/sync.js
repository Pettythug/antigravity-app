/**
 * ANTIGRAVITY v3.8 - DATA HYDRATION (LocalStorage)
 * Handles: LocalStorage Data, Async Cloud Sync, Cold Start Hydration
 */

const SYNC = window.SYNC = (function() {

    // --- 1. LOCAL STORAGE DATABASE ---
    const KEY_LOGS = 'AG_LOGS';
    
    // --- 1. LOCAL STORAGE DATABASE ---
    // KEY_LOGS declared above implies the log storage key

    async function initDB() {
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
    
    // v3.0 PB Logic adapted for Array
    async function getPBForRepRange(exerciseName, targetReps) {
        const logs = getLocalLogs();
        let minReps = parseInt(targetReps);
        if(isNaN(minReps)) minReps = 1;

        // Filter by exercise and Reps
        const matches = logs.filter(l => l.exercise === exerciseName && l.reps >= minReps);
        if (matches.length === 0) return null;

        // Find Max Weight
        const maxWeight = matches.reduce((max, l) => Math.max(max, parseFloat(l.weight) || 0), 0);
        return maxWeight > 0 ? maxWeight : null;
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
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxMPwwjgHMIjl6UkdjZNuCqsSCPIw8PpD7ZJ-bkeWZSkedjL3MlKoL_fu9rGWH-VFE_1Q/exec";
    
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
                
                // v3.8 HYDRATION LOGIC
                // If LocalStorage is empty, populate it with Cloud Data
                const localLogs = getLocalLogs();
                if (localLogs.length === 0 && data.data.logs && Array.isArray(data.data.logs)) {
                    console.log(`Hydrating ${data.data.logs.length} logs from Cloud...`);
                    // Ensure we save it to LocalStorage
                    saveLocalLogs(data.data.logs);
                    
                    // Force a reload might be needed if the UI is already rendered? 
                    // But Hub renders after init. pullState is usually async in background. 
                    // If we hydrate, we might want to trigger a refresh of PBs or UI.
                    // For now, we just save. The user can reload or next module open will see it.
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
