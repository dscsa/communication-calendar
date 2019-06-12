
function clearCache(phone_num, cache){
  cache.remove(phone_num)
}


function testNewCache(){

 var str = '--'
 Logger.log(str.replace(/\D/g,''))
}

function clearCache(){
  CacheService.getScriptCache().remove("sd")
}

function checkCache(){
  var num = "7066330218"
  Logger.log(CacheService.getScriptCache().get(num))
  //Logger.log(pullFromCache(1,num, CacheService.getScriptCache()))
}

function testEvent() {
  
  var calendar = CalendarApp.getCalendarById(SECURE_CAL_ID)
  var now = new Date('2019-05-30T21:49:00');
  var oneMinuteBack = new Date('2019-05-30T21:47:00');

  var events = calendar.getEvents(oneMinuteBack, now); //gets all events that OCCURED in the last minute, but this isn't exactly it
  for(var i = 0; i < events.length; i++){
  
     var location = events[i].getLocation()
     var description = events[i].getDescription()
     var title = events[i].getTitle() 
     
     processCommArr(adamCleanDescription(description), events[i].getId(), SECURE_CAL_ID)
  }
}


function testwouldSpam(){
  var contact_type = '#email#'
  var addr = 'omzosiru'
  var cache = CacheService.getScriptCache()
  var timestamp = Utilities.formatDate(new Date(), "GMT-04:00", "MM-dd-yyyy");
  var body = "here's a test message from me! Update for Order"
  Logger.log(wouldSpam(contact_type,addr,body, cache, timestamp))
  
}

function testCache(){
  Logger.log(CacheService.getScriptCache().get('CA1bb0b1ace110b41087868ed51c56b1de-EVENTID'))
}

function testCalUpdate(){
  markCalendar("CA1bb0b1ace110b41087868ed51c56b1de","CALLED")
 
}

function testFallbackcheck(){
  
  var cache = CacheService.getScriptCache()
  buildConnectedCaches(['CA1ecb0f243b02118205b05c1f77de3c35','me'], cache)
  cache.put('me','not a real fallback')
  Logger.log(shouldUseFallbacks('CA1ecb0f243b02118205b05c1f77de3c35',cache))
}


function testCacheConnector(){
  var arr = ['a','b','c','d']
  var cache = CacheService.getScriptCache()
  buildConnectedCaches(arr,cache)
  Logger.log(cache.get(arr[0] + "-LINKED"))
  Logger.log(cache.get(arr[4] + "-LINKED"))
}

function timingTest(){
  testCreateEvent(); //Create an event
  MVP() //immediately look for events --> this shouldn't catch anything, because it will look for a minute ago
  Utilities.sleep(60*1000) //wait a minute
  MVP() //run again, should catch the calendar event now
}


//Creating Calendar events will be handled on the Shopping sheet side of code
//This just imitates this for testing
//Creates a 1-minute long event right now
function testCreateEvent(){
  var start = new Date()
  var test_location = "peace and blessings"
  CalendarApp.getCalendarById(CALENDAR_ID).createEvent("Test Event for Twilio Integration", start, new Date(start.getTime() + (60*1000)), {location:TEST_NUM, description:test_location})
}




function step0Test() {  
  try{
    var res = sendSms(TEST_NUM,"Hi! This is a test of our Twilio integration")
    Logger.log(res)
    
  } catch(e){
    Logger.log("Error!" + "\n\n" + e)

  }
}

//Basic call that plays audio
//Used for development and debugging, not in production anywhere
//Keeps just reading the URL instead of pulling from it?
function playAudio(){
  var raw_file_id = '1m0lTwJqhO5Xj0dh7DLjt361NChau0zdP' //File must be in Drive, set to public internet access
  
  
  
  var exposed_google_link = 'https://drive.google.com/uc?export=download&id=' + raw_file_id
  var final_link = exposed_google_link.replace(/&/g,'&amp;') //to deal with breaking character '&'
  
  var twiML = '<?xml version="1.0" encoding="UTF-8"?><Response><Play>' + final_link + '</Play></Response>'

  CacheService.getScriptCache().put('call_text', twiML)
  
  Logger.log(sendCall(TEST_NUM));
}