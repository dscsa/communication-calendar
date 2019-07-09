//Handles either sending the debug email or logging message if we're approaching our quota
//Key issue: not wasting our quota on debug emails
function debugEmail(subject,body){
  var quota = MailApp.getRemainingDailyQuota() //how many more emails can we afford to send

  if (quota < 200) { //if we're near our quota limit, don't send another email, just log
    return console.log({"issue":'approaching email quota, remaining: ' + quota, "subject":subject,"body":body})
  }

  MailApp.sendEmail(PRODUCTION_ERRORS_EMAIL, subject,body)
}



//This email has to be sent, doesn't matter if we're approaching quota
function emergencyEmail(subject,body){
  MailApp.sendEmail(PRODUCTION_ERRORS_EMAIL, subject,body)
  console.log({"issue":'TWILIO FAILING TO PARSE OUR TWIML: ', "subject":subject,"body":body})
}




//Given a patient's name, checks the cache for how many objects have been processed for them so far
//Set a limit in keys.gs of how many objects can be processed
function wouldSpam(event, cache, comm_arr, timestamp, is_fallback){
  
  if(~ event.getTitle().toString().toLowerCase().indexOf('password reset')) return false; //temporary shortcut before next milestone
  
  var patient_name = extractNameFromEvent(event.getTitle());
  
  if( (!LIVE_MODE) || ~ PRODUCTION_SPAMPROOF_NAMES.indexOf(patient_name)) return false; //for debugging and general testing, don't worry about spamming ourselves

  var event_id = event.getId();
  
  var prev_contacts = getContactHistory(patient_name,cache) || ''
  var num_events = prev_contacts.split('Event ID').length

  var would_be_spam = num_events > PER_PATIENT_EVENT_LIMIT //if we've hit their limit already

  if(is_fallback) return would_be_spam; //don't go on to add duplicates to the message history, or send spam alert again  

  var msg_history = prev_contacts + "<br><br>" + timestamp + ": " + patient_name + ": Event ID: " + event_id + "<br>Comm Arr:<br>" + JSON.stringify(comm_arr) 
    
  if(would_be_spam) sendSpamAlertEmail(msg_history,patient_name);
  if(num_events == (PER_PATIENT_EVENT_LIMIT - 1)) debugEmail('Processing last permissible event for patient','HOLD will be placed on ' + patient_name + 'if another event is processed soon.\nMsg history below\n' + msg_history.replace(/<br>/g,'\n'));
   
  updateContactHistory(patient_name, msg_history,cache)

  return would_be_spam
  
  
}



function  extractTypeOfOutboundEmail(body){
  if(~ body.indexOf('items has shipped')) return '#shipped#'
  if(~ body.indexOf('We are starting to prepare')) return '#preparing#'
  if(~ body.indexOf('Update for Order')) return '#update#'

  return '#basic_email#' //default?

}



function sendSpamAlertEmail(msg_history, name){
  var alertEmail = 'HOLD placed on this patient: ' + name + '<br><br>The last element of the history below was blocked. See complete message history to identify issue.'
  alertEmail += '<br>History of contact:<br>'
  alertEmail += msg_history
  MailApp.sendEmail(PRODUCTION_ERRORS_EMAIL, 'Stop Spam', '', {htmlBody: alertEmail})
}
