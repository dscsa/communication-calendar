function sendEmail(subject, recipient, body, attachments, from, from_name, reply_to, cc, bcc){
  
  var headers = {
    "Authorization" : "Bearer "+ SENDGRID_KEY, 
    "Content-Type": "application/json" 
  }

  //Declare with all the required params
  var body =
  {
    "personalizations": [
      {
        "to": [
          {
            "email": recipient,
          }
        ],
        "subject": subject,
      }
    ],
      
    "from": {
      "email": from,
    },
      
    "reply_to":{
      "email" : reply_to,
    },
      
    "content": [
      {
        "type": "text/html",
        "value": body,
      }
    ]
  }
  
  //Then add optionals
  if(from_name) body.from.name = from_name
  if(cc) body.personalizations[0].cc = buildRecipientObj(cc.split(","))
  if(bcc) body.personalizations[0].bcc = buildRecipientObj(bcc.split(","))
  if(attachments.length > 0) body.attachments = attachments
    
  var options = {
    'method':'post',
    'headers':headers,
    'payload':JSON.stringify(body),
    'muteHttpExceptions' : true
  }

  return UrlFetchApp.fetch("https://api.sendgrid.com/v3/mail/send",options);
}


function buildRecipientObj(array){
  var res = []
  for(var i = 0; i < array.length; i++){
    res.push({"email":array[i]})
  }
  return res
}
