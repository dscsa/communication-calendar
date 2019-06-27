//Because cal event description is url-encoded, gotta clean it up a bit
function decodeDescription(raw){

  raw = raw.trim()

  try {
    var clean1 = decodeURIComponent(raw)
  } catch (e) {
    debugEmail('decodeDescription decodeURI Error', JSON.stringify([raw, e])) 
    var clean1 = raw
  }

  var clean2 = decodeEntities(clean1)

  // Remove <br> AND \n that are not in quotes which are added by google calendar if user hand edits a google calendar json description
  var clean3 = clean2.replace(/(<br>|\n| )(?=(?:(?:\\.|[^"\\])*"(?:\\.|[^"\\])*")*(?:\\.|[^"\\])*$)/g, '') //https://stackoverflow.com/questions/11502598/how-to-match-something-with-regex-that-is-not-between-two-special-characters

  // Remove mailto links which are added by google calendar if user hand edits a google calendar json description
  var clean4 = clean3.replace(/<a href="mailto:.+?" target="_blank">(.+?)<\/a>/g, '$1')

  var clean5 = clean4.replace(/<u><\/u>/g, '') //not sure why good inserts these

  //debugEmail('decodeDescription', JSON.stringify({raw:raw, clean1:clean1, clean2:clean2, clean2:clean3, clean4:clean4, clean5:clean5}, null, '  '))

  return clean5
}


//Remove HTML encoding
function decodeEntities(encodedString) {

  return encodedString.replace(/&nbsp;/g," ")
                      .replace(/&amp;/g,"&")
                      .replace(/&quot;/g,"\"")
                      .replace(/&lt;/g,"<")
                      .replace(/&gt;/g,">")

  //This code wasn't working, and the design was starting to confuse me,
  //so I just recoded the regexes that we've actually seen here

   /*var translate = {
        "nbsp":" ",
        "amp" : "&",
        "quot": "\"",
        "lt"  : "<",
        "gt"  : ">"
    }

    var regex = new RegExp('&'+Object.keys(translate).join('|')+';', 'g')

    return encodedString
    .replace(regex, function(match, entity) {
        return translate[entity]
    })
    .replace(/&#(\d+);/gi, function(match, numStr) {
        var num = parseInt(numStr, 10)
        return String.fromCharCode(num)
    })*/
}

function cleanTextMessage(raw,cache){
  
  var clean = raw.replace(/<.*?>/g,' ') //remove any html style tagging, or twiml
  
  return clean
}


//when handling phone calls, need to take the text and process into appropriate TwiML befoer sending
function cleanCallMessage(raw, cache) {

  var clean = raw.replace(/<play(.*?)>/ig,"</Say><Play$1>")
        .replace(/<\/play(.*?)>/ig,"</Play$1><Say>")
        .replace(/<Pause(.*?)>/ig,"</Say><Pause$1><Say>")
        .replace(/<Pause([^\/>]*?)>/ig,"<Pause$1/>")
        .replace(/<Say><\/Say>/g, '')
        .replace(/<u>/g,'').replace(/<\/u>/g,'') //todo: other style tags we need to remove?

  clean = handlePlayTag(clean,cache)


  console.log('cleanPhoneMessage: raw: '+raw+'\n\n clean:'+clean)

  //repeat message 3x
  var toRepeat = '</Say><Pause length="2"/><Say>this message will now repeat.</Say><Pause length="4"/><Say>'
  clean = clean + toRepeat + clean + toRepeat +clean +  '</Say><Pause length="2"/><Say>Good Bye'
  clean = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>' + clean + '</Say></Response>'

  return clean
}



//In between play tags, put filename of prerecorded audio, need to replace those with actual urls
//to send to Twilio
function handlePlayTag(raw, cache){

  var processed = raw.slice(0)

  if( ~ processed.indexOf("<Play>")){
    var rx = /<Play>(.*?)<\/Play>/g
    var res = rx.exec(processed)
    while(res != null){
      processed = replaceFileURL(processed, res, cache)
      res = rx.exec(processed)
    }
  }

  return processed
}



//Given full string, need to replace occurance of arr[0]
function replaceFileURL(full_string, arr, cache){
  var filename = arr[1]
  var fileId = cache.get(filename)

  if(fileId == null){
    console.log("GOING TO SEARCH FOR FILE")
    fileId = lookupFileName(filename,cache) //then actually perform search and update cache
  }

  var exposed_google_link = 'https://drive.google.com/uc?export=download&id=' + fileId
  var final_link = exposed_google_link.replace(/&/g,'&amp;') //to deal with breaking character '&'


  var replace_str = arr[0].replace(filename,final_link)

  return full_string.replace(arr[0],replace_str)

}



//Given a filename, looks in our folder of audio recordings for that file
//returns it & adds it to cache
function lookupFileName(filename, cache){

  var folder = DriveApp.getFolderById(PRERECORDED_FOLDER_ID) //this is where we store our audio prerecordings with proper permissions
  var search_param = 'title contains "' + filename + '"'
  var files = folder.searchFiles(search_param);

  if(!files.hasNext()) throw new Error("Filename here doesn't exist in drive!")

  var file = files.next()

  cache.put(filename, file.getId())
  return file.getId()
}


function extractNameFromEvent(title){
  var rx = /: (.+?) (19|20)\d{2}-\d{2}-\d{2}.  Created/g
  var res = rx.exec(title)[1]
  return res.toLowerCase().trim();
}


//For debugging purposes, gives complete info about an event
function eventString(events) {

  return events.reduce ? events.reduce(reduce,'') : reduce('', events)

  function reduce(s, event) {
    return s+event.getStartTime()+': '+event.getTitle()+', '+event.getDescription()+'; '
  }
}



//For recognizng from the title, what part of an event should be checked -----
function extractFallbackTags(str){
  var rx = /QUEUED-(\d*?-\d*?) /g
  return getAllMatches(rx,str)
}


function extractQueuedTags(str){
  var rx = /QUEUED-(\d*?) /g
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
//------------------------