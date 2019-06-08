//Build request to Twilio Call service to place an outbound call
function sendCall(to, cache){

  if(!LIVE_MODE) to = PRODUCTION_SPAMPROOF_PHONE;

  var messages_url = "https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_ID + "/Calls.json";

  var payload = {
    "To": to,
    "Url": getWebAppUrl(),
    "From" : TWILIO_CALL_NUM,
    "StatusCallback" : getWebAppUrl(),
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
    "StatusCallback" : getWebAppUrl(),
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
