'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

function sendTextMessage(sender, reply) {
    // console.log ("inside sendTextMessage")
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

app.set('port', (process.env.PORT || 3000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
  // console.log("inside root")
    res.send('Hello world, I am a chat bot')

})

app.get('/webhook/', function (req, res) {
  // console.log("get @webhook")
    if (req.query['hub.verify_token'] === 'qwerty123') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

app.post('/webhook/', function (req, res) {
    // console.log("post webhook")
    console.log(req.body+'*********')
    console.log(req.body.entry+'*********')
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
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
