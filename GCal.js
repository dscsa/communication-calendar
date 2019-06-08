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



//Gets all Calendar events that have started since the given starttime
//For regular functionality, startTimeDate = now - 60 seconds
//But for debugging, can be specified to highlight specific time for test event
function getCalEvents(calendar_id, startTimeDate){

  var calendar = CalendarApp.getCalendarById(calendar_id)
  var now = new Date();

  var raw_events = calendar.getEvents(startTimeDate, now); //gets all events that OCCURED between startimedate and now

  var res = []

  for(var i = 0; i < raw_events.length; i++){
    var title = raw_events[i].getTitle()
    if( ~ title.indexOf("EMAILED") || ~ title.indexOf("TEXTED") || ~ title.indexOf("CALLED")) continue; //don't reprocess a tagged event
    if(raw_events[i].getStartTime().getTime() >= startTimeDate.getTime()) res.push(raw_events[i]) //only take events that STARTED a minute ago
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
