/**
 * ANTIGRAVITY v3.8.5 - SYNC CORE
 * Fixed: Synchronous Handshake & Validated 9-Column Payload
 */

const SYNC = window.SYNC = (function() {

    const KEY_LOGS = 'AG_LOGS';
    const KEY_SESSION = 'AG_SESSION_ID';
    const KEY_CONFIG = 'AG_CONFIG';
    // NEW DEPLOYMENT URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjzb0F8bixnlvSXhZMYNgi17_TA2gTZYogT-kCa78Ni71-C6rVjtG4m9RM6PplTzyMZA/exec";

    function initDB() { console.log("Sync Engine v3.8.4.1 Ready."); }

    function getLocalLogs() {
        try { return JSON.parse(localStorage.getItem(KEY_LOGS)) || []; } catch { return []; }
    }

    function saveLocalLogs(logs) { localStorage.setItem(KEY_LOGS, JSON.stringify(logs)); }

    function getSessionId() { return parseInt(localStorage.getItem(KEY_SESSION)) || 1; }
    function setSessionId(id) { localStorage.setItem(KEY_SESSION, id); }

    function markSynced(ids) {
        const logs = getLocalLogs();
        const updated = logs.map(l => {
            if (ids.includes(l.id)) return { ...l, synced: 1 };
            return l;
        });
        saveLocalLogs(updated);
    }

    async function addLog(logData) {
        const logs = getLocalLogs();
        const timestamp = new Date().toISOString();
        const sets = logData.sets || [{ weight: 0, reps: 1, rpe: 0 }]; // Fallback for Engine/Stability

        const newEntries = sets.map((set, i) => ({
            id: Date.now() + i,
            timestamp: timestamp,
            sessionId: logData.sessionId,
            slot: logData.slot,
            exercise: logData.exercise,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            notes: logData.notes || "",
            synced: 0
        }));

        saveLocalLogs(logs.concat(newEntries));
        // Trigger background push but don't wait for it here
        pushLogs(); 
        return true;
    }

    async function pushLogs() {
        const pending = getLocalLogs().filter(l => l.synced === 0);
        if (pending.length === 0) return Promise.resolve("No pending data");

        notifyStatus('yellow');
        const payload = { 
            logs: pending, 
            updateSessionId: getSessionId() + 1
        };

        // CRITICAL: Return the promise so the UI can await it
        return fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(payload)
        })
        .then(res => res.text())
        .then(txt => {
            // Check for success message from server
            if (txt.includes("Success")) {
                const ids = pending.map(l => l.id);
                markSynced(ids); // ONLY mark synced on success
                notifyStatus('green');
                return "Success";
            }
            throw new Error(txt);
        })
        .catch(err => {
            notifyStatus('red');
            console.error("Sync Error:", err);
            throw err;
        });
    }

    async function pullState() {
        notifyStatus('yellow');
        try {
            const res = await fetch(SCRIPT_URL);
            const data = await res.json();
            if (data.status === 'success') {
                if (data.data.CurrentSessionID) setSessionId(data.data.CurrentSessionID);
                notifyStatus('green');
                return data.data;
            }
        } catch (e) { notifyStatus('red'); }
    }

    let onSyncStatus = null;
    function registerStatusCallback(cb) { onSyncStatus = cb; }
    function notifyStatus(status) { if (onSyncStatus) onSyncStatus(status); }

    // v3.8.2: Fuzzy Matching + Lightweight PB Lookup
    async function getPBForRepRange(exerciseName, targetReps) {
        const logs = getLocalLogs();
        const minReps = parseInt(targetReps) || 1;
        const searchName = exerciseName.toLowerCase().trim();
        
        const matches = logs.filter(l => 
            l.exercise && 
            l.exercise.toLowerCase().trim().includes(searchName) && 
            parseInt(l.reps) >= minReps
        );
        
        if (matches.length === 0) return null;
        return Math.max(...matches.map(l => parseFloat(l.weight) || 0));
    }

    function getOdometer() {
        // Mock Odometer if missing from original snippet, needed for UI Hub
         try { return JSON.parse(localStorage.getItem('AG_ODOMETER')) || {}; } catch { return {}; }
    }
    
    function setOdometerIndex(slot, index) {
        const odo = getOdometer();
        odo[slot] = index;
        localStorage.setItem('AG_ODOMETER', JSON.stringify(odo));
    }

    return { 
        initDB, 
        addLog, 
        getSessionId, 
        setSessionId, 
        pullState, 
        pushLogs, 
        getPBForRepRange, 
        registerStatusCallback, 
        getLogsForSession: (id) => getLocalLogs().filter(l => l.sessionId == id),
        getOdometer,
        setOdometerIndex
    };
})();
