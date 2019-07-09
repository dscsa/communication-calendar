//A simple API that creates calendar events
function doPost(e) {

  var request = JSON.parse(e.postData.contents)

  var password = request['password']
  
  var true_password = getPwd()

  var response = ContentService.createTextOutput('')
  var resp_json = {}
     
  
  if(!true_password){
    resp_json.error = 'Internal service error. Please try again later.'
    return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)
  }

  if(password !== true_password){
   resp_json.error = 'Password Failed'
   return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)
  }
  
  var title = request.title
  var event_body = request.body
  
  if(!title || !event_body){
    if(!title) resp_json.error = 'No title provided'
    if(!event_body) resp_json.error = 'No body provided'
    return response.setContent(JSON.stringify(resp_json)).setMimeType(ContentService.MimeType.JSON)
  }
  
  event_body = JSON.stringify(event_body)
  
  var start = new Date();
  
  if(request.start){
    var rx = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}/
    if(request.start.match(rx)){
      start = new Date(request.start)
    } else {
      start = new Date()
    }
  }
  
  var minutes = request.minutes ? parseInt(request.minutes) : 30
  
  var end = new Date()
  end.setTime(start.getTime() + 1000 * 60 * minutes)
  
  CalendarApp.getCalendarById(SECURE_CAL_ID).createEvent(title, start, end, {'description':event_body}) //TODO: swtich to SECURE_CAL_ID
  
  resp_json.success = 'event created'
  response.setContent(JSON.stringify(resp_json))

  return response.setMimeType(ContentService.MimeType.JSON);
}



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


