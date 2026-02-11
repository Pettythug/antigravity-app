/**
 * MODULE: STABILITY
 * Usage: Core / Isometric Holds
 * Features: Integrated Stopwatch
 */

/**
 * MODULE: STABILITY
 * Usage: Core / Abs / Structural Integrity
 * Features: Global Mode Toggle (Time vs Reps), Dynamic Rows
 */

const STABILITY = window.STABILITY = (function() {
    console.log("STABILITY Module Loaded (v3.7.2-PB-FIX)");
    
    let context = {};
    let rowCount = 3;
    let mode = 'TIME'; // 'TIME' or 'REPS'
    let timerInterval = null;
    let seconds = 0;

    async function init(container, ctx) {
        context = ctx;
        rowCount = 3;
        mode = 'TIME'; // Default
        seconds = 0;

        renderLayout(container);
    }

    function renderLayout(container) {
        // Determine PB Label based on mode
        // For Time, we might look for "1" rep max (placeholder) or duration note
        // For Reps, we look for weight
        
        container.innerHTML = `
             <div class="module-header" style="border-bottom: none; margin-bottom: 10px;">
                <h2 style="font-size: 1.4rem; text-transform: uppercase; letter-spacing: 1px;">${context.exerciseName}</h2>
                <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 1.1rem; font-weight: bold;">
                     <div style="color: var(--primary);">CORE</div>
                     <div style="color: var(--secondary);" id="s-pb-disp">PB: --</div>
                </div>
            </div>

            <!-- MODE TOGGLE -->
            <div style="display: flex; margin-bottom: 20px; border: 1px solid #333; border-radius: 8px; overflow: hidden;">
                <button id="btn-mode-reps" onclick="STABILITY.setMode('REPS')" style="flex: 1; padding: 12px; background: #111; color: #888; border: none; font-weight: bold;">REPS (WEIGHT)</button>
                <button id="btn-mode-time" onclick="STABILITY.setMode('TIME')" style="flex: 1; padding: 12px; background: var(--primary); color: #000; border: none; font-weight: bold;">TIME (DURATION)</button>
            </div>

            <!-- STOPWATCH (Only valid in TIME mode) -->
            <div id="stopwatch-panel" style="background: #111; border: 1px solid #333; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                <div id="stab-timer" style="font-size: 3.5rem; font-weight: bold; color: var(--accent); font-variant-numeric: tabular-nums;">00:00</div>
                <div style="margin-top: 10px; display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-small" onclick="STABILITY.toggleTimer()" id="btn-timer">START</button>
                    <button class="btn btn-secondary btn-small" onclick="STABILITY.resetTimer()">RESET</button>
                </div>
            </div>
            
            <!-- EXERCISE LOG -->
            <div id="stab-rows" style="flex:1; overflow-y: auto; padding: 10px 0;">
                <!-- Dynamic Rows -->
            </div>

            <button class="btn btn-small btn-secondary" style="margin-bottom: 16px; width: 100%; padding: 12px; font-size: 1rem;" onclick="STABILITY.addRow()">+ ADD SET</button>

             <div class="notes-section" style="margin-top: 20px;">
                <textarea id="s-notes" placeholder="Notes..." style="width: 100%; background: #111; border: 1px solid #333; color: #ddd; padding: 12px; min-height: 80px; font-size: 1rem;"></textarea>
            </div>

            <div class="action-footer" style="padding-top: 20px;">
                <button class="btn btn-secondary w-half" onclick="STABILITY.cancel()" style="padding: 16px; font-size: 1.1rem;">BACK</button>
                <button class="btn w-half" onclick="STABILITY.finish()" style="padding: 16px; font-size: 1.1rem;">SAVE</button>
            </div>
        `;

        // Render Initial Rows
        renderAllRows();
        updatePB();
    }

    async function updatePB() {
        const pb = await SYNC.getPBForRepRange(context.exerciseName, "1");
        if(pb) document.getElementById('s-pb-disp').innerText = `PB: ${pb}`;
    }

    function setMode(newMode) {
        mode = newMode;
        const btnReps = document.getElementById('btn-mode-reps');
        const btnTime = document.getElementById('btn-mode-time');
        const stopwatch = document.getElementById('stopwatch-panel');

        if(mode === 'REPS') {
            btnReps.style.background = 'var(--primary)';
            btnReps.style.color = '#000';
            btnTime.style.background = '#111';
            btnTime.style.color = '#888';
            stopwatch.style.display = 'none';
        } else {
            btnTime.style.background = 'var(--primary)';
            btnTime.style.color = '#000';
            btnReps.style.background = '#111';
            btnReps.style.color = '#888';
            stopwatch.style.display = 'block';
        }
        
        // Re-render rows to match inputs
        renderAllRows();
    }

    function renderAllRows() {
        const container = document.getElementById('stab-rows');
        container.innerHTML = '';
        for(let i=0; i<rowCount; i++) {
            renderRow(i);
        }
    }

    function renderRow(index) {
        const container = document.getElementById('stab-rows');
        const div = document.createElement('div');
        div.className = 'stab-row';
        div.style.marginBottom = "12px";
        
        let inputsHtml = '';

        if(mode === 'REPS') {
            // WEIGHT | REPS | RPE
             inputsHtml = `
                <input type="number" class="inp-weight" placeholder="Lbs" inputmode="decimal" pattern="\\d*" style="flex:1; font-size: 1.4rem; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
                <input type="number" class="inp-reps" placeholder="Reps" inputmode="decimal" pattern="\\d*" style="flex:1; font-size: 1.4rem; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
            `;
        } else {
            // TIME | RPE
            // We use text input for time to allow "45s" or "1:30"
            // For mobile, decimal keypad usually has ":" or "." which helps.
             inputsHtml = `
                <input type="text" class="inp-time" placeholder="00:00" style="flex:2; font-size: 1.4rem; padding: 12px; background: #222; border: 1px solid #444; color: var(--accent); border-radius: 6px; text-align: center;">
            `;
        }

        div.innerHTML = `
            <div style="font-size: 0.8rem; color: #888; margin-bottom: 4px;">SET ${index+1}</div>
            <div style="display: flex; gap: 8px;">
                ${inputsHtml}
                <select class="inp-rpe" style="width: 70px; font-size: 1.2rem; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
                    <option value="" disabled selected>RPE</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                </select>
            </div>
        `;
        container.appendChild(div);
    }

    function addRow() {
        rowCount++;
        renderRow(rowCount-1);
    }

    // Timer Logic
    function toggleTimer() {
        const btn = document.getElementById('btn-timer');
        if(timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            btn.innerText = "START";
            btn.className = "btn btn-small";
        } else {
            seconds = 0; // Reset on start for simple stopwatch? Or continue? 
            // Request implies stopwatch to track hold. Let's just track continuously.
            timerInterval = setInterval(() => {
                seconds++;
                updateDisplay();
            }, 1000);
            btn.innerText = "STOP";
            btn.className = "btn btn-small btn-secondary";
        }
    }
    
    function resetTimer() {
        if(timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        seconds = 0;
        updateDisplay();
        document.getElementById('btn-timer').innerText = "START";
        document.getElementById('btn-timer').className = "btn btn-small";
    }

    function updateDisplay() {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        document.getElementById('stab-timer').innerText = 
            `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    function cancel() {
        resetTimer();
        if(context.onCancel) context.onCancel();
    }

    function finish() {
        const rows = document.querySelectorAll('.stab-row');
        let setDetails = [];
        let maxWeight = 0;

        // Helper to parse "1:30" or "90" into seconds
        function parseTime(str) {
            if(!str) return 0;
            if(str.includes(':')) {
                const parts = str.split(':');
                const m = parseInt(parts[0]) || 0;
                const s = parseInt(parts[1]) || 0;
                return (m * 60) + s;
            }
            return parseFloat(str) || 0;
        }
        
        rows.forEach(r => {
             const rpe = parseFloat(r.querySelector('.inp-rpe').value) || 0;
             
             if(mode === 'REPS') {
                 const w = parseFloat(r.querySelector('.inp-weight').value) || 0;
                 const reps = parseFloat(r.querySelector('.inp-reps').value) || 0;
                 if(w > 0 || reps > 0) {
                     setDetails.push({ weight: w, reps: reps, rpe: rpe });
                     if(w > maxWeight) maxWeight = w;
                 }
             } else {
                 // TIME Mode
                 const tVal = r.querySelector('.inp-time').value;
                 const seconds = parseTime(tVal);
                 if(seconds > 0) {
                     // Store Seconds as Reps, Weight 0
                     setDetails.push({ weight: 0, reps: seconds, rpe: rpe });
                 }
             }
        });

        const noteVal = document.getElementById('s-notes').value;

        // Note: For Time mode, we lose the formatted string "1:30" in the notes if we rely only on seconds in DB.
        // But the DB is source of truth.
        // We can append the mode to the notes to be helpful.
        const finalNotes = (mode === 'TIME' ? "[TIME Mode] " : "") + (noteVal || "");

        if(context.onFinish) context.onFinish({
            sessionId: SYNC.getSessionId(),
            slot: context.slot,
            exercise: context.exerciseName,
            sets: setDetails,
            notes: finalNotes
        });
    }

    return { init, setMode, toggleTimer, resetTimer, addRow, finish, cancel };

})();
