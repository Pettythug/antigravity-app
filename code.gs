function doGet(e) {
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
    // Assuming headers are row 1. Data starts row 2.
    // Columns: Timestamp(1), SessionID(2), Slot(3), Exercise(4), Weight(5), Reps(6), RPE(7), Notes(8)
    
    if (lastRow > 1) {
      const numRows = Math.min(lastRow - 1, 100);
      const startRow = lastRow - numRows + 1;
      const data = sheet.getRange(startRow, 1, numRows, 8).getValues();
      
      // Map to Object
      logs = data.map((row, i) => ({
        id: "cloud_" + (startRow + i), // Synthetic ID for local ref
        timestamp: row[0],
        sessionId: row[1],
        slot: row[2],
        exercise: row[3],
        weight: row[4],
        reps: row[5],
        rpe: row[6],
        notes: row[7],
        synced: 1 // Coming from cloud, so it is synced
      }));
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
