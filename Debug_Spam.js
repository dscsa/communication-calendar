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



function wouldSpam(contact_type, addr, body, cache, timestamp, spam_limit){
  
  if( (!LIVE_MODE) || ~ PRODUCTION_SPAMPROOF_PHONE.indexOf(addr.trim()) || ~ PRODUCTION_SPAMPROOF_EMAIL.indexOf(addr.trim())) return false; //for debugging and general testing, don't worry about spamming ourselves

  var res = false
  var prev_contacts = getContactHistory(addr, cache)  || ''
  
  var num_events = prev_contacts.split(contact_type).length - 1
  res = num_events > spam_limit
    
  var msg_history = prev_contacts + "<br><br>" + timestamp + " : " + contact_type + " : " + addr + "<br>" + body

  updateContactHistory(addr, msg_history,cache)

  if(res) sendSpamAlertEmail(msg_history, addr);
  if(num_events == (spam_limit - 1)) debugEmail('Processing last permissible event for patient','HOLD will be placed on ' + addr + 'if another event is processed soon.\nMsg history below\n' + msg_history.replace(/<br>/g,'\n'));

  return res
}



function  extractTypeOfOutboundEmail(body){
  if(~ body.indexOf('items has shipped')) return '#shipped#'
  if(~ body.indexOf('We are starting to prepare')) return '#preparing#'
  if(~ body.indexOf('Update for Order')) return '#update#'

  return '#basic_email#' //default?
}



function sendSpamAlertEmail(msg_history, addr){
  var alertEmail = 'HOLD placed on this addr: ' + addr + '<br><br>The last element of the history below was blocked. See complete message history to identify issue.'
  alertEmail += '<br>History of contact:<br>'
  alertEmail += msg_history
  MailApp.sendEmail(PRODUCTION_ERRORS_EMAIL, 'Stop Spam', '', {htmlBody: alertEmail})
}
