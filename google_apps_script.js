function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  // Wait up to 10 seconds for other processes to finish
  if (!lock.tryLock(10000)) return ContentService.createTextOutput("Error: Server Busy").setMimeType(ContentService.MimeType.TEXT);

  try {
    const json = JSON.parse(e.postData.contents);
    const logSheet = ss.getSheetByName("Logs");
    const configSheet = ss.getSheetByName("Config");

    // 1. APPEND LOGS (Strict 9-Column Mapping)
    if (json.logs && json.logs.length > 0) {
      const rows = json.logs.map(l => [
        l.timestamp,      // Col 1
        l.sessionId,      // Col 2
        l.slot,           // Col 3
        l.exercise,       // Col 4
        l.weight,         // Col 5
        l.reps,           // Col 6
        l.rpe,            // Col 7
        l.notes,          // Col 8
        new Date()        // Col 9 (SyncedAt)
      ]);
      // Append to the end of the 'Logs' sheet
      logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
    }

    // 2. UPDATE SESSION ID (Targeted Key Search)
    if (json.updateSessionId) {
      const data = configSheet.getDataRange().getValues();
      let found = false;
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === "CurrentSessionID") {
          configSheet.getRange(i + 1, 2).setValue(json.updateSessionId);
          found = true;
          break;
        }
      }
      // Fallback: If the key isn't found, add it to the bottom
      if (!found) {
        configSheet.appendRow(["CurrentSessionID", json.updateSessionId]);
      }
    }

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName("Config");
  const logSheet = ss.getSheetByName("Logs");

  // Get Session ID
  const configData = configSheet.getDataRange().getValues();
  let sessionId = 1;
  for (let i = 0; i < configData.length; i++) {
    if (configData[i][0] === "CurrentSessionID") {
      sessionId = configData[i][1];
      break;
    }
  }

  // Get lightweight logs for PB calculation
  const logData = logSheet.getDataRange().getValues();
  const logs = logData.slice(1).map(r => ({
    exercise: r[3],
    weight: r[4],
    reps: r[5]
  }));

  const res = {
    status: 'success',
    data: {
      CurrentSessionID: sessionId,
      logs: logs
    }
  };
  
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
