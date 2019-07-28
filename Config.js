var LIVE_SOD = 10 //in 24 hr time, the earliest hour we can make calls

var LIVE_EOD = 19 //in 24 hr time, the last hour we can make calls

var MINUTES_BACK_FOR_QUEUE = 5 //look this many minutes back for queued events to check, can be increased, probably shouldn't be decreased

var CONTACTS_CAP = 4 //cap on number of contacts with a particular address/phone in a day, not yet impletemneted

var TWILIO_CONCURRENCY_LIMIT = 100 //limit on how many concurrent tasks we can have stored

var PER_PATIENT_EVENT_LIMIT = 4
