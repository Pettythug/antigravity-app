/**
 * MODULE: ENGINE
 * Usage: Conditioning / Loaded Carries
 * Features: Simple Completion Check
 */

const ENGINE_MOD = window.ENGINE_MOD = (function() {
    console.log("ENGINE_MOD Module Loaded (v3.7.2-PB-FIX)");
    
    let context = {};

    function init(container, ctx) {
        context = ctx;
        container.innerHTML = `
            <div class="module-header">
                <h2>${context.exerciseName}</h2>
                <div class="meta">Conditioning</div>
            </div>

            <div class="card bg-dark" style="text-align: center; padding: 32px;">
                 <p>Complete the prescribed distance or rounds.</p>
                 <label style="display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1.2rem;">
                    <input type="checkbox" id="e-check" style="width: 24px; height: 24px;">
                    Completed
                 </label>
            </div>

            <div class="notes-section">
                <textarea id="e-notes" placeholder="Distance / Time / Thoughts..."></textarea>
            </div>

            <div class="action-footer">
                <button class="btn btn-secondary w-half" onclick="ENGINE_MOD.cancel()">Back</button>
                <button class="btn w-half" onclick="ENGINE_MOD.finish()">Finish & Save</button>
            </div>
        `;
    }

    function cancel() { if(context.onCancel) context.onCancel(); }

    function finish() {
        const checked = document.getElementById('e-check').checked;
        const notes = document.getElementById('e-notes').value;

        if(!checked && !notes && !confirm("Nothing checked. Mark done?")) return;

        if(context.onFinish) context.onFinish({
            sessionId: SYNC.getSessionId(),
            slot: context.slot,
            exercise: context.exerciseName,
            weight: 0,
            reps: 1, // 1 = Done
            rpe: 0,
            notes: notes
        });
    }

    return { init, cancel, finish };

})();

// Export as global "ENGINE" conflicts with Engine core, so we map it in UI_HUB manually or rename
// Let's rely on UI_HUB mapping "engine" -> "ENGINE_MOD" or changing the file to define window.ENGINE_MODULE
window.ENGINE_MOD = ENGINE_MOD; 
