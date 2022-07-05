//Handles either sending the debug email or logging message if we're approaching our quota
//Key issue: not wasting our quota on debug emails
function debugEmail(subject,body){
  var quota = MailApp.getRemainingDailyQuota() //how many more emails can we afford to send
  
  if (quota < 200) { //if we're near our quota limit, don't send another email, just log
    return console.log({"issue":'approaching email quota, remaining: ' + quota, "subject":subject,"body":body})
  }

  MailApp.sendEmail(PRODUCTION_ERRORS_EMAIL, subject.slice(0, 250),subject+' '+body)
}



//This email has to be sent, doesn't matter if we're approaching quota
function emergencyEmail(subject,body){
  MailApp.sendEmail(PRODUCTION_ERRORS_EMAIL, subject,body)
  console.log({"issue":'TWILIO FAILING TO PARSE OUR TWIML: ', "subject":subject,"body":body})
}


//Checks if addr is an email address, or array of email addresses
//and checks all addresses against a list of SPAMPROOF_DOMAINS or PRODUCTION_SPAMPROOF_EMAIL
//If all emails are internal, then return true
//if >= one is external, then it should be subject to spam filter rules
function excludedEmail(addr){
  
  if(! (~ addr.indexOf("@"))) return false //quick reject for non-emails
  
  var emails = addr.split(",") //in case there are multiple, all must be spamproof for it to return true
  
  for(var n = 0; n < emails.length; n++){

    if(emails[n].trim().length > 0){

      if(~ PRODUCTION_SPAMPROOF_EMAIL.indexOf(emails[n].trim())) continue; //autoapprove hardcoded emails
      
      var rx = /@.+/
      var res = rx.exec(emails[n].trim())
      
      if(res){

        if(!(~ SPAMPROOF_DOMAINS.indexOf(res[0]))) return false //if even one isn't spamproof, spamrules apply
        
      } else {

        return false //if one is non-empty but not a parseable email, then spamrules apply
        
      }
    }
  }

  return true

}

function wouldSpam(contact_type, addr, body, cache, timestamp, spam_limit){
  
  if( (!LIVE_MODE) || ~ PRODUCTION_SPAMPROOF_PHONE.indexOf(addr.trim()) || excludedEmail(addr)) return false; //for debugging and general testing, don't worry about spamming ourselves

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

