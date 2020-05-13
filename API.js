function doPost(e) {
  
  var request = e.parameter
  
  if(Object.keys(request).length == 1) request = extractParameters (request)
  
  web_app_record(["START - received post request", e.parameter, request])

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
  
  web_app_record([resp_json.error ? resp_json.error : 'passed all checks'])
  if(resp_json.error) return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)

  
  var start = request.start ? new Date(request.start) : new Date();
  var minutes = request.minutes ? parseInt(request.minutes) : 30
  var end = new Date()
  end.setTime(start.getTime() + 1000 * 60 * minutes)
  
  web_app_record(['going to parse event body:', event_body])
  event_body = JSON.parse(event_body)
      
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
  
  event_body[0].bcc = (event_body[0].bcc ? (event_body[0].bcc + ',') : '' ) + DONOR_EMAIL_BCC
  
  var string_event_body = JSON.stringify(event_body,null," ") //to put in the event, but not what we want to process
  
  web_app_record(['string form of event body for event',string_event_body])
  
  if(request.send_now) title = "LOCKED " + title
  
  var created_event = CalendarApp.getCalendarById(LIVE_MODE ? (request.send_now ? INSECURE_CAL_ID : SECURE_CAL_ID) : TEST_CAL_ID).createEvent(title, start, end, {'description':string_event_body}) //we need an event for succes tagging, and just so we can track everything 
  
  if(request.send_now){ //when we save the html that V1 sends into an event, it gets corrupted. Have to send it out while the body is still a fresh json of event_body
    web_app_record(['comm-arr right before sending immediately', JSON.stringify(event_body, null, "")])
    processCommArr(event_body, created_event, false, CacheService.getScriptCache())
  }
  
  web_app_record(['END - event added and json directly processed'])

  resp_json.success = 'event created'
  return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)
  
}


//Bc of the weirdness w/ GScript web apps, depending on source, sometimes
//the parameter is a clear object, other time its a nested object where the 
//real parameter is the key and there' no value
function extractParameters(parameter){
  var str = Object.keys(parameter)[0]
  return JSON.parse(str)
}

function web_app_record(message_arr){
  SpreadsheetApp.openById('1PuzOyeMugiAJ8BU6_8tNpNTW0Ty9XvijeoG0b7MYMNc').getSheetByName('Information').appendRow(message_arr) //TODO: comment this out when everything is working, posts to Test sheet
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
function retrieveLabel(v1_filenames){
  var file_ids = []
  
  for(var i = 0; i < v1_filenames.length; i++){
    
    var label_name = v1_filenames[i]
    var url = V1_PULL_LABEL_ENDPOINT + label_name
    var res = UrlFetchApp.fetch(url, {muteHttpExceptions:true})
    web_app_record(['response of pull for label blob:', JSON.stringify(res)])

    if(~ res.getContentText().indexOf('Error')){
      
      web_app_record(['error on retrieve:', res])
      return [] //this will trigger error handling upstream to notify V1 and get an error email sent
      
    } else {
      
      web_app_record(['successful raw result of retrieve:', res])
      var decoded = Utilities.base64Decode(res);
      var currentFolder = DriveApp.getFolderById(V1_LABELS_FOLDER_ID);
      var blob = Utilities.newBlob(decoded, MimeType.PDF, label_name);
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


