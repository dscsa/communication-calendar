//deprecated


//
//Check if should process fallbacks for given sid
//two scenarios
//the sid was the only one for a comm-obj, in which case use fallbacks if there are any
//the sid was for one of many parts of acomm-obj, in which case
//check if all other linked sid's have failed
function shouldUseFallbacks(phone_num, cache){
  
  var fallback = pullFromCache(STORED_FALLBACKS,phone_num, cache)
  if(!fallback) return null //no point doing any math in this case
  
  updateCache(STORED_FALLBACKS,phone_num,'',cache) //this is equivalent ot deleting the fallbacks array, so we don't get stuck in a loop or engage fallbacks too much

  var linked_arr = pullFromCache(STORED_LINKED_NUMBERS,phone_num, cache)
  if(!linked_arr) return fallback //then no others to worry about, just return this one
  
  //if it gets here, then there ARE linked numbers, and we need to check if they've all
  //failed too, before we run our own callbacks
  //How do we know if a numbers has failed --> pullFromCache(3,num,cache) will give an empty array
  //Basically, remove each number's fallback from cache until only one remains, and if that fails, it'll trigger callbacks
  linked_arr = linked_arr.split(",")
  
  for(var i = 0; i < linked_arr.length; i++){ //check if all other numbers's have failed
    var temp = pullFromCache(STORED_FALLBACKS,linked_arr[i], cache)
    if(temp){ //then that number hasn't been received & processed yet, so don't process this one
      return null
    }
  }
  //if here, then none of the linked numbers's still have a fallback, so this is the one that needs to do callback, if there is any
  return fallback
}


//Cache each element of array with a linked tag, and the contents being all other values in the array
//Useful for callbacks where you need to be able to know all other values linked with a phone num
function buildConnectedCaches(arr, cache){
  if(arr.length <= 1) return;
  
  for(var i = 0; i < arr.length; i++){
    var current = arr[i]
    var others = arr.slice(0) //so all other phone numbers beside current
    others.splice(i,1)
    others = others.join(",") //make a string of all other elements of arr
    
    updateCache(STORED_LINKED_NUMBERS,current,others,cache)
  }
  
}


