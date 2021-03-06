//Handles taking an event and checking if it's been processed
//For the moment, just looks at Twilio requests
//If a comm-obj failed, call processCommArr on the fallbacks
//Makes appropriate tagging of the calendar events to keep track
function processQueuedEvent(comm_arr, event,cache){
  
  var sf_object = extractSFObj(comm_arr)

  var title = event.getTitle()
  
  handleInitialQueues(comm_arr, title, event,cache, sf_object) //if one of the comm-objs in the description is queued
  
  handleFallbacks(comm_arr, title, event,cache, sf_object) //if one of the fallbacks nested within, is queued
  
}


//Given indexes of comm-objects to look at in the comm_arr, checks their progress
//and tags or reprocesses appropriately
function handleInitialQueues(comm_arr, title,event,cache, sf_object){
    
  var initial_queues = extractQueuedTags(title) //indexes within comm_arr that need to be checked

  for(var i = 0; i < initial_queues.length; i++){
    
      var index = initial_queues[i]
      
      var obj = comm_arr[index]

      if(obj.sms || obj.call) handleTwilioObjects(index,obj, event,cache, sf_object)
     
  }
}


//Givne indexes of comm-obj (parent-fallback), checks them all
//and tags appropriately
function handleFallbacks(comm_arr, title,event,cache, sf_object){
  var fallbacks_to_check = extractFallbackTags(title)

  for(var i = 0; i < fallbacks_to_check.length; i++){
    
    var indexes = fallbacks_to_check[i].split("-") //first part is parent index, second is fallbackarra index
    
    var parent_obj = comm_arr[indexes[0]]
    
    var fallbacks = parent_obj.fallbacks //this is the array that you need to check
    
    var obj = fallbacks[indexes[1]]

    if(obj.sms || obj.call) handleTwilioObjects(fallbacks_to_check[i],obj, event,cache, sf_object) 
    
  }
}


//Handles taking an object, and making appropriate calls to Twilio
//Checking results, and tagging appropriately and/or calling processCommArr on fallbacks
function handleTwilioObjects(index,obj, event,cache, sf_object){
    
  var code = obj.sms ? 'sms' : 'call'
  
  var phone_nums = obj[code].split(",")
  
  var any_success = false
  var num_failures = 0
  
  for(var n = 0; n < phone_nums.length; n++){
    
    var num = phone_nums[n].replace(/\D/g,'').trim()

    var sid = code == 'sms' ? pullFromCache(STORED_MESSAGE_SID,num,cache) : pullFromCache(STORED_CALL_SID,num,cache)
    
    var raw_res = fetchResource(sid,code)
    
    var twilio_res = null

    if(raw_res.getResponseCode() != 200){
      return debugEmail('Failed request to fetchResource', 'Failed to send a request to Twilio\n\n' + num + '\n' + '\n' + raw_res.getResponseCode() + '\n' + raw_res.getContentText()) //For now, let's see what parts actually give us errors, and which ones
    } else {
      twilio_res = JSON.parse(raw_res.getContentText())
    }

    var status = twilio_res.status

    if((status == 'delivered') || (status == 'completed')){ 
      
      any_success = true
      break; //don't check any of the other numbers, doesn't matter
      
    } else if((status == 'failed') || (status == 'undelivered')){
      
      num_failures += 1
      
      if((n == phone_nums.length -1) && (num_failures == phone_nums.length)){ //if its the last of the numbers, and all others have failed, then mark failed and engage callbacks
        markFailed(event,index)
        if(obj.fallbacks) processCommArr(obj.fallbacks, event, true, cache, index); //send to processcomarr along with index of parent, so it can note appropriately 
      }
       
    }
    
  }
  
  if(any_success){
    markSuccess(event,index,code, sf_object) 
  }
  
}
