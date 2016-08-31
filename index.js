'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const MongoClient = require('mongodb').MongoClient;
var db;

MongoClient.connect("mongodb://localhost:27017/chatbot", function(err,database){
  if (err) return console.log(err);
  db = database;
  db.collection("users").updateMany({},{$set: {status: "free"}})
  console.log("connected to db");
});


function numUsers(callback){
  db.collection("users").find(function(err,r){
    if (err) return console.log(err);
    return r
  })
}

function fiveRandomUsers(){
  db.collection("users").count(function(err,count){
    users = []
    for (i=0; i<5; i++){
      users.push(Math.floor(Math.random()*count))
    }
  })
}

function typeOfEvent(event){

  if (event.message && event.message.attachments){
    return "MultiMedia"
  }
  //check if it is a message event taht is not a reply the server sent
  else if (event.message && event.message.text && (event.message.is_echo != true) && !event.delivery) {
    return "Message"
  }
  else if (event.postback && event.postback.payload === "Get Started"){
    return "Get Started"
  }
};

function sendTextMessage(sender, reply) {
  let messageData = { text:reply };
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
      console.log('Error sending messages: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
};

function sendImage(person, imageData) {
  request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token:token},
      method: 'POST',
      json: {
        recipient: {id:person},
        message: {attachment: imageData[0]}

      }, function(error, response, body) {
        if (error) {
          console.log('Error sending messages: ', error);
        } else if (response.body.error) {
          console.log('Error: ', response.body.error);
        }
    }
  });
};

//set port
app.set('port', (process.env.PORT || 8000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());


app.post('/webhook/', function (req, res) {

  for (let i=0; i < req.body.entry.length; i++){
    let messaging_events = req.body.entry[i].messaging;
    //messaging events has attributes id,time,messaging
    //usually four post requets 1) message, 2) reply 3) Confirmation of delivery 4) read recepit
    for (let j = 0; j < messaging_events.length; j++) {
      let event = req.body.entry[i].messaging[j];
      let sender = event.sender.id;

      switch(typeOfEvent(event)){
        case "Message":
          let text = event.message.text;
          sendTextMessage(sender, "Text received, echo:" + text.substring(0, 300));
          break;
        case "MultiMedia":
          // db.collection("users").findOneAndUpdate({facebook_id: sender},{$set: {"status" : "waiting"}})
          db.collection("users").find({status:"free"}).toArray(function(err,potentialPeople){
            if (err) return console.log(err);
            console.log(potentialPeople)
            var lenPotential = potentialPeople.length
            var numPoll = lenPotential > 5 ? 5: lenPotential
            var selected = 0;
            var rand;
            var temp;
            var person;
            while (selected < numPoll){
              rand = Math.floor(Math.random()*lenPotential)
              temp = potentialPeople[rand]
              potentialPeople[rand] = potentialPeople[lenPotential]
              potentialPeople[lenPotential] = temp
              person = potentialPeople.pop()
              sendTextMessage(person.facebook_id, "Someone needs your help! How does this look?");
              sendImage(person.facebook_id, event.message.attachments);
              selected += 1
              lenPotential = potentialPeople.length
            }
          })
        break;
        case "Get Started":
          db.collection("users").count({facebook_id: sender}, function(err,r){
            if (err) return console.log(err);
            if (r === 0){
              sendTextMessage(sender, "Hey there! Just send us a picture of your outfit anytime and we'll tell you how you look and get you some feedback!");
              db.collection("users").count(function(error,result){
                if (error) return console.log(error)
                db.collection("users").insertOne({facebook_id: sender, status: "free", _id: result});
              })
            }
          })
          break;

      }
    }
  }
  res.sendStatus(200);
});

const token = process.env.FB_ACCESS_TOKEN

app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'));
})

// Index route
app.get('/', function (req, res) {
  console.log(numUsers())

  res.send('Hello world, I am a chat bot');
})

//only used once to config with facebook apps
app.get('/webhook/', function (req, res) {
  console.log(token)
  console.log(process.env.VERIFY_TOKEN)
  if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
      res.send(req.query['hub.challenge']);
  }
  else {
    res.send('Error, wrong token');
  }
})
