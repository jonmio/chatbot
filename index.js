'use strict'

//dependancies
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()


//Send message using graph api
function sendTextMessage(sender, reply) {
    let messageData = { text:reply }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

//set port
app.set('port', (process.env.PORT || 3000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

//only used once to config with facebook apps
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'qwerty123') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

//responding to received messages
app.post('/webhook/', function (req, res) {
  //req.body.entry has only 0 as key if events are not batched
    console.log("***************************** WEB HOOK PoST*****************")

    //handling messaging events
    let messaging_events = req.body.entry[0].messaging
    //messaging events has attributes id,time,messaging
    //usually four post requets 1) message, 2) reply 3) Confirmation of delivery 4) read recepit
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        console.log(Object.keys(event))
        let sender = event.sender.id
        res.sendStatus(200)
        //check if it is a message event taht is not a reply the server sent
        if (event.message && event.message.text && (event.message.is_echo != true)) {
            console.log(Object.keys(event.message))
            console.log(event.message.seq)
            console.log(event.message.mid)
            let text = event.message.text
            console.log(text)
            //300 char length cap
            sendTextMessage(sender, "Text received, echo:" + text.substring(0, 300))
        }
    }

})

const token = process.env.FB_PAGE_ACCESS_TOKEN

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})
