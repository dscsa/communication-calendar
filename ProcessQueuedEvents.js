//Handles taking an event and checking if it's been processed
//For the moment, just looks at Twilio requests
//If a comm-obj failed, adds its fallbacks to the fallback_arr that's returned
function processQueuedEvent(comm_arr, title, event,cache){
  
  var fallback_arr = [] //this should be returned if anything still needs to be processed
  
  var comm_obj_to_check = extractQueuedTags(title)
  
  for(var i = 0; i < comm_arr.length; i++){
    
    var obj = comm_arr[i]
    
    if(obj.sms || obj.call){ //currently only a relavant process to phone objects
      
      var code = obj.sms ? 'sms' : 'call'
      
      if(~ comm_obj_to_check.indexOf(code)){ //if its one of the queued, check again for all phone numbers
        
        var phone_nums = obj[code].split(",")
        
        for(var n = 0; n < phone_nums.length; n++){
          
          var num = phone_nums[n].replace(/\D/g,'').trim()
          var sid = code == 'sms' ? pullFromCache(STORED_MESSAGE_SID,num,cache) : pullFromCache(STORED_CALL_SID,num,cache)
          
          var twilio_res = fetchResource(sid,code) //TODO: check twilio_res a little more thoroughly here
          var status = twilio_res.status

          if((status == 'delivered') || (status == 'completed')){ //only handled on the first number --> we only need one
            
            var title = event.getTitle()
            title = title.replace('QUEUED-' + code, (code == 'sms' ? 'TEXTED ' : 'CALLED '))
            event.setTitle(title)
            
            break;
            
          } else if((status == 'failed') || (status == 'undelivered')){
            
            var title = event.getTitle() //mark that it failed on whichever mode of contact
            title = title.replace('QUEUED-' + code, 'FAILED-' + code)
            event.setTitle(title)
            
            if((n == phone_nums.length -1) && (obj.fallbacks)){ //it'll go and process the fallbacks
              fallback_arr = fallback_arr.concat(obj.fallbacks)
            }
            
          }
          
        }
        
      }
      
    } 
    
  }
  
  var fallbacks_to_check = extractFallbackTags(title)
  
  if(fallbacks_to_check.length > 0){
    
    for(var i =0; i < comm_arr.length; i++){
      var obj = comm_arr[i]
      var fallbacks = obj.fallbacks
      if(fallbacks){
      }
    }
    
  }

  return fallback_arr
}





function extractFallbackTags(str){
  var rx = /QUEUED-FALL-(sms|call) /g
  return getAllMatches(rx,str)
}



function extractQueuedTags(str){
  var rx = /QUEUED-(sms|call) /g
  return getAllMatches(rx,str)
}





function getAllMatches(rx,str){
  var arr = rx.exec(str)
  var res = []
  while(arr != null){
    res.push(arr[1])
    arr = rx.exec(str)
  }
  return res
}