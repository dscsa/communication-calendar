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

    processEvents(SECURE_CAL_ID, oneMinuteBack)
    //processEvents(TEST_CAL_ID,oneMinuteBack) 
    //processEvents(INSECURE_CAL_ID,oneMinuteBack)
    
  } catch (e) {
    debugEmail('main','error: '+e.message+' '+e.stack)
    console.log('main error: '+e.message+' '+e.stack)
  }
 

 
  lock.releaseLock()
  
  Logger.log("Finished Main")

}


function compUrl(){
  Logger.log(ScriptApp.getService().getUrl())  
}


//Specify the start time of a test event here, use for debugging
function runOnTestEvent(){
  var date_back = new Date('2019-06-05T15:49:00Z') //specifiy time here in UTC (east coast plus 4 w/o daylight savings)
  processEvents(TEST_CAL_ID,date_back)
}


//Looks to one of the calendars under this account to find events that need processing
//set up with this api so that it can be more easy to test
//by having a consistent startTime
function processEvents(calendar_id, startTimeDate){

  var events = getCalEvents(calendar_id, startTimeDate)
  
  if(!inLiveHours()){
    shiftEvents(events)
    return
  }
  
  for(var i = 0; i < events.length; i++){
  
    var location = events[i].getLocation()
    var description = events[i].getDescription()
    var title = events[i].getTitle() 

    description = decodeDescription(description) //description field will be url-encoded html and needs to be processed

    processCommArr(description, events[i].getId(), calendar_id)
    
  }
  
}







