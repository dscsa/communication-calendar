//TODO: Adjust SOD and EOD variables back to business hours before turning live on

//Regularly triggered main function that handles integration 
//between Calendar and Twilio
function main(){
  
  var lock = LockService.getScriptLock()
  
  try{
    lock.waitLock(1000) //if we don't have the lock
  } catch(e) {
    console.log("Could not get script lock");
  }
  
  Logger.log("Running Main")

  try {
    var now = new Date();
    var oneMinuteBack = new Date(now.getTime() - (60 * 1000));
    var threeMinutesBack = new Date(now.getTime() - (3 * 60 * 1000));
    processEvents(SECURE_CAL_ID, oneMinuteBack,threeMinutesBack)
    //processEvents(INSECURE_CAL_ID,oneMinuteBack)
    
  } catch (e) {
    debugEmail('main','error: '+e.message+' '+e.stack)
    console.log('main error: '+e.message+' '+e.stack)
  }
 

 
  lock.releaseLock()
  
  Logger.log("Finished Main")

}



//Specify the start time of a test event here, use for debugging
function testMain(){
  var date_back = new Date('2019-06-11T13:28:00Z') //specifiy time here in UTC (east coast plus 4 w/o daylight savings)
  processEvents(TEST_CAL_ID,date_back,date_back)
}


//Looks to one of the calendars under this account to find events that need processing
//set up with this api so that it can be more easy to test
//by having a consistent startTime
function processEvents(calendar_id, timeToQueue, timeAlreadyQueued){

  var events_to_queue = getEventsToQueue(calendar_id, timeToQueue)
  var queued_events = getQueuedEvents(calendar_id,timeAlreadyQueued)
  var cache = CacheService.getScriptCache()
  
  if(!inLiveHours()){
    shiftEvents(events_to_queue)
    shiftEvents(queued_events) //todo:combine into one call
    return
  }
  
  //Go through events that need to be 'queued'
  
  for(var i = 0; i < events_to_queue.length; i++){
  
    var description = events_to_queue[i].getDescription()
    description = decodeDescription(description) //description field will be url-encoded html and needs to be processed

    var comm_arr = {}
    
    try {
      comm_arr = JSON.parse(description)
    } catch (e) {
      debugEmail('Failure to process a comm-array', JSON.stringify([e, description]))
      continue
    }
    
    processCommArr(comm_arr, events_to_queue[i], false)
    
  }
  
  //Go through events that have been 'qeueud' and either tag or processfallback
  
  for(var i = 0; i < queued_events.length; i++){
  
    var description = queued_events[i].getDescription()
    var title = queued_events[i].getTitle()
    
    description = decodeDescription(description) //description field will be url-encoded html and needs to be processed

    var comm_arr = {}
    try {
      comm_arr = JSON.parse(description)
    } catch (e) {
      debugEmail('Failure to process a comm-array', JSON.stringify([e, description]))
      continue
    }
    
    var fallback_arr = processQueuedEvent(comm_arr, title, queued_events[i], cache)
    if(fallback_arr.length > 0) processCommArr(fallback_arr, queued_events[i], true)
    
  }
  
}







