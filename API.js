function doPost(e) {
  
  try {
    
    return _doPost(e)
    
  } catch (err) {
    
    web_app_record(["Fatal Web App Error", err, err.stack, e])

    throw err.message+' '+err.stack
  }
  
}

function _doPost(e) {
  
 //Bc of the weirdness w/ GScript web apps, depending on source, sometimes
 //the e.parameter is a clear object, other time its a nested object where the 
 //real parameter is the key and there' no value. For this reason we parse 
 //content ourselves
  //web_app_record(["START - received post request", e.postData, e.parameter])
  //debugEmail('test _doPost', JSON.stringify(e.parameter))

  console.log(JSON.stringify(e))
  
  if (e.postData) {
    var request = e.postData.contents  
    request = parseJSON(request)
  } else {
    //If post body is sent as "Form Body" rather than "JSON"
    var request = e.parameter
  }
  
  //web_app_record(["Parsed post request", request, Utilities.base64Encode(request)])

  var title = request.title
  var event_body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
  var response = ContentService.createTextOutput('')
  var resp_json = {}

  //Check for various requirements
  if(!checkPassword(request['password'])){
    resp_json.error = 'Internal service error or incorrect password. Please try again.'  
  } else if(!checkStart(request.start)){
    resp_json.error = 'Start field is not parseable by Javascripts Date.parse(start). Please restructure or remove' 
  } else if(!title || !event_body || (event_body.trim() == '[]')){
    if(!title) resp_json.error = 'No title provided'
    if(!event_body) resp_json.error = 'No body provided'
    if(event_body.trim() == '[]') resp_json.error = 'Empty comm-array provided'  
  }
  
  //web_app_record([resp_json.error ? resp_json.error : 'passed all checks'])
  if(resp_json.error) return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)

  
  var start = request.start ? new Date(request.start) : new Date();
  var minutes = request.minutes ? parseInt(request.minutes) : 30
  var end = new Date()
  end.setTime(start.getTime() + 1000 * 60 * minutes)
  
  //web_app_record(['going to parse event body:', event_body])
  event_body = parseJSON(event_body)
      
  if(event_body[0].blobs && (event_body[0].blobs.length > 0)){
    
    var processed_event_body = turnBlobsToIDs(event_body)
    if(processed_event_body == null){
      debugEmail('V1 failed to return files for attachment', JSON.stringify(event_body, null, ""))
      web_app_record(['V1 failed to return files for attachment', JSON.stringify(event_body, null, "")])
      resp_json.error = 'Failure to retrieve files'
      return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)
    } else {
      event_body = processed_event_body
    }

  }
  
  if(event_body[0].bcc == 'ERROR_TEAM') event_body[0].bcc = V1_INTEGRATION_ALERT_EMAILS;
  
  if(event_body[0].email) event_body[0].bcc = (event_body[0].bcc ? (event_body[0].bcc + ',') : '' ) + DONOR_EMAIL_BCC
  
  var string_event_body = JSON.stringify(event_body,null," ") //to put in the event, but not what we want to process
  
  //web_app_record(['string form of event body for event',string_event_body])
  
  if(request.send_now) title = "LOCKED " + title
  //TODO: if given a calendar_id should ping tht calendar and confirm we have access, otherwise throw error
  var calendar_id = request.calendar_id ? request.calendar_id : (LIVE_MODE ? (request.send_now ? SHIPMENTS_APP_CAL_20220610 : PHARMACY_APP_CAL_20220301) : TEST_CAL_ID) //use provided, else use logic
  
  try {
    var cal = CalendarApp.getCalendarById(calendar_id)
    
    if ( ! cal) 
      web_app_record(['Do not have permission to access Calendar', calendar_id])
      
    var created_event = cal.createEvent(title, start, end, {'description':string_event_body}) //we need an event for succes tagging, and just so we can track everything 
  
  } catch (e) {
    var error = ['Create Event Failed', e, calendar_id, cal, created_event]
    web_app_record(error)
    return response.setContent(JSON.stringify(error)).setMimeType(ContentService.MimeType.JSON)
  }
  
  if(request.send_now){ //when we save the html that V1 sends into an event, it gets corrupted. Have to send it out while the body is still a fresh json of event_body
    //web_app_record(['comm-arr right before sending immediately', JSON.stringify(event_body, null, "")])
    processCommArr(event_body, created_event, false, CacheService.getScriptCache())
  }
  
  //web_app_record(['END - event added and json directly processed'])

  resp_json.success = 'event created'
  return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)
  
}

