function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return ContentService.createTextOutput("Locked").setMimeType(ContentService.MimeType.TEXT);

  try {
    const json = JSON.parse(e.postData.contents);
    
    // 1. UPDATE SESSION ID IN 'Config'
    if (json.updateSessionId) {
      const configSheet = ss.getSheetByName("Config");
      const data = configSheet.getDataRange().getValues();
      for (var i = 0; i < data.length; i++) {
        if (data[i][0] == "CurrentSessionID") {
          configSheet.getRange(i + 1, 2).setValue(json.updateSessionId);
          break;
        }
      }
    }

    // 2. APPEND LOGS TO 'Logs' (Exactly 9 Columns)
    if (json.logs && json.logs.length > 0) {
      const logSheet = ss.getSheetByName("Logs");
      const rows = json.logs.map(l => [
        l.timestamp, l.sessionId, l.slot, l.exercise, 
        l.weight, l.reps, l.rpe, l.notes, new Date()
      ]);
      logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
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
  const data = configSheet.getDataRange().getValues();
  let sessionId = 1;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == "CurrentSessionID") { sessionId = data[i][1]; break; }
  }
  
  const logSheet = ss.getSheetByName("Logs");
  const logData = logSheet.getDataRange().getValues();
  const logs = logData.slice(1).map(r => ({ exercise: r[3], weight: r[4] }));

  const res = { status: 'success', data: { CurrentSessionID: sessionId, logs: logs } };
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
