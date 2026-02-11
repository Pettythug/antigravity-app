/**
 * ANTIGRAVITY v2.1 - CORE ENGINE
 * Handles: Wave Logic, Primers, Odometer Math, Exercise Arrays
 */

const ENGINE = (function() {
    console.log("ENGINE Module Loaded (v3.7.3)");

    // --- 1. CONFIGURATION & CONSTANTS ---
    const CONSTANTS = {
        WAVE: {
            1: { Name: "Endurance",   Reps: "15-20",  Rest: 30,  Label: "30s" },
            2: { Name: "Power",       Reps: "1-3",    Rest: 180, Label: "3m+" },
            3: { Name: "Hypertrophy", Reps: "8-12",   Rest: 90,  Label: "90s" },
            4: { Name: "Strength",    Reps: "4-7",    Rest: 120, Label: "2m" }
        },
        PRIMER_REPS: { 1: 3, 2: 5, 3: 3, 4: 5 },
        EXERCISE_POOLS: {
            "1A": ["Power Clean", "Power Snatch", "Hang Clean", "Clean High Pull", "Snatch High Pull", "SA Clean (Lever)", "M. Snatch", "Clean Pull", "Snatch Pull", "DB Snatch", "Narrow Snatch", "Lever Snatch", "Lever High", "SA Clean (Bar)", "Clean & Press"],
            "1B": ["Squat Jump", "Hang Jump", "Box Jump", "Push Press", "Lever Squat Jump", "Med Ball Slam", "Broad Jump", "Vertical Jump", "KB Swing (Power)", "Med Ball Chest Pass", "Speed Squat (Band)", "Clapping Pushup", "Thruster (Explosive)", "Jump Rope", "Explosive Step Up"],
            "2": ["Back Squat", "Front Squat", "Wide-Stance Squat", "Split Squat", "Bulg. Split Squat", "Drop Lunge", "Step Up", "Lateral Step Up", "Side Squat", "Single Leg Squats", "Fwd/Rev Lunge", "Belt Squat (MD)", "Hack Squat (MD)", "Box Squat (MD)", "Lever Fwd Lunge", "Lever Rev Lunge", "Marching (MD)", "Hatfield Squat", "Walking Lunge", "Step-Up (Box)", "Cyclist Squat", "Poliquin Step-Up", "Goblet Squat", "Leg Extension", "Sissy Squat"],
            "3": ["Deadlift", "Romanian Deadlift", "Barbell Hip Thrust", "Good Morning", "Zercher Good Morning", "Single Leg Good Morning", "Reverse Hyperextension", "Back Extension", "Supine Hip Extension", "Split Good Morning", "Single-Leg RDL", "Swiss Ball Glute-Ham", "Trap Bar Deadlift", "Lever RDL", "Staggered RDL (MD)", "Lever Deadlift", "Belt Squat Good Morning", "Glute-Ham Raise (GHD)", "DB RDL", "Lying Leg Curl", "Weighted Hypers", "KB Swing", "KB Single-Leg RDL", "KB Clean"],
            "4": ["Bench Press", "Incline Bench Press", "DB Alt. Bench", "Close Grip Bench", "Reverse Grip Bench", "Dumbbell Bench", "DB Incline Bench", "One-Arm Bench", "One-Arm Incline Bench", "Flat / Incline Pushup", "Decline Pushups", "Dip / Weighted Dip", "HS Iso-Lat Chest", "HS Iso-Lat Incline", "Z-Press (Lever)", "Lever Chest Press", "Lever Incline Press", "Explosive Punch", "Weighted Pushup", "Incline DB Press", "Flat DB Press", "Parallette Pushup", "Decline Pushup (Box)", "KB Floor Press"],
            "5": ["Pendlay Row", "Bent-Over DB Row", "Bent-Over Row", "Standing Cable Row", "Face Pull", "2-Point DB Row Twist", "Modified T-Bar Row", "One-Arm Cable Row", "One-Arm Horiz. Pullup", "Iso-Lateral Row", "Iso-Lateral High Row", "Renegade Row (Lever)", "Rear Delt Fly (Lever)", "Meadows Row", "Supported Row (MD)", "DB Krome Row", "3-Point DB Row", "Chest Supported Row", "KB Gorilla Row", "KB Renegade Row"],
            "6": ["Shoulder Press", "Push Press", "Push Jerk", "Split Jerk", "DB Clean and Press", "DB Scaption", "DB One-Arm Press", "DB Alt Press", "Support DB 1-Arm Press", "Plate Raise + Truck", "DB Parallel Push Press", "HS Iso-Lat Shoulder", "Viking Press", "Z-Press (Lever)", "Thruster (Lever)", "Single-Arm Lever Press", "Seated DB Press", "Standing DB Press", "Arnold Press", "KB Overhead Press", "KB Bottoms-Up Press", "Handstand Pushup"],
            "7": ["Pullup", "Chinup", "Mixed Grip Pullup", "Lat Pulldown", "Single-Arm Pull Down", "Single-Arm Pullup", "Side-to-Side Pullup", "Horizontal Pullup", "Iso-Lat Front Lat Pull", "Neutral Grip Lat Pull", "Weighted Pullup", "Vest Pullup", "Neutral Grip Pullup", "Weighted Chinup"],
            "8": ["Cable Push-Pull Rot.", "Cable Rotating Ext.", "Cable Rot. Crunch", "Cable Wood Chop", "Kneeling Wood Chop", "Seated Russian Twist", "Swiss Ball Wgt Roll", "Windshield Wiper", "Kneeling Rev. Chop", "Cable Reverse Chop", "Barbell Torque", "Alt Crunch & Press", "Rotational Jammer", "Landmine Rotation", "Sledgehammer Swing", "GHD Sit-Up", "Russian Twist", "Turkish Get-Up", "Slam Ball Rotation", "Around World Halo"],
            "9": ["Barbell Rollout", "Around World Plank", "Cable Core Press", "Side Plank w/ Row", "Rotational Cable Row", "Core Row", "Plank (2, 3, 4 Point)", "Dynamic Plank", "Plank Walkup", "Side Bridge (& Reach)", "T-Push and Hold", "3 / 4 Pt Supine Bridge", "Plank Rotations", "Pallof Press", "Weighted Plank (MD)", "Overhead Static Hold", "GHD Sorensen Hold", "Weighted Plank (Vest)", "L-Sit Hold", "Hollow Body Hold", "Plank on Slam Ball"],
            "10": ["Dog Walk", "Rucking", "Jump Rope (Speed)", "Jump Rope (Double Unders)", "Heavy Bag (Freestyle)", "Heavy Bag (Power Rounds)", "Slam Ball Metcon", "KB Swings", "GHD Sit-Up (High Rep)", "Sled Drag"]
        },
        // Blueprint: [Slot, Type (for UI context)]
        // Push/Squat (A): 1A, 2, 4, 6, 8, 10
        // Pull/Hinge (B): 1B, 3, 5, 7, 9, 10
        WORKOUT_A_STRUCTURE: ["1A", "2", "4", "6", "8", "10"],
        WORKOUT_B_STRUCTURE: ["1B", "3", "5", "7", "9", "10"],
        
        // Modules Map: Which JS module handles which slot?
        MODULE_MAP: {
            "1A": "power", "1B": "power",
            "2": "grind", "3": "grind", "4": "grind", "5": "grind", "6": "grind", "7": "grind",
            "8": "stability", "9": "stability",
            "10": "engine_mod"
        }
    };

    // --- 2. PUBLIC METHODS ---

    function getSessionInfo(sessionId) {
        const id = parseInt(sessionId) || 1;
        const wave = ((id - 1) % 4) + 1;
        const waveInfo = CONSTANTS.WAVE[wave];
        const isOdd = id % 2 !== 0; // Odd = A, Even = B
        
        // Fix Labels to match A=Push/Squat, B=Pull/Hinge
        const type = isOdd ? "Workout A (Push/Squat)" : "Workout B (Pull/Hinge)";
        const plan = isOdd ? CONSTANTS.WORKOUT_A_STRUCTURE : CONSTANTS.WORKOUT_B_STRUCTURE;
        
        return {
            id,
            wave,
            waveInfo,
            type,
            plan, // Array of slots e.g. ["1B", "3"...]
            isA: isOdd
        };
    }

    function getExerciseName(slot, odometerIndex) {
        const pool = CONSTANTS.EXERCISE_POOLS[slot];
        if (!pool) return "Unknown Slot";
        const idx = odometerIndex || 0;
        return pool[idx % pool.length];
    }
    
    function getModuleForSlot(slot) {
        return CONSTANTS.MODULE_MAP[slot] || "grind";
    }

    function getPrimerReps(wave) {
        return CONSTANTS.PRIMER_REPS[wave];
    }

    return {
        getSessionInfo,
        getExerciseName,
        getModuleForSlot,
        getPrimerReps,
        CONSTANTS
    };

})();