function parseJSON(json) {
  try {
    return JSON.parse(json)
  } catch (e) {
    Logger.log(['Could not JSON Parse', e, json, Utilities.base64Encode(json)])
    web_app_record(['Could not JSON Parse', e, json,  Utilities.base64Encode(json)])
  }
}

/*
//Bc of the weirdness w/ GScript web apps, depending on source, sometimes
//the parameter is a clear object, other time its a nested object where the 
//real parameter is the key and there' no value. To make it worse, Object.keys()
//only seems to truncate certain keys (if there is an =)?
function extractParameter(parameter){
  
  var keys = Object.keys(parameter)
  
  if (keys.length != 1) return parameter
  
  //return keys[0] //This wasn't working if JSON had an equal sign (eg html with attributes)
  
  //Hacky work around since keys were getting truncated
  json = JSON.stringify(parameter).slice(2, -2)
  
  web_app_record(["extractParameter", json.length, json, json.replace(/\\"/g, '"').replace(/\\\\/g, '\\'), json.replace(/\\\\/g, '\\').replace(/\\"/g, '"')])

  return parseJSON(json)
}
*/

function web_app_record(message_arr){
  
  try { //Can get a "Document too large" error
    //var sheet = SpreadsheetApp.openById('1Zr05qiZRESRAhN6A67gzZ4ebD8eHGEqFu6ShIamnoTY').getSheetByName('Web App Record')
   // sheet.appendRow([new Date().toJSON()].concat(message_arr)) 
   // SpreadsheetApp.flush() //Try to fix document too large errors
  } catch (e) {
    debugEmail('web_app_record failed: '+e.message, JSON.stringify(message_arr.concat(e.stack), null, ""))
  }
  console.log(message_arr.join("\n\n")) //keep this for tracking later on
}

//check that given pwd matches one we store
function checkPassword(given_pwd){
  
  var true_password = getPwd()
  if(!true_password){
    web_app_record(["no password saved in script property!"])
    return false
  }
  
  return given_pwd == true_password
  
}

//check that if they give start, it's parseable 
function checkStart(start){
  return !start || (start && !isNaN(Date.parse(start)))
}


//Post requests with files to attach from V1 (still needs to be expanded to more general functionality)
//But V1 will send the filename, and then we'll ping for the full blob
//and replace the blobs property with the ids of the files on google drive, so comm-cal can send as expected
function turnBlobsToIDs(event_body){
  
    web_app_record(['going to process following filenames', JSON.stringify(event_body[0].blobs)])
    var attachments = retrieveLabel(event_body[0].blobs)
    
    if(attachments.length == 0) return null

    web_app_record(['fileIDs to attach', attachments.join("\n")])
    event_body[0].attachments = attachments
    delete event_body[0].blobs
    web_app_record(['after attaching', JSON.stringify(event_body, null, "")])
    
    return event_body
    
}


//Given a list of v1 filenames, pings for them, gets blob and saves it as a pdf on Drive
function retrieveLabel(urls){
  var file_ids = []
  
  for(var i = 0; i < urls.length; i++){
    
    var url = urls[i]
    
    if ( ! ~ url.indexOf('//')) //Deprecate this
       url = V1_PULL_LABEL_ENDPOINT + url
      
    var res = UrlFetchApp.fetch(url, {muteHttpExceptions:true})
    web_app_record(['response of pull for label blob:', url, JSON.stringify(res)])

    if(~ res.getContentText().indexOf('Error')){
      
      web_app_record(['error on retrieve:', res])
      return [] //this will trigger error handling upstream to notify V1 and get an error email sent
      
    } else {
      
      web_app_record(['successful raw result of retrieve:', res])
      var decoded = Utilities.base64Decode(res);
      var currentFolder = DriveApp.getFolderById(V1_LABELS_FOLDER_ID);
      
      //TODO DONT ASSUME PDF TYPE.
      //URL MAY CONTAIN SENSITIVE INFO
      var name = 'Comm-Cal Attachment '+url.split('/').slice(-1)[0]
      var blob = Utilities.newBlob(decoded, MimeType.PDF, name);
      file_ids.push(currentFolder.createFile(blob).getId());
      
    }

  }
  
  return file_ids
}

//ABOVE IS ALL IMPORTED 4/27/20 by AS



function getPwd(){
  var val = PropertiesService.getScriptProperties().getProperty('api_pwd')
  
  if(val === null){
    debugEmail('No API PWD in Script Properties','Check now!') //would only happen with a google error?
  }
  
  return val
}


function formatDateFull(date){
  return Utilities.formatDate(date, "GMT-" + (date.getTimezoneOffset() / 60) + ":00", 'yyyy-MM-dd HH:mm:ss').replace(" ","T") + '-0' + (date.getTimezoneOffset() / 60) + ":00"
}



