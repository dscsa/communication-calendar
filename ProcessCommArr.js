//Call on every CalEvent description
//Also, call from doPost with the fallbacks array string
function processCommArr(all_comms, event, is_fallback, cache, parent_index) {
  
  var timestamp = Utilities.formatDate(new Date(), "GMT-04:00", "MM-dd-yyyy HH:mm:ss");
  
  for(var i = 0; i < all_comms.length; i++){ //any event may have multiple parallel communications to perform
    
    var obj = all_comms[i] //each obj can be processed in parallel, no regard for the other

    if(obj.sms || obj.call){ //a phone communication object
      processPhoneObject(i,parent_index,obj,cache, event, timestamp, is_fallback)

    } else if(obj.email){ //an email object
      processEmailObj(obj,cache, event, timestamp)

    } else if(obj.fax){
      processFaxObj(i,obj,cache, event, timestamp)
    }
    
  }
}


//All phone communications will go through Twilio's API
function processPhoneObject(index,parent_index,obj,cache, event, timestamp, is_fallback){

  try{

    if( ! obj.message) throw new Error("Phone contact object must have a message");

    var message_content = obj.message

    var fallbacks = obj.fallbacks ? JSON.stringify(obj.fallbacks) : ''
    var sms_arr = obj.sms ? obj.sms.toString().split(",") : []
    var call_arr = obj.call ? obj.call.toString().split(",") : []
    var spam_limit = obj.spamLimit? obj.spamLimit : CONTACTS_CAP
    
    var text_message_content = cleanTextMessage(message_content,cache)
    
    queuePhone(index,parent_index, sms_arr, 'sms', text_message_content, fallbacks, cache, event, timestamp, is_fallback, spam_limit)

    var call_message_content = cleanCallMessage(message_content,cache)

    queuePhone(index,parent_index, call_arr, 'call', call_message_content, fallbacks, cache, event, timestamp, is_fallback)
        
  } catch(e){
    debugEmail('Failure to process a phone comm-object', JSON.stringify([e, obj]))
  }
}



//Manages sending requests to Twilio, lining up the caching required to catch callbacks later
function queuePhone(index,parent_index,arr,code,message,fallback_str,cache, event, timestamp, is_fallback, spam_limit){

  var phone_num_arr = [] //use this to store all sids in one object, and create a linked bunch of caching values, that way we only go to fallbacks if all of them fail

  for(var n = 0; n < arr.length; n++){ //go through all numbers

    var phone_num = arr[n].replace(/\D/g,'') //remove non-digits
    
    if(phone_num.trim().length == 0){ //don't try to process empty phone numbers --> stop us cascading with errors from shopping sheet
      debugEmail('Comm-Obj w/o a Phone #', "Event ID: " + event.getId())
      continue;
    }
    
    if(((code == 'call') && holdCall(phone_num,cache))
      || (wouldSpam("#" + code + "#",phone_num, message, cache, timestamp, spam_limit))){
        spamTagCal(event)
        continue;  
    }

    var response = null
    var res = null

    if(code == 'sms'){

      response = sendSms(phone_num,message)
      
    } else if(code == 'call'){
      
      response = sendCall(phone_num, message, cache) //needs cache because of how we send twiml

    }

    if(response.getResponseCode() != 201){
      
      var res_obj = JSON.parse(response.getContentText())
      if(res_obj.code == 21610) return markStopped(event, is_fallback, parent_index,index); //this means they've replied 'STOP'
      
      return debugEmail('Failed request to Twilio', 'Failed to send a request to Twilio\n\n' + phone_num + '\n' + '\n' + response.getResponseCode() + '\n' + response.getContentText()) //For now, let's see what parts actually give us errors, and which ones

    } else {

      res = JSON.parse(response.getContentText())

    }
    
    markQueued(event,is_fallback,parent_index,index)
    
    var update_code = code == 'sms' ? STORED_MESSAGE_SID : STORED_CALL_SID
    updateCache(update_code,phone_num,res.sid,cache)

    
  }
}





