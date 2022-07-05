//Regularly triggered main function that handles integration
//between Calendar and Twilio
function main(){
  
  var lock = LockService.getScriptLock()

  try{
    lock.waitLock(10000) //if we don't have the lock
  } catch(e) {
    //debugEmail('Could not acquire lock in main','Probably linked to the sporadic lock.releaselock() issue. Put lock.relaseLock() into a try-catch as per this: https://stackoverflow.com/questions/53277135/there-are-too-many-lockservice-operations-against-the-same-script')
    console.log("Could not get script lock");
    debugEmail('could not get script lock in main','')
    //return
  }

  Logger.log("Running Main")

  try {

    var now = new Date();
    var oneMinuteBack = new Date(now.getTime() - (2* 60 * 1000));
    var fifteenMinutesBack = new Date(now.getTime() - (15* 60 * 1000));
    
    var queueTimeSpan = new Date(now.getTime() - (MINUTES_BACK_FOR_QUEUE * 60 * 1000));

    Logger.log("Checking PHARMACY_APP_CAL_20220301")
    processEvents(PHARMACY_APP_CAL_20220301, oneMinuteBack,queueTimeSpan) //processEvents(PHARMACY_CAL_ID,  oneMinuteBack,queueTimeSpan)
    
    Logger.log("Checking SHIPMENTS_APP_CAL_20220610")
    processEvents(SHIPMENTS_APP_CAL_20220610, oneMinuteBack,queueTimeSpan)
    
    Logger.log("Checking ZAPIER_COMMS_CAL_20220610")
    processEvents(ZAPIER_COMMS_CAL_20220610, oneMinuteBack,queueTimeSpan)
    
    Logger.log("Checking THUNDER_CAL_ID")
    processEvents(THUNDER_CAL_ID,fifteenMinutesBack,queueTimeSpan)
    
    //THIS IS DEPRECATED. REMOVE THIS ONCE NOTHING IS WRITING TO IT ANY MORE
    Logger.log("Checking INSECURE_CAL_ID")
    processEvents(INSECURE_CAL_ID,oneMinuteBack,queueTimeSpan) //OLD Bertha stuff, replaced by Shipments_App_Cal 

  } catch (e) {
    Logger.log('error: '+e.message+' '+e.stack)
    debugEmail('main','error: '+e.message+' '+e.stack)
    console.log('main error: '+e.message+' '+e.stack)
  }

  try{
    lock.releaseLock()
  } catch(e){ //there is a sporadic error on google's end where this fails, so they suggest putting it in a try/catch and sleeping, then retrying https://issuetracker.google.com/issues/112384851
    Utilities.sleep(3000);
    lock.releaseLock()
  }

  Logger.log("Finished Main")

}



//Specify the start time of a test event here, use for debugging
function testMain(){
  var date_back = new Date('2019-10-03T21:30:00Z') //specifiy time here in UTC (east coast plus 4 w/o daylight savings)
  processEvents(TEST_CAL_ID,date_back,date_back)
}



//Looks to one of the calendars under this account to find events that need processing
//and those that need to be checked
//set up with this api (of having the times as parameterrs) so that it can be more easy to test
//by having a consistent endTime
function processEvents(calendar_id, timeToQueue, timeAlreadyQueued){

  var events_to_queue = getEventsToQueue(calendar_id, timeToQueue)
  var queued_events = getQueuedEvents(calendar_id,timeAlreadyQueued)

  var cache = CacheService.getScriptCache()
  coordinateProcessing(0,events_to_queue,cache)
  coordinateProcessing(1,queued_events,cache)
}


function coordinateProcessing(code,arr_events,cache){
  
 if(!code) console.log('events to queue: ' + arr_events.join(","))
 
 for(var i = 0; i < arr_events.length; i++){
   
   var description = arr_events[i].getDescription()
   description = decodeDescription(description) //description field will be url-encoded html and needs to be processed

   var comm_arr = {}

   try {
      comm_arr = JSON.parse(description)
   } catch (e) {
      debugEmail('Failure to process a comm-array', e.message+' | '+description+' | '+Utilities.base64Encode(description))
      continue
   }

   if(shouldShift(comm_arr, arr_events[i])){
     unlockEvent(arr_events[i])
     continue;
   }

   if(code){
     console.log('revisiting event: ' + arr_events[i].getTitle())
     processQueuedEvent(comm_arr, arr_events[i], cache) //check status of queued objects, and potentially engage fallbacks

   } else {
     console.log('processing event for first time: ' + arr_events[i].getTitle())
     processCommArr(comm_arr, arr_events[i], false, cache) //directly handle the event, it hasn't been queued
   }

  }
}

