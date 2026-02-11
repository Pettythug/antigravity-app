/**
 * MODULE: POWER
 * Usage: Dynamic Effort / Primers (Cleans, Jumps)
 * Features: Target Rep Display, Dynamic Rows
 */

const POWER = window.POWER = (function() {
    console.log("POWER Module Loaded (v3.7.3)");
    
    let context = {};
    let rowCount = 3;

    async function init(container, ctx) {
        context = ctx;
        rowCount = 3; // Default

        // Determine Target Reps
        const wave = ENGINE.getSessionInfo(SYNC.getSessionId()).wave;
        const target = ENGINE.getPrimerReps(wave);

        container.innerHTML = `
             <div class="module-header" style="border-bottom: none; margin-bottom: 10px;">
                <h2 style="font-size: 1.4rem; text-transform: uppercase; letter-spacing: 1px;">${context.exerciseName}</h2>
                <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 1.1rem; font-weight: bold;">
                     <div style="color: var(--primary);">TARGET: ${target} REPS</div>
                     <div style="color: var(--secondary);" id="p-pb-disp">PB: --</div>
                </div>
            </div>
            
            <div id="power-rows" style="flex:1; overflow-y: auto; padding: 10px 0;">
                <!-- Dynamic Rows -->
            </div>

            <button class="btn btn-small btn-secondary" style="margin-bottom: 16px; width: 100%; padding: 12px; font-size: 1rem;" onclick="POWER.addRow()">+ ADD SET</button>

             <div class="notes-section" style="margin-top: 20px;">
                <textarea id="p-notes" placeholder="Notes..." style="width: 100%; background: #111; border: 1px solid #333; color: #ddd; padding: 12px; min-height: 80px; font-size: 1rem;"></textarea>
            </div>

            <div class="action-footer" style="padding-top: 20px;">
                <button class="btn btn-secondary w-half" onclick="POWER.cancel()" style="padding: 16px; font-size: 1.1rem;">BACK</button>
                <button class="btn w-half" onclick="POWER.finish()" style="padding: 16px; font-size: 1.1rem;">SAVE</button>
            </div>
        `;
        
        // Render Initial Rows
        for(let i=0; i<rowCount; i++) {
            renderRow(i, target);
        }

        // Fetch PB (v3.7.2 Update: Await, handle null)
        const pb = await SYNC.getPBForRepRange(context.exerciseName);
        if(pb) {
            document.getElementById('p-pb-disp').innerText = `PB: ${pb} lbs`;
        } else {
             document.getElementById('p-pb-disp').innerText = "PB: --";
        }
    }

    function renderRow(index, defaultReps) {
        const container = document.getElementById('power-rows');
        const div = document.createElement('div');
        div.className = 'log-row';
        div.style.marginBottom = "12px";
        
        // Use placeholder for Reps so it's a ghost value not a pre-filled value
        // Add inputmode="decimal" for mobile numeric keypad
        
        div.innerHTML = `
            <div style="font-size: 0.8rem; color: #888; margin-bottom: 4px;">SET ${index+1}</div>
            <div style="display: flex; gap: 8px;">
                <input type="number" class="inp-weight" placeholder="Lbs" inputmode="decimal" pattern="\\d*" style="flex:1; font-size: 1.4rem; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
                <input type="number" class="inp-reps" placeholder="${defaultReps || 'Reps'}" inputmode="decimal" pattern="\\d*" style="flex:1; font-size: 1.4rem; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
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
        const wave = ENGINE.getSessionInfo(SYNC.getSessionId()).wave;
        const target = ENGINE.getPrimerReps(wave);
        renderRow(rowCount, target);
        rowCount++;
    }

    function cancel() { if(context.onCancel) context.onCancel(); }

    function finish() {
        const rows = document.querySelectorAll('.log-row');
        let setDetails = []; // Array of {weight, reps, rpe}

        rows.forEach(r => {
            const w = parseFloat(r.querySelector('.inp-weight').value) || 0;
            const repsVal = r.querySelector('.inp-reps').value;
            // Placeholders over Values logic: Empty = 0
            const reps = parseFloat(repsVal) || 0;
            const rpe = parseFloat(r.querySelector('.inp-rpe').value) || 0;
            
            // Allow 0 weight (Bodyweight) but skip empty rows if both 0
            if(w > 0 || reps > 0) {
                 setDetails.push({ weight: w, reps: reps, rpe: rpe });
            }
        });

        const noteVal = document.getElementById('p-notes').value;

        if(context.onFinish) context.onFinish({
            sessionId: SYNC.getSessionId(),
            slot: context.slot,
            exercise: context.exerciseName,
            sets: setDetails, // v3.0 Flattened Data
            notes: noteVal
        });
    }

    return { init, cancel, finish, addRow };

})();
