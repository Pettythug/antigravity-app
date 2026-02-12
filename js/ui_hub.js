/**
 * ANTIGRAVITY v3.8.5 - UI HUB
 * Handles: Dashboard Rendering, Navigation, "Done" State, Module Loading
 */

const HUB = (function() {

    let currentSession = null;
    let completedSlots = new Set(); 
    let exerciseSnapshot = {}; // v2.6 Lockdown

    async function init() {
        try {
            console.log("HUB Init...");

            if (typeof SYNC === 'undefined') throw new Error("SYNC module not loaded. Check js/sync.js");
            if (typeof ENGINE === 'undefined') throw new Error("ENGINE module not loaded. Check js/engine.js");

            if (typeof ENGINE === 'undefined') throw new Error("ENGINE module not loaded. Check js/engine.js");

            // v3.7 Clean: Init Storage
            SYNC.initDB();
            
            // Remove overlay immediately if present in HTML (Safety check)
            const overlay = document.getElementById('init-overlay');
            if(overlay) overlay.style.display = 'none';

            // v2.8: Register Sync Status Listener
            if(SYNC.registerStatusCallback) {
                SYNC.registerStatusCallback(setSyncStatus);
            }
            
            // Load initial state
            const sessId = SYNC.getSessionId();
            currentSession = ENGINE.getSessionInfo(sessId);
            
            // v2.6: Odometer Lockdown (Snapshot)
            loadSnapshot(sessId);

            // Load completion status
            await refreshCompletionStatus();
            
            // Render Dashboard
            renderDashboard();
            
            // Background Sync
            // Background Sync
            SYNC.pullState().then(res => {
                if (res && res.CurrentSessionID) {
                    const localId = SYNC.getSessionId();
                    const serverId = parseInt(res.CurrentSessionID);
                    
                    // 3. Force Spreadsheet Authority
                    if (serverId !== localId) {
                        console.log(`Version Mismatch! Server: ${serverId}, Local: ${localId}. Enforcing Server Authority.`);
                        SYNC.setSessionId(serverId);
                        // 4. Force Reload to ensure Snapshot/DOM are correct
                        location.reload();
                    }
                }
            });
        } catch (e) {
            console.error(e);
            document.getElementById('app-container').innerHTML = `
                <div class="card" style="border: 1px solid red; color: red;">
                    <h2>Startup Error</h2>
                    <p>${e.message}</p>
                    <pre style="font-size: 0.7rem; color: #aaa;">${e.stack}</pre>
                </div>
            `;
        }
    }

    // v2.8: Sync Visuals
    function setSyncStatus(status) {
        const dot = document.getElementById('sync-status');
        if(!dot) return;
        
        // Colors
        if(status === 'green') dot.style.background = '#4cd964'; // Green
        if(status === 'yellow') dot.style.background = '#ffcc00'; // Yellow
        if(status === 'red') dot.style.background = '#ff3b30'; // Red
    }

    async function triggerSync() {
        if(SYNC.manualSync) {
            const btn = document.getElementById('btn-sync-now');
            if(btn) btn.innerText = "Syncing...";
            
            await SYNC.manualSync();
            
            if(btn) btn.innerText = "Sync Now";
            // Refresh dashboard in case ID changed
            const currentId = parseInt(currentSession.id);
            const newId = SYNC.getSessionId();
            if(newId !== currentId) location.reload();
        }
    }

    // v2.6 LOCKDOWN LOGIC
    function loadSnapshot(sessionId) {
        const KEY = `AG_SNAPSHOT_${sessionId}`;
        const cached = localStorage.getItem(KEY);
        
        if (cached) {
            exerciseSnapshot = JSON.parse(cached);
            console.log("Loaded Snapshot:", exerciseSnapshot);
        } else {
            console.log("Creating New Snapshot...");
            const odo = SYNC.getOdometer();
            exerciseSnapshot = {};
            currentSession.plan.forEach(slot => {
                // Capture the name NOW and freeze it
                exerciseSnapshot[slot] = ENGINE.getExerciseName(slot, odo[slot]);
            });
            localStorage.setItem(KEY, JSON.stringify(exerciseSnapshot));
        }
    }

    async function refreshCompletionStatus() {
        completedSlots.clear();
        const logs = await SYNC.getLogsForSession(currentSession.id);
        logs.forEach(log => {
            if (log.slot) completedSlots.add(log.slot);
        });
        updateDashboardStatus();
    }

    function renderDashboard() {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div id="dashboard-view">
                <header class="hub-header">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--primary); margin-bottom: 4px; letter-spacing: 1px; font-weight: bold;">ANTIGRAVITY v3.8.5</div>
                        <h1 style="font-size: 1.2rem;">SESSION ${currentSession.id}</h1>
                        <span class="badge">${currentSession.waveInfo.Name}</span>
                        <span class="badge secondary">${currentSession.isA ? 'Pull/Hinge' : 'Push/Squat'}</span>
                    </div>
                    <div id="sync-status" class="status-dot"></div>
                </header>

                <div class="workout-list">
                    ${currentSession.plan.map(slot => renderSlotItem(slot)).join('')}
                </div>

                <div class="hub-footer">
                    <button class="btn btn-secondary" onclick="HUB.finishSession()">Complete Session</button>
                    <!-- v2.8 Manual Sync -->
                    <div style="margin-top:16px; font-size: 0.9rem; text-align: center;">
                        v3.8.5 &bull; <span style="text-decoration: underline; cursor: pointer;" onclick="HUB.hardReset()">Reset App</span>
                    </div>
                    <div style="margin-top:10px; font-size: 0.7rem; text-align: center; color: #666;">
                        v3.2 SQLite Engine
                    </div>
                </div>
            </div>
            <div id="module-container" hidden></div>
            
                </div>
            </div>
            <div id="module-container" hidden></div>
        `;
    }

    function renderSlotItem(slot) {
        // v2.6: Use Snapshot instead of live query
        const exerciseName = exerciseSnapshot[slot] || "Unknown";
        const isDone = completedSlots.has(slot);
        
        // v2.7 Vault Lock Logic
        const clickAction = isDone ? '' : `onclick="HUB.openModule('${slot}')"`;
        const style = isDone ? 'opacity: 0.6; pointer-events: none;' : '';
        const icon = isDone ? '<span style="color: #4cd964; font-weight: bold;">✔</span>' : '›';
        
        return `
            <div class="workout-item ${isDone ? 'done' : ''}" ${clickAction} style="${style}">
                <div class="slot-badge">${slot}</div>
                <div class="exercise-info">
                    <div class="exercise-name">${exerciseName}</div>
                    <div class="exercise-meta">${getMetaForSlot(slot)}</div>
                </div>
                <div class="arrow">${icon}</div>
            </div>
        `;
    }

    function getMetaForSlot(slot) {
        const mod = ENGINE.getModuleForSlot(slot);
        if (mod === 'power') return `Target: ${ENGINE.getPrimerReps(currentSession.wave)} Reps`;
        if (mod === 'grind') return `3+ Sets`;
        if (mod === 'stability') return `Timer`;
        return `Engine`;
    }

    function updateDashboardStatus() {
        renderDashboard();
    }

    function openModule(slot) {
        const moduleType = ENGINE.getModuleForSlot(slot);
        launchModule(moduleType, slot);
    }

    function launchModule(type, slot) {
        document.getElementById('dashboard-view').hidden = true;
        const modContainer = document.getElementById('module-container');
        modContainer.hidden = false;
        modContainer.innerHTML = ''; 

        const moduleObj = window[type.toUpperCase()]; 
        if (moduleObj && moduleObj.init) {
            // v2.6: Pass the SNAPSHOT name, not live Odometer
            const exerciseName = exerciseSnapshot[slot] || "Unknown";
            
            moduleObj.init(modContainer, {
                slot: slot,
                exerciseName: exerciseName,
                waveInfo: currentSession.waveInfo,
                onFinish: async (logData) => {
                    await SYNC.addLog(logData);
                    
                    // Rotate Odometer (Behind the scenes)
                    // The Hub will still show the OLD name until Next Session
                    const odo = SYNC.getOdometer();
                    const currentIdx = odo[slot] || 0;
                    SYNC.setOdometerIndex(slot, currentIdx + 1);
                    
                    returnToHub();
                },
                onCancel: () => {
                    returnToHub();
                }
            });
        } else {
            modContainer.innerText = `Error: Module ${type} not found.`;
        }
    }

    function returnToHub() {
        document.getElementById('module-container').hidden = true;
        document.getElementById('dashboard-view').hidden = false;
        refreshCompletionStatus();
    }
    
    async function finishSession() {
        if (!confirm("Advance to next Session?")) return;
    
        const btn = document.querySelector('.hub-footer .btn');
        if(btn) {
             btn.innerText = "Saving to Google...";
             btn.style.opacity = "0.5";
             btn.disabled = true;
        }
        
        try {
            // 2. Increment Locally first
            const currentId = parseInt(currentSession.id);
            const nextId = currentId + 1;
            SYNC.setSessionId(nextId);
    
            // 3. FORCE PUSH and WAIT (with 5s timeout)
            const syncPromise = SYNC.pushLogs();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), 5000)
            );
    
            await Promise.race([syncPromise, timeoutPromise]);
            
            console.log("Sync confirmed. Reloading...");
        } catch (e) {
            console.warn("Sync failed or timed out, but advancing anyway.", e);
        } finally {
            // 4. Clean up snapshot and refresh
            const KEY = `AG_SNAPSHOT_${currentSession.id}`;
            localStorage.removeItem(KEY);
            location.reload();
        }
    }

    return {
        init,
        openModule,
        finishSession,
        triggerSync, // v2.8 export
        downloadDB
    };

    function downloadDB() {
        const url = SYNC.getExportURL();
        if(url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `antigravity_backup_${new Date().toISOString().slice(0,10)}.sqlite`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert("Database not ready.");
        }
    }

})();

// Auto-boot
window.addEventListener('DOMContentLoaded', HUB.init);
