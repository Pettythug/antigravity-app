// Version: v3.7.3 Google Apps Script (Sync Fix)

function doGet(e) {
  var result = {};
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // v3.7.3: Case-Insensitive Tab Search
    var targetName = "Logs";
    var sheet = null;
    
    // Scan all sheets for "logs" (case-insensitive)
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getName().toLowerCase() === targetName.toLowerCase()) {
        sheet = allSheets[i];
        break;
      }
    }
    
    // Fallback: Create if not found? No, better error for now.
    if (!sheet) {
       result.status = "error";
       result.message = "Sheet 'Logs' (case-insensitive) not found.";
       return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    var logs = [];
    
    if (data.length > 1) { // Assuming row 1 is headers
      // Map Headers to Indices (Case-Insensitive)
      var headers = data[0].map(function(h) { return h.toString().toLowerCase().trim(); });
      
      var colMap = {
        id: headers.indexOf("id"),
        timestamp: headers.indexOf("timestamp"), // or "date"
        sessionId: headers.indexOf("sessionid"), // or "session"
        slot: headers.indexOf("slot"),
        exercise: headers.indexOf("exercise"),
        setNumber: headers.indexOf("setnumber"), // or "set"
        weight: headers.indexOf("weight"),
        reps: headers.indexOf("reps"),
        rpe: headers.indexOf("rpe"),
        notes: headers.indexOf("notes"),
        synced: headers.indexOf("synced") // Should be ignored on download? Or useful?
      };
      
      // Fallback aliases if "timestamp" not found, look for "date"
      if (colMap.timestamp === -1) colMap.timestamp = headers.indexOf("date");
      if (colMap.sessionId === -1) colMap.sessionId = headers.indexOf("session");
      if (colMap.setNumber === -1) colMap.setNumber = headers.indexOf("set");
      
      // Iterate Rows (Starting from 1)
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        // Only include if ID exists or generate one? Better if ID exists.
        // If ID column missing, we can't reliably sync back.
        
        var log = {};
        // Use column map if found, else try direct index (Risk: User reordered columns)
        // Let's assume standard order if map fails for critical fields? 
        // Or just map what we find.
        
        if (colMap.id !== -1) log.id = row[colMap.id];
        if (colMap.timestamp !== -1) log.timestamp = row[colMap.timestamp];
        if (colMap.sessionId !== -1) log.sessionId = row[colMap.sessionId];
        if (colMap.slot !== -1) log.slot = row[colMap.slot];
        if (colMap.exercise !== -1) log.exercise = row[colMap.exercise];
        if (colMap.setNumber !== -1) log.setNumber = row[colMap.setNumber];
        if (colMap.weight !== -1) log.weight = row[colMap.weight];
        if (colMap.reps !== -1) log.reps = row[colMap.reps];
        if (colMap.rpe !== -1) log.rpe = row[colMap.rpe];
        if (colMap.notes !== -1) log.notes = row[colMap.notes];
        
        // Ensure critical fields exist
        if (log.exercise) {
           logs.push(log);
        }
      }
    }
    
    // Get Max Session ID for "CurrentSessionID"
    var maxSession = 0;
    logs.forEach(function(l) {
      if (l.sessionId && !isNaN(parseInt(l.sessionId))) {
        maxSession = Math.max(maxSession, parseInt(l.sessionId));
      }
    });

    result.status = "success";
    result.data = {
      logs: logs,
      CurrentSessionID: maxSession
    };

  } catch (error) {
    result.status = "error";
    result.message = error.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result = {};
  
  // Basic Ping
  if (!e || !e.postData) {
     result.status = "error";
     result.message = "No payload";
     return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var payload = JSON.parse(e.postData.contents);
    var newLogs = payload.logs; // Array of objects matching sync.js
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var targetName = "Logs";
    var sheet = null;
     var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getName().toLowerCase() === targetName.toLowerCase()) {
        sheet = allSheets[i];
        break;
      }
    }
    
    if (!sheet) {
      // Auto-create if missing? 
      sheet = ss.insertSheet(targetName);
      // Add Headers
      sheet.appendRow(["ID", "Date", "Session", "Slot", "Exercise", "Set", "Weight", "Reps", "RPE", "Notes"]);
    }
    
    // Append Rows
    // Map JSON to Columns (Order matters if using appendRow)
    // Assume Headers: ID, Date, Session, Slot, Exercise, Set, Weight, Reps, RPE, Notes
    
    if (newLogs && newLogs.length > 0) {
      var rowsToAdd = newLogs.map(function(l) {
         return [
           l.id,
           l.timestamp,
           l.sessionId,
           l.slot,
           l.exercise,
           l.setNumber,
           l.weight,
           l.reps,
           l.rpe,
           l.notes
         ];
      });
      
      // Batch append
      var lastRow = sheet.getLastRow();
      var range = sheet.getRange(lastRow + 1, 1, rowsToAdd.length, 10);
      range.setValues(rowsToAdd);
    }
    
    result.status = "success";
    result.message = "Synced " + (newLogs ? newLogs.length : 0) + " logs.";
    
  } catch (error) {
    result.status = "error";
    result.message = error.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