//All email communications will go through GmailApp
function processEmailObj(obj, cache, event, timestamp){

  try{
    if( ! obj.email ) throw new Error("Email object must have a recipient");
    if( ! obj.message ) throw new Error("Email object must have a message");
    if( ! obj.subject ) throw new Error("Email object must have a subject");

    var recipient = obj.email
    
    if(recipient.toString().trim().length == 0){ //dont try to send email if theres no recipient
      debugEmail('Email Comm-Obj w/o Recipient', "Event ID: " + event.getId())
      return
    }
    
    var subject = obj.subject
    var body = obj.message
    var spam_limit = obj.spamLimit? obj.spamLimit : CONTACTS_CAP

    if(wouldSpam("#email#",recipient, body, cache, timestamp, spam_limit)){
      spamTagCal(event)
      return;
    }
      

    var from = ""
    var name = ""

    if( ! obj.from ){

      if(event.getOriginalCalendarId() == SECURE_CAL_ID){ //TODO: find a cleary way to store this default in calendar itself. current issue is that cal.getname pulls name as saved in original account. maybe in description?
        from = SECURE_DEFAULT_FROM
      } else {
        from = INSECURE_DEFAULT_FROM
      }

    } else {
      var raw_from = obj.from.split("<")
      name = raw_from.length  > 1 ? raw_from[0].trim() : ''
      from = raw_from.length  > 1 ? raw_from[1].replace(">","").trim() : raw_from[0].trim()

    }

    var aliases = GmailApp.getAliases()

    if(aliases.indexOf(from) == -1) {
      debugEmail('missing email alias', encodeURIComponent(from)+' '+encodeURIComponent(aliases.join(',')))
      throw new Error("The from address here isnt set up as an alias of the sending account. Given: " + from + " Aliases: " + aliases);
    }

    var options = {} //that will be used in the email itself
    options.from = from
    if(name) options.name = name

    if(obj.cc) options.cc = obj.cc;
    if(obj.bcc) options.bcc = obj.bcc;

    options.htmlBody = body

    var attachments = obj.attachments ? obj.attachments.toString().split(",") : []

    if(attachments.length > 0){
      var attach_arr = []
      for(var i = 0; i < attachments.length; i++){
        Logger.log(attachments[i].trim())
        attach_arr.push(DriveApp.getFileById(attachments[i].trim()).getBlob()) //needs to be an array of blobs
      }
      options.attachments = attach_arr
    }

    if(!LIVE_MODE) recipient = PRODUCTION_ERRORS_EMAIL;

    GmailApp.sendEmail(recipient, subject, '', options)

    event.setTitle("EMAILED " + event.getTitle())
 
  } catch(e){
    debugEmail('Failure to process a email comm-object', JSON.stringify([e, obj]))
  }

}



function processFaxObj(index,obj,cache, event, timestamp){
  
  try{

    if( ! obj.attachments) throw new Error("Fax comm-object must have an attachment array");
    
    var attachments = obj.attachments.toString().split(",")

    var recipient = obj.fax
    
    if (recipient.length == 10) recipient = '1'+recipient

    var spam_limit = obj.spamLimit? obj.spamLimit : CONTACTS_CAP
    
    if(recipient.trim().length == 0){ //don't try to process empty phone numbers --> stop us cascading with errors from shopping sheet
      debugEmail('Comm-Obj w/o a Fax #', "Event ID: " + event.getId())
      return;
    }
    
    if(wouldSpam("#fax#",recipient, '', cache, timestamp, spam_limit)){
      spamTagCal(event)
      return;
    }
    
    var from = ''
    
    if( ! obj.from ){

      if(event.getOriginalCalendarId() == SECURE_CAL_ID){ //TODO: find a cleary way to store this default in calendar itself. current issue is that cal.getname pulls name as saved in original account. maybe in description?
        from = SECURE_DEFAULT_FAX_FROM
      } else {
        from = INSECURE_DEFAULT_FAX_FROM
      }

    } else {
      from = obj.from
    }
    
    var all_sent = true
    
    for(var i = 0; i < attachments.length; i++){
      
      var doc = DriveApp.getFileById(attachments[i])
      
      var pdf = doc.getAs(MimeType.PDF)

      var res = sendSFax(recipient, from, pdf)

      var success = res && res.isSuccess ? "External" : "Error External"
      
      if(~ success.indexOf("Error")){
        all_sent = false
      }

    }
    
    if(all_sent){
      
      event.setTitle("FAXED " + event.getTitle())
      
    } else {
      
      markFailed(event,index)
      if(obj.fallbacks) processCommArr(obj.fallbacks, event, true, cache, index) //send to processcomarr along with index of parent, so it can note appropriately 
         
    }
    
  } catch(e){
    debugEmail('Failure to process a Fax comm-object', JSON.stringify([e, obj]))
  }
}