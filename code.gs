var SPREADSHEET_ID = '1pFR03-TmhizQfIW6T0bBKXg7faKQ9s1AklEXhyEGDW0';

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var configSheet = ss.getSheetByName('Config');
    
    // Create Config if missing
    if (!configSheet) {
      configSheet = ss.insertSheet('Config');
      configSheet.appendRow(['Key', 'Value']);
      configSheet.appendRow(['CurrentSessionID', '1']);
    }
    
    // Read Session ID
    var data = configSheet.getDataRange().getValues(); 
    var sessionID = 1;
    
    for(var i=1; i<data.length; i++) {
      if(data[i][0] === 'CurrentSessionID') {
        sessionID = data[i][1];
        break;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: {
        CurrentSessionID: sessionID
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var logsSheet = ss.getSheetByName('Logs');
    var configSheet = ss.getSheetByName('Config');
    
    // Create Sheets if missing
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.appendRow(['Timestamp', 'SessionID', 'Slot', 'Exercise', 'Weight', 'Reps', 'RPE', 'Notes', 'SyncedAt']);
    }
    if (!configSheet) {
      configSheet = ss.insertSheet('Config');
      configSheet.appendRow(['Key', 'Value']);
      configSheet.appendRow(['CurrentSessionID', '1']);
    }
    
    var postData = JSON.parse(e.postData.contents);
    var logs = postData.logs || [];
    var updateSessionId = postData.updateSessionId;
    
    // 1. Append Logs
    var timestamp = new Date();
    logs.forEach(function(log) {
      logsSheet.appendRow([
        log.timestamp,
        log.sessionId,
        log.slot,
        log.exercise,
        log.setNumber || 1, // v3.3 New Column
        log.weight || '',
        log.reps || '',
        log.rpe || '',
        log.notes || '',
        timestamp
      ]);
    });
    
    // ...

function setup() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  var logsSheet = ss.getSheetByName('Logs');
  if (!logsSheet) {
    logsSheet = ss.insertSheet('Logs');
    logsSheet.appendRow(['Timestamp', 'SessionID', 'Slot', 'Exercise', 'SetNumber', 'Weight', 'Reps', 'RPE', 'Notes', 'SyncedAt']);
    logsSheet.setFrozenRows(1);
  }
  
  var configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    configSheet = ss.insertSheet('Config');
    configSheet.appendRow(['Key', 'Value']);
    configSheet.appendRow(['CurrentSessionID', '1']);
    configSheet.setFrozenRows(1);
  }
}
