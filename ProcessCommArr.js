//Call on every CalEvent description
//Also, call from doPost with the fallbacks array string
function processCommArr(all_comms, event, is_fallback, cache, parent_index) {
  
  var timestamp = Utilities.formatDate(new Date(), "GMT-04:00", "MM-dd-yyyy HH:mm:ss");
  
  var sf_object = extractSFObj(all_comms)
  
  if((all_comms.length == 1) && (sf_object.length > 0)){ //then it's composed entirely of a sf comm object
    markSuccess(event,null,null, sf_object)
  }
  
  for(var i = 0; i < all_comms.length; i++){ //any event may have multiple parallel communications to perform
    
    var obj = all_comms[i] //each obj can be processed in parallel, no regard for the other

    if(obj.sms || obj.call){ //a phone communication object
      processPhoneObject(i,parent_index,obj,cache, event, timestamp, is_fallback)

    } else if(obj.email){ //an email object
      processEmailObj(i, obj,cache, event, timestamp, sf_object, all_comms.length) //TODO pass sf object only if its a pure email + sf object

    } else if(obj.fax){
      processFaxObj(i,obj,cache, event, timestamp) //TODO pass sf object at a later time
    
    } 
    
  }
}

function extractSFObj(comm_arr){
  var obj_string = ''
  for(var i = 0; i < comm_arr.length; i++){
    var obj = comm_arr[i]
    if(obj.contact && obj.subject && obj.body){
      obj_string = JSON.stringify(obj)
    }
  }
  return obj_string
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
    
    var text_message_content = cleanTextMessage(message_content,'en', obj.language)

    queuePhone(index,parent_index, sms_arr, 'sms', text_message_content, fallbacks, cache, event, timestamp, is_fallback, spam_limit)

    var call_message_content = cleanCallMessage(message_content,cache, 'en', obj.language)

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
      markFailed(event,index)
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
function processEmailObj(index, obj, cache, event, timestamp, sf_object, comm_arr_size){
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

    if (obj.language) {
      subject = translateString(subject, 'en', obj.language)
      body = translateString(body, 'en', obj.language, 'html')
    }

    if(wouldSpam("#email#",recipient, body, cache, timestamp, spam_limit)){
      spamTagCal(event)
      return;
    }
      
    var from = ""
    var name = ""

    if( ! obj.from ){
      from = (event.getOriginalCalendarId() == SECURE_CAL_ID) ? SECURE_DEFAULT_FROM : INSECURE_DEFAULT_FROM
    } else {  
      var raw_from = obj.from.split("<")
      name = raw_from.length  > 1 ? raw_from[0].trim() : ''
      from = raw_from.length  > 1 ? raw_from[1].replace(">","").trim() : raw_from[0].trim() 
    }
    
    var attach_ids = obj.attachments ? obj.attachments : []
    var attachments = []
    
    if(attach_ids.length > 0){
      for(var i = 0; i < attach_ids.length; i++){
        var file = DriveApp.getFileById(attach_ids[i])
        var pdf  = file.getAs('application/pdf')
        attachments.push(
          {
            "filename":pdf.getName(),
            "type": file.getMimeType(),
            "content":Utilities.base64Encode(pdf.getBytes())
          }
        )
      }
    }
  
    if(!LIVE_MODE) recipient = PRODUCTION_ERRORS_EMAIL;
    
    var recipient_arr = recipient.split(",")
    var any_success = false
    
    var bcc = (sf_object.length == 0) ? (obj.bcc ? (obj.bcc + ((event.getOriginalCalendarId() == SECURE_CAL_ID) ? "," + SECURE_BCC_ADDR : "")) : SECURE_BCC_ADDR) : '' //if sf_object, dont bcc, otherwise do

    for(var i = 0; i < recipient_arr.length; i++){
      var response = sendEmail(subject, recipient_arr[i], body, attachments, from, name, from, obj.cc, bcc)

      if(response.errors){
        web_app_record(['Error from SendGrid', "Event ID: " + event.getId(), response.errors])
        debugEmail('Error from SendGrid', "Event ID: " + event.getId() + "\n" + response.errors)
      } else {
        any_success = true
      }

    }
            
    if(any_success){
      event.setTitle("EMAILED " + event.getTitle().replace('LOCKED ',''))
      if((sf_object.length > 0) && (comm_arr_size == 2)){ //if theres just the email + sf object, use that here, otherwise itll be added later
            markSuccess(event,null,null, sf_object)
      }
    } else {
      markFailed(event,index)
      if(obj.fallbacks) processCommArr(obj.fallbacks, event, true, cache, index)
    }
 
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

      if(event.getOriginalCalendarId() == SECURE_CAL_ID){ 
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
      
      event.setTitle("FAXED " + event.getTitle()) //TODO and add SF comm object
      
    } else {
      
      markFailed(event,index)
      if(obj.fallbacks) processCommArr(obj.fallbacks, event, true, cache, index) //send to processcomarr along with index of parent, so it can note appropriately 
         
    }
    
  } catch(e){
    debugEmail('Failure to process a Fax comm-object', JSON.stringify([e, obj]))
  }
}