function sleepme(){
  Utilities.sleep(10000)
}

function testDebugEmail() {
  return debugEmail('testDebugEmailSubject','testDebugEmailBody')
}

function testCals(){
  var cals = CalendarApp.getAllCalendars();
  for(var n in cals){
    Logger.log(' calendar ID = '+cals[n].getId()+'\nName = '+cals[n].getName()+'\n')
  }
}

function testWebApp() {
  var payload = {}
  
  payload['title'] = "V1 Individual Donation Email: Adam5 Kircher"
  payload['send_now'] = 1
  payload['password'] = 'Stanf0rd'
  payload['body'] = [
    {
      "blobs":[
        "Adam5 Kircher_09-09-2020_label.pdf",
        "Adam5 Kircher_09-09-2020_manifest.pdf"
      ],
      "email":"adam.kircher@gmail.com",
      "message":"<!DOCTYPE html PUBLIC Adam \"-\/\/W3C\/\/D TD HTML 4.01\/\/EN\" \"http:\/\/www.w3.org\/TR\/html4\/strict.dtd\">\n<html>\n<head>\n  <meta http-equiv\=\"Content-Type\" content=\"text\/html; charset=UTF-8\">\n  <meta http-equiv\=\"Content-Style-Type\" content=\"text\/css\">\n  <style type=\"text\/css\">\n    a { text-decoration: none; color: #1088d1 }\n    a:hover { text-decoration: underline; color: #1088d1 }\n    img { border: 0px; }\n<\/style>\n<\/head>\n<body width=\"100%\" style=\"background-color: #545454; line-height: 20.0px; font-family:Lucida Sans\">\n<table width=\"700.0\"  style=\"padding:10px 30px;\" cellspacing=\"0\" cellpadding=\"0\">\n  <tbody>\n    <tr>\n      <td>\n\n        <table style=\"margin:0px; padding:0px; background-color:#FFFFFF;\" width=\"700.0\" cellspacing=\"0\" cellpadding=\"0\">\n          <tbody>\n            <tr>\n              <td style=\"padding:10px 0px 5px 15px; line-height: 20.0px; font-size: 15.0px;\">Hi Adam5 Kircher,<\/td>\n              <td align=\"right\" style=\"width:181px; padding:10px 15px 5px 0px;\">\n\t\t\t\t\t\t<img style=\"height:25px\" src=\"https:\/\/donate.sirum.org\/images\/SIRUM_Logo.png\" alt=\"\"\/>\t\t\t\t  <\/td>\n      <\/tr>\n            <tr>\n              <td style=\"padding: 0px 15px; font-size:13px;\" colspan=\"2\" valign=\"top\">Thank you Adam5 Kircher! To complete your donation:<br><br>\n\t1. Print the attached shipping label and donation manifest<br>\n\t2. Place the manifest inside the box and tape the shipping label to the outside.<br>\n\t3. Seal the box and <a href=\"https:\/\/local.fedex.com\/GA\/Atlanta\/\" class=\"\">drop it off at the nearest FedEx pickup location<\/a><br>\n\t4. Keep this email and two attachments for your records<br><br>\n\tIf any of your medications are not eligible for donation, please dispose of them properly. Please drop them off at a <a href=\"https:\/\/apps2.deadiversion.usdoj.gov\/pubdispsearch\/spring\/main?execution=e1s1\" class=\"\">local collection site<\/a>.\n  If there is not a convenient collection site and the medications are not controlled substances, you can also dispose of them yourself: simply cross off your information from the prescription bottle, mix the medicine with something unappetizing (such as coffee grounds or kitty litter), and place it into your household trash.<br>\n\t<a href=\"https:\/\/www.fda.gov\/drugs\/safe-disposal-medicines\/disposal-unused-medicines-what-you-should-know\" class=\"\">Learn more about proper disposal from the FDA<\/a><br><\/td>\n            <\/tr>\n            <tr>\n              <td style=\"padding: 10px 15px 15px 15px; font-size:13px;\">Saving Medicine : Saving Lives<br><strong>The SIRUM Team<\/strong><\/td>\n              <td><\/td>\n            <\/tr>\n          <\/tbody>\n        <\/table>\n\n        <table style=\"margin:0px; padding:0px;\" width=\"700.0\" cellspacing=\"0\" cellpadding=\"0\">\n          <tbody>\n        <tr>\n              <td style=\"line-height:12px; font:9px Geneva; color:#999999; padding:5px 0px;\"> 2020 SIRUM, a 501(c)3 non-profit born at Stanford University<\/td>\n    <\/tr>\n          <\/tbody>\n        <\/table>\n\n      <\/td>\n    <\/tr>\n  <\/tbody>\n<\/table>\n<\/body>\n<\/html>\n",
      "workHours":false,
      "from":"support@sirum.org",
      "subject":"Your SIRUM Donation Label"
    }
  ]
                      
                      
  var options = {
    'method' : 'post',
    'muteHttpExceptions':true,
    'payload' : JSON.stringify(payload)       
  };
                                          
  var res = UrlFetchApp.fetch('https://script.google.com/a/sirum.org/macros/s/AKfycbxGd4CIQHDTYuj2Jm0QxEJdL_Xzk1mHZHVNWOvl3sRVgZwjxZY/exec', options);  
  Logger.log(['Test Web App', res, options])
  web_app_record(["Test Web App", options.payload, Utilities.base64Encode(options.payload)])

}

function testNewCache(){

 var str = '--'
 Logger.log(str.replace(/\D/g,''))
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
  Logger.log(JSON.stringify(CalendarApp.getAllCalendars()))
  CalendarApp.getCalendarById(SECURE_CAL_ID).createEvent("Test Event for Twilio Integration", start, new Date(start.getTime() + (60*1000)), {location:'Location', description:test_location})
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