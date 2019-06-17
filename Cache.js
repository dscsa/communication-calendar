//For the cache functionality, keep these index values

//Caching is built around phone numbers, with an array of relavant info for each num
//[callTextTwiML || '', cal_id, event_id, fallbacks, associated_phone_nums]
//code is index in the cache_arr
//0 for calltext
//1 for cal_id
//2 for event_id
//3 for fallbacks
//4 for associated_phone_nums  --> comma separated



//TODO:
//0 for call text
//1 for sid

//Global variables 
var STORED_TWIML = 0
var STORED_MESSAGE_SID = 1
var STORED_CALL_SID = 2



function updateCache(code,phone_num,content,cache){
  var cache_arr = cache.get(phone_num)
  
  cache_arr = cache_arr == null ? ['','',''] : cache_arr.split("#|#")
  
  cache_arr[code] = content
  
  cache.remove(phone_num)
  cache.put(phone_num, cache_arr.join("#|#")) //just aweird joiner so we don't risk splitting fallbacks --> can't use commas for this reason, and don't want to limit other code from using pipe
}


//some parts of cache_arr have comma, so join them differently? --> with #|# <-- just because it's a unique string

//Pulls a particular part of the cache array for a given phone number
//same indices for code as updateCache
function pullFromCache(code,phone_num, cache){
  var cache_arr = cache.get(phone_num)
  
  cache_arr = cache_arr == null ? ['','',''] : cache_arr.split("#|#")
  
  return cache_arr[code]  
  
}



function clearCache(phone_num, cache){
  cache.remove(phone_num)
}


//For spamming, just a little abstraction over the tags here
function getContactHistory(addr,cache){
  return cache.get(addr + "-HISTORY")
}

function updateContactHistory(addr,contact_history,cache){
  cache.put(addr + "-HISTORY",contact_history,4*60*60) //still store in case we come back again, and track each spam attempt
}




