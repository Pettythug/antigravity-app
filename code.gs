function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById("1pFR03-TmhizQfIW6T0bBKXg7faKQ9s1AklEXhyEGDW0");
    const sheet = ss.getSheetByName("Logs");
    const configSheet = ss.getSheetByName("Config");
    
    let currentSessionId = 1;
    if (configSheet) {
      const lastRow = configSheet.getLastRow();
      if (lastRow > 1) {
        currentSessionId = configSheet.getRange(lastRow, 1).getValue();
      }
    }

    // Hydration: Fetch last 100 logs
    let logs = [];
    if (sheet) {
      const lastRow = sheet.getLastRow();
      
      if (lastRow > 1) {
        // v3.8 Fix: Ensure we don't go out of bounds if < 100 rows
        const numRows = Math.min(lastRow - 1, 150); 
        const startRow = lastRow - numRows + 1;
        
        // v3.8 Fix: Get Display Values to safely handle Dates? 
        // No, getValues() is better for raw types, but we must handle Date objects in JSON.
        const data = sheet.getRange(startRow, 1, numRows, 8).getValues();
        
        // Map to Object
        logs = data.map((row, i) => {
          // Normalize Timestamp
          let ts = row[0];
          if (ts instanceof Date) {
            ts = ts.toISOString();
          }

          return {
            id: "cloud_" + (startRow + i), 
            timestamp: ts,
            sessionId: row[1],
            slot: row[2],
            exercise: row[3],
            weight: row[4],
            reps: row[5],
            rpe: row[6],
            notes: row[7],
            synced: 1
          };
        });
      }
    }

    const result = {
      status: "success",
      data: {
        CurrentSessionID: currentSessionId,
        logs: logs
      }
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // v3.8 Debugging: Return error in JSON so client sees it
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById("1pFR03-TmhizQfIW6T0bBKXg7faKQ9s1AklEXhyEGDW0");
    const sheet = ss.getSheetByName("Logs");
    const configSheet = ss.getSheetByName("Config");
    
    const data = JSON.parse(e.postData.contents);
    const logs = data.logs;
    const updateSessionId = data.updateSessionId;

    // Append Logs
    if (logs && logs.length > 0) {
      const rows = logs.map(l => [
        l.timestamp,
        l.sessionId,
        l.slot,
        l.exercise,
        l.weight,
        l.reps,
        l.rpe,
        l.notes
      ]);
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // Update Session ID
    if (updateSessionId) {
      configSheet.getRange(configSheet.getLastRow() + 1, 1).setValue(updateSessionId);
    }

    return ContentService.createTextOutput("Success");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheet = ss.getSheetByName("Logs");
  if (!sheet) {
    sheet = ss.insertSheet("Logs");
    sheet.appendRow(["Timestamp", "SessionID", "Slot", "Exercise", "Weight", "Reps", "RPE", "Notes"]);
  }
  
  let config = ss.getSheetByName("Config");
  if (!config) {
    config = ss.insertSheet("Config");
    config.appendRow(["CurrentSessionID"]);
    config.appendRow([1]);
  }
}
