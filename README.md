# Communication-Calendar

Google scripts file that treats Google Calendar as an outbound communication tool. By adding events to the tracked Calendar, users can schedule phone calls, sms texts, emails, or faxes.


## Set-Up

Git clone this project. Clasp init that folder, and clasp push to your server.

## Running

Main() triggers every minute. Checks all calendar events for the last minute. Looks to the description field for a comm-array.

If events exist outside of SOD & EOD bounds, will push them to the next appropriate SOD on same calendar.

## Comm-Arrays & Comm-Objects


Comm-Array: An array of comm-objects

Comm-Objects: A JSON with information for an outbound contact. Can be:

      - Phone object:

            - Requires a 'message' field

            - If there is a 'sms' field, the number(s) there will receive the 'message'

            - If there is a 'call' field, the number(s) there will receive a call with robovoice reading 'message'

                   - If only contains 'call' field, then 'message' can serve TwiML.

                         - Can include direct TwiML as found here: https://www.twilio.com/docs/voice/twiml
                          - For <Play> tags, will be processed a bit before sending: Instead of a url between <Play> and </Play>, put the name of an audio file that lives in the PRERECORDED_FOLDER_ID folder on GDrive. MUST have public web permissions.

                             Example: <Play>Recording_1</Play> would look to the folder for a file with name Recording_1.


      - Email object:

             - Can include 'cc' and 'bcc' fields

             - The contents of 'message' field will be sent to the address(es) in 'email'

             - Can be given a 'from' field which can either be an email, or structured as "Name <email>" if you want the email info to list a particular name

             - Requires 'message', 'email, 'subject' fields for bare minimum

             - 'message' field can be HTML (so use <br> tags for newlines, or other formatting, bold, italic, etc)

             - An 'attachments' field with a string of comma-separate GDrive file IDs that will be attached

      - Fax object: TBD

Fallbacks: Any comm-object can have a 'fallbacks' property, which is a Comm-Arr that will be processed if the parent object fails

## Components

### Main

The main function, that can be set to trigger regularly.

### TextWork

Handles parsing of comm-arrays and comm-objects, any string work, regex cleaning should be contained here.

### GCal

Helper functions related to the Google Calendar (creating events, shifting events, gathering events, copying calendars, marking events)

### Twilio requests

Three functions that can be sent to Twilio, sendSMS, sendCall, and fetchResource (that checks status given sid & type of communciation). Handles building request and fetching.

### WebApp

doGet function that defines the WebApp. This will need to be deployed from within script editor. Necessary for Twilio integration. GET serves up TwiML code for calls, and handles any errors witht he call service.

### Helpers

Helper functions (misc)

### Testing

Set up a test Google Sheet, deploy and set up the Key.gs with necessary constants / secret keys.

1) Run a trigger for calendarCopier() <-- this will sync up a test calendar with the live calendar, so you can run side-by-side
2) Make sure LIVE_MODE in the test sheet is set to false
3) Make sure main() is pulling from TEST_CAL_ID and not SECURE_CAL_ID


### Audio Playing

MVP of using pre-recorded audio. Useful for debugging or development, nothing in production
