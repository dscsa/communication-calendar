//-------------------------------------------------------------------------------------------------------------------

//Seemed that sometimes the URL returned from .getUrl didn't quite work with that tag.
//Most likely seems related to general frailty of webApp. For now, works, but worth monitoring
function getWebAppUrl(){
  return ScriptApp.getService().getUrl().replace("/a/sirum.org","")
}



//Called by Twilio to fetch TwiML
//And, if there are errors, it calls here again for a custom error message
function doGet(e) { 
    
  var request = e.parameter
  var phone_num = ''
  var twiML = ''
  
  try{
      phone_num = request.To.slice(2)
  } catch(e){
      debugEmail('Got a GET request without a parseable telephone number', JSON.stringify(e))
  }
  
  
  if(request.ErrorCode){ //this means the GET request is because of a failed execution of a call
    
    twiML = getCustomErrorMessage() //return an error we can use

    handleTwilioError(phone_num,request.ErrorCode)
  
  } else { //then just a regular request for twiML
    
    
    var cache = CacheService.getScriptCache()
    twiML = pullFromCache(STORED_TWIML,phone_num, cache)
   
  }
  
  var resp = ContentService.createTextOutput(twiML)
  resp.setMimeType(ContentService.MimeType.XML)

  return resp
}



//If there's an error in the Call functionality,
//we send this error message to the first number that gets it
//After the first, the rest should hopefully be put on hold until someone fixes issue and turns it back on
function getCustomErrorMessage(){
  return  '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hi, this is good pill pharmacy and we have a new message for you. please give us a call at 8 8 8 9 8 7 5 1 8 7 at your convenience </Say></Response>'
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
    
    if(~ PRODUCTION_SPAMPROOF_PHONE.indexOf(phone_num.trim())) return; //TODO: delete this in the long term, should just freeze anytime, especially if it hits an error internally
    
    putHoldOnCalls()
  }
}


function putHoldOnCalls(){
  CacheService.getScriptCache().put('CALL-HOLD', true, 21600)
}

function testHold(){
  Logger.log(CacheService.getScriptCache().get('CALL-HOLD'))
}

//Check if there is currently a hold on calls
function holdCall(phone_num,cache){
  
  if(~PRODUCTION_SPAMPROOF_PHONE.indexOf(phone_num.trim())) return false; //don't care about hold when sending info internally
  
  return cache.get('CALL-HOLD') ? true : false;
}


//This function is only called manually by someone after they've fixed whatever issue was causing the hold in the first place
function liftCallHold(){
  CacheService.getScriptCache().remove('CALL-HOLD')
}





//--------------------------------------------------------------------------------------------------------------------------------------------------



//Called when sending status update from Twilio
function doPost(e){

  var cache = CacheService.getScriptCache()

  var request = e.parameter
  var phone_num = request.To.slice(2) 

  var status = request.MessageStatus ? request.MessageStatus : request.CallStatus
  var tag_code = request.MessageStatus ? "TEXTED" : "CALLED"
  
  if((status == 'delivered') || (status == 'completed')){
    
    markCalendar(phone_num,tag_code,cache)
    clearCache(phone_num, cache)
  
  } else if(status == 'failed'){

    var lock = LockService.getScriptLock()

    try{
       lock.waitLock(7000) //if we don't have the lock
    } catch(e) {
      debugEmail('Script Lock Race Case in doPost','')
    }

    var fallbacks = shouldUseFallbacks(phone_num, cache) //this is really all that needs to be locked down
    
    lock.releaseLock()

    var cal_id  = pullFromCache(STORED_CAL_ID,phone_num, cache)
    var event_id = pullFromCache(STORED_EVENT_ID,phone_num, cache)  

    if(fallbacks != null) processCommArr(fallbacks, event_id,cal_id);
    
  }


  return ContentService.createTextOutput("Success!") //Response to Twilio is currently irrelavant

}
