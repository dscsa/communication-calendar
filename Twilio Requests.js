//Build request to Twilio Call service to place an outbound call
function sendCall(to, message, cache){

  if(!LIVE_MODE) to = PRODUCTION_SPAMPROOF_PHONE;

  updateCache(STORED_TWIML,to,message,cache) //need to cache the callText so the webApp can serve it up in their GET request
  
  var messages_url = "https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_ID + "/Calls.json";

  var payload = {
    "To": to,
    "Url": getWebAppUrl(),
    "From" : TWILIO_CALL_NUM,
    "FallbackUrl":getWebAppUrl(),
    "FallbackMethod": "GET",
    "Method": "GET"
  };

  var options = {
    "method" : "post",
    "payload" : payload,
    "muteHttpExceptions" : true
  };

  options.headers = {
    "Authorization" : "Basic " + Utilities.base64Encode(TWILIO_ID + ":" + TWILIO_TOKEN)
  };

  return UrlFetchApp.fetch(messages_url, options)

}



//Build request for Twilio API with text message recipient & content
function sendSms(to, body) {
  if(!LIVE_MODE) to = PRODUCTION_SPAMPROOF_PHONE;

  var messages_url = "https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_ID + "/Messages.json";

  var payload = {
    "To": to,
    "Body" : body,
    "From" : TWILIO_SMS_NUM,
  };

  var options = {
    "method" : "post",
    "payload" : payload,
    "muteHttpExceptions" : true

  };

  options.headers = {
    "Authorization" : "Basic " + Utilities.base64Encode(TWILIO_ID + ":" + TWILIO_TOKEN)
  };

  return UrlFetchApp.fetch(messages_url, options)
}



//Given an sid, will ping Twilio for a status update on the resource
//code can be 'sms' or 'call', so we know which resource to look at 
function fetchResource(sid,code){
  
  var resource = code=='sms'? 'Messages' : 'Calls'
  
  var url = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ID + '/' + resource + '/' + sid + '.json'
  
  var options = {
    "muteHttpExceptions" : true
  };

  options.headers = {
    "Authorization" : "Basic " + Utilities.base64Encode(TWILIO_ID + ":" + TWILIO_TOKEN)
  }
  
  return UrlFetchApp.fetch(url, options)
}

