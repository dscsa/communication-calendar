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



//Given a phone number or an email, checks the cache
//If there (meaning we sent a contact in the last 6 hours), don't contact again
//unless it's a different type of communication
//If it'd be spam, sends email about issue
//contact_type = '#text#' or '#call#' or '#email#'
//Cache entry for each addr is the message_history
//For phones, that's 'text','call'
//For emails, that's all emails we've sent them
function wouldSpam(contact_type, addr, body, cache, timestamp){

  if( ~ PRODUCTION_SPAMPROOF_PHONE.indexOf(addr.trim()) || ~ PRODUCTION_ERRORS_EMAIL.indexOf(addr.trim())) return false; //for debugging and general testing, don't worry about spamming ourselves

  var res = false
  var prev_contacts = getContactHistory(addr, cache)  || ''

  if(contact_type == '#email#'){
    contact_type = extractTypeOfOutboundEmail(body) //get thet ype of email (shipped, update, notif)
  }

  res = ~ prev_contacts.indexOf(contact_type) //have we sent this type of communicatiojn to this number in thelast 6 hours?

  var msg_history = prev_contacts + "<br>" + contact_type + " : " + timestamp + " : " + addr + "<br>" + body

  updateContactHistory(addr, msg_history,cache)

  if(res) sendSpamAlertEmail(msg_history, addr);

  return res
}



function  extractTypeOfOutboundEmail(body){
  if(~ body.indexOf('items has shipped')) return '#shipped#'
  if(~ body.indexOf('We are starting to prepare')) return '#preparing#'
  if(~ body.indexOf('Update for Order')) return '#update#'

  return '#basic_email#' //default?

}



function sendSpamAlertEmail(msg_history, addr){
  var alertEmail = 'We are at risk of spamming this contact address: ' + addr + '<br>'
  alertEmail += '<br>History of contact:<br>'
  alertEmail += msg_history
  MailApp.sendEmail(PRODUCTION_ERRORS_EMAIL, 'Stop Spam', '', {htmlBody: alertEmail})
}
