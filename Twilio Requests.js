//Build request to Twilio Call service to place an outbound call
function sendCall(to, cache){

  if(!LIVE_MODE) to = PRODUCTION_SPAMPROOF_PHONE;

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
function fetchResource(sid,code){
  
  var resource = code=='sms'? 'Messages' : 'Calls'
  var url = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ID + '/' + resource + '/' + sid + '.json'
  
  var options = {}
  options.headers = {
    "Authorization" : "Basic " + Utilities.base64Encode(TWILIO_ID + ":" + TWILIO_TOKEN)
  }
  
  return JSON.parse(UrlFetchApp.fetch(url, options).getContentText())
}
