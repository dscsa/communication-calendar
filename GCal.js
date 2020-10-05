//Only called from the test sheet -> copies events from the live calendar into 
//the test cal so that we can fully test without interfering
function calendarCopier(){
  var live_cal = CalendarApp.getCalendarById(SECURE_CAL_ID)
  var test_cal = CalendarApp.getCalendarById(TEST_CAL_ID)
  
  var now = new Date();
  var oneMinuteBack = new Date(now.getTime() - (60 * 1000));
  var events_to_copy = live_cal.getEvents(oneMinuteBack, now)
  
  for(var i = 0; i < events_to_copy.length; i++){
    if(events_to_copy[i].getStartTime().getTime() >= oneMinuteBack.getTime()){
      test_cal.createEvent(events_to_copy[i].getTitle().replace(/TEXTED|CALLED|EMAILED|FAXED/g,''), events_to_copy[i].getStartTime(), events_to_copy[i].getEndTime(), {description: events_to_copy[i].getDescription()})
    }
  }
}






function markFailed(event,index){
  var title = event.getTitle() //mark that it failed on whichever mode of contact
  var rx = new RegExp('QUEUED-' + index, 'g')
  title = title.replace(rx, 'FAILED-' + index) //note that the parent object failed, can be commented out and replaced with line below
  event.setTitle(title)
}


function markSuccess(event,index,code, sf_object){
  var title = event.getTitle()  
  var rx = new RegExp('QUEUED-' + index, 'g')
  title = title.replace(rx, (code == 'sms' ? 'TEXTED ' : 'CALLED '))
  

  var separator = '---SFOBJECT---' //just has to sync with Salesforce
  
  if(sf_object){
    if((sf_object.length > 0) && !(~ event.getDescription().indexOf(separator))){
      
      event.setDescription(sf_object + "\n\n" + separator + "\n\n" + event.getDescription())
      
      if(~ title.indexOf('LOCKED')){
        title = title.replace(/LOCKED/g,'SF ')
      } else if(!(~ title.indexOf('SF '))){
        title = 'SF ' + title
      }
      
    }
  } else {
    console.log(contact_name)
    var contact_name = extractNameFromEvent(title) //will return either the name-dob format, or empty string
    event.setLocation(contact_name) //this is for the OLD magic, eventually need to remove all together
  }
  
  event.setTitle(title)

}


function markLocked(event){
  event.setTitle('LOCKED ' + event.getTitle())
}

function unlockEvent(event){
  event.setTitle(event.getTitle().replace('LOCKED',''))
}
    
function markQueued(event,is_fallback,parent_index,index){
    var title_tag = 'QUEUED-'
    title_tag += is_fallback ? parent_index + '-' + index : index
    event.setTitle(title_tag + ' ' + event.getTitle().replace('LOCKED ',''))
}


function spamTagCal(event){
  event.setTitle('SPAM-STOPPED  - ' + event.getTitle())
}

function markStopped(event){
  event.setTitle('BLACKLIST-STOPPED  - ' + event.getTitle())
}


//Get events that haven't yet been touched, and will need to be queued up
function getEventsToQueue(calendar_id, startTimeDate){

  var calendar = CalendarApp.getCalendarById(calendar_id)
  var now = new Date();

  var raw_events = calendar.getEvents(startTimeDate, now); //gets all events that OCCURED between startimedate and now

  var res = []

  for(var i = 0; i < raw_events.length; i++){
    var title = raw_events[i].getTitle()
    
    if( ~ title.indexOf("EMAILED") || ~ title.indexOf('LOCKED') || ~ title.indexOf("TEXTED") || ~ title.indexOf("SF ") 
    || ~ title.indexOf("CALLED")|| ~ title.indexOf("FAXED") || ~ title.indexOf("QUEUED") || ~ title.indexOf("FAILED") ||  ~ title.indexOf("STOPPED")) continue; //don't reprocess a tagged event
    
    if(raw_events[i].getStartTime().getTime() >= startTimeDate.getTime()){
      console.log('locking event: ' + raw_events[i].getTitle())
      try{
        markLocked(raw_events[i]) //mark it as locked now so we don't touch it again if this run takes more than one minute
      } catch(err){ //if you get an error, then it's the quota of too-fast event manipulation, so stop here and return
        console.log("error when locking: " + JSON.stringify(err))
        MailApp.sendEmail('aminata@sirum.org','HIT THE QUOTA ISSUE','')
        break
      }
      res.push(raw_events[i]) //only take events that STARTED a minute ago
    }
  }
  Logger.log(res)
  return res

}


//Get events that have been queued and either need a fallback processed,
//or they need to be tagged as done
function getQueuedEvents(calendar_id, startTimeDate){

  var calendar = CalendarApp.getCalendarById(calendar_id)
  var now = new Date();

  var raw_events = calendar.getEvents(startTimeDate, now); //gets all events that OCCURED between startimedate and now

  var res = []

  for(var i = 0; i < raw_events.length; i++){
    var title = raw_events[i].getTitle()
    if( ~ title.indexOf('STOPPED')) continue;
    if( !(~ title.indexOf('QUEUED'))) continue;
    if(raw_events[i].getStartTime().getTime() >= startTimeDate.getTime()) res.push(raw_events[i])
  }

  return res

}



//Checks both the live hours (against the current time), 
//and whether the event has workHours set to true
//If workHours is not in the object, assume its true
//Then, if an event is meant for workHours, then shift it and return
//true so it doesn't get processed
function shouldShift(comm_arr, event){
  
  if((!inLiveHours()) && (comm_arr.length > 0)){
    var workHours = ('workHours' in comm_arr[0]) ? comm_arr[0].workHours : true //if no workHours field is set, assume it needs to be processed only in work hours
  
    if(workHours){
      console.log('shifting event');
      shiftEvents([event])
      return true
    }
 }
 
 return false
}




//If there's an event created during off-hours, shift it to the start of day time
function shiftEvents(events){
  var now = new Date()

  for(var i = 0; i < events.length; i++){
    var event = events[i]

    var event_length =  event.getEndTime().getTime() - event.getStartTime().getTime()
    
    //If it's before start of day, you want to move the event to SOD same day
    //If it's after SOD, but you get here, then it must be passed EOD, so you want to move the event to SOD of next day
    var start = new Date()

    if(now.getHours() > LIVE_SOD) start.setDate(now.getDate() + 1);

    start.setHours(LIVE_SOD)
    start.setMinutes(0)
    start.setSeconds(0)

    event.setTime(start, new Date(start.getTime() + event_length))

  }
}



//Helper: Checks start-of-day and end-of-day constants
//to determine if currently running within live hours
function inLiveHours(){
  var now = new Date();
  var hour = now.getHours()
  return ((hour >= LIVE_SOD) && (hour < LIVE_EOD))
}
