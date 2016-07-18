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

    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]

        //comment
        let sender = event.sender.id
        if (event.message && event.message.text) {
            console.log("here")
            let text = event.message.text
            console.log(text)
            sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
        }
    }
    res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})
