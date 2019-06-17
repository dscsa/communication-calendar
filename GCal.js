//Called from WebApp callback.
//Looks to the cache through the phone_num to find eventID & calID that corresponds
//and uses the calendar event id to tag that event appropriately
function markCalendar(phone_num,tag, cache){

  var cal_id = pullFromCache(STORED_CAL_ID,phone_num, cache)
  var event_id = pullFromCache(STORED_EVENT_ID,phone_num, cache)

  if(cal_id && event_id){
      var event = CalendarApp.getCalendarById(cal_id).getEventById(event_id)
      event.setTitle(tag + " - " + event.getTitle())
  }
}




//Get events that haven't yet been touched, and will need to be queued up
function getEventsToQueue(calendar_id, startTimeDate){

  var calendar = CalendarApp.getCalendarById(calendar_id)
  var now = new Date();

  var raw_events = calendar.getEvents(startTimeDate, now); //gets all events that OCCURED between startimedate and now

  var res = []

  for(var i = 0; i < raw_events.length; i++){
    var title = raw_events[i].getTitle()
    if( ~ title.indexOf("EMAILED") || ~ title.indexOf("TEXTED") || ~ title.indexOf("CALLED") || ~ title.indexOf("QUEUED")) continue; //don't reprocess a tagged event
    if(raw_events[i].getStartTime().getTime() >= startTimeDate.getTime()) res.push(raw_events[i]) //only take events that STARTED a minute ago
  }

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
    if( !(~ title.indexOf('QUEUED'))) continue;
    if(raw_events[i].getStartTime().getTime() >= startTimeDate.getTime()) res.push(raw_events[i])
  }

  return res

}



//If there's an event created during off-hours, shift it to the start of day time
function shiftEvents(events){
  var now = new Date()

  for(var i = 0; i < events.length; i++){
    var event = events[i]

    //If it's before start of day, you want to move the event to SOD same day
    //If it's after SOD, but you get here, then it must be passed EOD, so you want to move the event to SOD of next day
    var start = new Date()

    if(now.getHours() > LIVE_SOD) start.setDate(now.getDate() + 1);

    start.setHours(LIVE_SOD)
    start.setMinutes(0)
    start.setSeconds(0)

    event.setTime(start, new Date(start.getTime() + (60 * 1000)))

  }
}



//Helper: Checks start-of-day and end-of-day constants
//to determine if currently running within live hours
function inLiveHours(){
  var now = new Date();
  var hour = now.getHours()
  return ((hour >= LIVE_SOD) && (hour < LIVE_EOD))
}
