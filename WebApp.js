//Seemed that sometimes the URL returned from .getUrl didn't quite work with that tag.
//Most likely seems related to general frailty of webApp. For now, works, but worth monitoring
function getWebAppUrl(){
  return WEB_APP_URL //ScriptApp.getService().getUrl().replace("/a/sirum.org","").replace("exec", "dev")
}



//Called by Twilio to fetch TwiML or report errors in handling TwiML / making calls
//Don't put in emails or the link will require authorization
function doGet(e) {

  var request = e.parameter
  var phone_num = ''
  var twiML = ''

  try{
      phone_num = request.To.slice(2)
  } catch(err){
      debugEmail('Got a GET request without a parseable telephone number', JSON.stringify([e,err]))
  }

  
  if(request.ErrorCode){ //this means the GET request is because of a failed execution of a call

    twiML = getCustomErrorMessage() //return an error we can use

    handleTwilioError(phone_num,request.ErrorCode)

  } else { //then just a regular request for twiML

    var cache = CacheService.getScriptCache()
    twiML = pullFromCache(STORED_TWIML,phone_num, cache)

  }

  if ( ! twiML) {
    debugEmail('doGet received butt had no twiML '+phone_num, twiML)
    twiML = getCustomErrorMessage()
  }

  var resp = ContentService.createTextOutput(twiML)
  resp.setMimeType(ContentService.MimeType.XML)

  return resp
}



//If there's an error in the Call functionality,
//we send this error message to the first number that gets it
//After the first, the rest should hopefully be put on hold until someone fixes issue and turns it back on
function getCustomErrorMessage(){
  return  '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hi, this is good pill pharmacy and we have a new message for you. please give us a call at 8,,,8,,,8,,,,9,,,8,,,7,,,,5,,,1,,,8,,,7 at your convenience </Say></Response>'
}



//If we get an error from processing TwiML, need to stop making calls in case it's something that
//will just keep repeating
function handleTwilioError(phone_num,error_code){
  
  if(error_code.toString() == '12100'){
    var emergency_notif = (~ PRODUCTION_SPAMPROOF_PHONE.indexOf(phone_num.trim())) ? 'Action Required - Twilio parsing error on internal number' : 'URGENT ACTION REQUIRED - All calls paused - Twilio Unable to Parse our TwiML'

    emergencyEmail(emergency_notif,'') //need to send an immediate email
    var toContact = PRODUCTION_SPAMPROOF_PHONE.split(",")
    for(var i = 0; i < toContact.length; i++){
      sendSms(toContact[i], emergency_notif)    // send an sms to one of us about this
    }

    if(~ PRODUCTION_SPAMPROOF_PHONE.indexOf(phone_num.trim())) return; 

    putHoldOnCalls()
  }
  
}


//Places a 'hold' on calls for up to six hours. Hold must be lifted manually
function putHoldOnCalls(){
  CacheService.getScriptCache().put('CALL-HOLD', true, 21600)
}


//This function is only called manually by someone after they've fixed whatever issue was causing the hold in the first place
function liftCallHold(){
  CacheService.getScriptCache().remove('CALL-HOLD')
}


//Used only manually for debugging
function testHold(){
  Logger.log(CacheService.getScriptCache().get('CALL-HOLD'))
}


//Called programatically to check if there is currently a hold on calls
function holdCall(phone_num,cache){

  if(~PRODUCTION_SPAMPROOF_PHONE.indexOf(phone_num.trim())) return false; //don't care about hold when sending info internally

  return cache.get('CALL-HOLD') ? true : false;
}

