/**
 * MODULE: GRIND
 * Usage: Standard Strength Exercises (Squat, Bench, etc.)
 * Features: 3 Default Rows, "+" Button, RPE tracking
 */

const GRIND = window.GRIND = (function() {

    let context = {};
    let rowCount = 3;

    async function init(container, ctx) {
        context = ctx;
        rowCount = 3; 

        // Get Rep Range from wave
        const reps = context.waveInfo.Reps || "8";
        const cleanTarget = reps.split('-')[0];

        container.innerHTML = `
            <div class="module-header" style="border-bottom: none;">
                <h2 style="font-size: 1.4rem; text-transform: uppercase;">${context.exerciseName}</h2>
                <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 1.1rem; font-weight: bold;">
                     <div style="color: var(--primary);">TARGET: ${reps}</div>
                     <div style="color: var(--secondary);" id="g-pb-disp">PB: --</div>
                </div>
            </div>

            <div id="grind-rows" style="flex: 1; overflow-y: auto; padding: 10px 0;">
                <!-- Rows injected here -->
            </div>

            <button class="btn btn-small btn-secondary" style="margin-bottom: 16px; width: 100%; padding: 12px; font-size: 1rem;" onclick="GRIND.addRow()">+ ADD SET</button>
            
            <div class="notes-section">
                <textarea id="log-notes" placeholder="Notes..." style="width: 100%; background: #111; border: 1px solid #333; color: #ddd; padding: 12px; min-height: 80px; font-size: 1rem;"></textarea>
            </div>

            <div class="action-footer" style="padding-top: 20px;">
                <button class="btn btn-secondary w-half" onclick="GRIND.cancel()" style="padding: 16px; font-size: 1.1rem;">BACK</button>
                <button class="btn w-half" onclick="GRIND.finish()" style="padding: 16px; font-size: 1.1rem;">SAVE</button>
            </div>
        `;

        // Render initial rows
        for(let i=0; i<rowCount; i++) {
            renderRow(i);
        }

        // Fetch PB
        const pb = await SYNC.getPBForRepRange(context.exerciseName, cleanTarget);
        if(pb) {
            document.getElementById('g-pb-disp').innerText = `PB (${cleanTarget}): ${pb} lbs`;
        }
    }

    function renderRow(index) {
        const container = document.getElementById('grind-rows');
        const div = document.createElement('div');
        div.className = 'log-row';
        div.style.marginBottom = "12px";
        div.innerHTML = `
            <div style="font-size: 0.8rem; color: #888; margin-bottom: 4px;">SET ${index+1}</div>
            <div style="display: flex; gap: 8px;">
                <input type="number" class="inp-weight" placeholder="Lbs" inputmode="decimal" pattern="\\d*" style="flex:1; font-size: 1.4rem; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
                <input type="number" class="inp-reps" placeholder="Reps" inputmode="decimal" pattern="\\d*" style="flex:1; font-size: 1.4rem; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
                <select class="inp-rpe" style="width: 70px; font-size: 1.2rem; background: #222; border: 1px solid #444; color: white; border-radius: 6px;">
                    <option value="" disabled selected>RPE</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                </select>
            </div>
        `;
        container.appendChild(div);
    }

    function addRow() {
        renderRow(rowCount);
        rowCount++;
    }

    function cancel() {
        if(context.onCancel) context.onCancel();
    }

    function finish() {
        // Harvest Data
        const rows = document.querySelectorAll('.log-row');
        let setDetails = []; // Array of sets

        rows.forEach(r => {
            const w = parseFloat(r.querySelector('.inp-weight').value) || 0;
            const reps = parseFloat(r.querySelector('.inp-reps').value) || 0;
            const rpe = parseFloat(r.querySelector('.inp-rpe').value) || 0;
            
            // Allow 0 weight (Bodyweight) if reps are entered, or 0 reps if weight is entered (partial?)
            // Frictionless: Just take what is there.
            if(w > 0 || reps > 0) {
                 setDetails.push({ weight: w, reps: reps, rpe: rpe });
            }
        });

        const noteVal = document.getElementById('log-notes').value;

        const logData = {
            sessionId: SYNC.getSessionId(),
            slot: context.slot,
            exercise: context.exerciseName,
            sets: setDetails, // v3.0 Flattened Data
            notes: noteVal
        };

        if(context.onFinish) context.onFinish(logData);
    }

    return {
        init,
        addRow,
        cancel,
        finish
    };

})();
