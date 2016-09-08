const request = require('request');
const token = process.env.FB_ACCESS_TOKEN
const db = require("./mongo.js").getDb()

function processFeedbackEndConversation(recipient, text){
  saveFeedback(recipient, text);
  endConversation(recipient);
}

function saveFeedback(sender, text){
  db.collection("users").updateOne({"fashionTeam.teammateId" : sender},{$set: {"fashionTeam.$.feedback" : text}})
}

function endConversation(sender){
  db.collection("users").updateOne({facebook_id: sender},{$set: {status: "free"}})
  sendTextMessage(sender, "Great! Thanks for your help!")
}


function promptDetails(sender){
  db.collection("users").updateOne({facebook_id: sender},{$set: {status: "writing feedback"}})
  sendTextMessage(sender, "Awesome! Send me your feedback in your next message.")
}


function askForDetails(sender, score){
  db.collection("users").updateOne({"fashionTeam.teammateId" : sender},{$set: {"fashionTeam.$.score" : score}})
  sendYesNoFeedBack(sender);
};

function sendYesNoFeedBack(recipient){
  let messageData = {
  "attachment":{
    "type":"template",
    "payload":{
      "template_type":"button",
      "text":"Thanks for your feedback! Do you have any specific comments you'd like to add?",
      "buttons":[
        {
          "type":"Postback",
          "title":"Yes",
          "payload": "Yes"
        },
        {
          "type":"postback",
          "title":"No",
          "payload": "No"
        }
        ]
      }
    }
  }
  send(recipient, messageData)
}

function send(recipient, messageData){
  request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:recipient},
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



function forwardImageAndWait(feedbackPerson, image){
  acknowledgeImage(feedbackPerson);
  sendtoRandomPeople(feedbackPerson, image);
  waitforResponse(feedbackPerson);
}
function acknowledgeImage(person){
  sendTextMessage(person, "I'm on it! I'll reply within ten minutes with feedback!");
  db.collection("users").updateOne({facebook_id: person},{$set: {status: "waiting feedback"}})
}

function sendtoRandomPeople(feedbackPerson, image){
  db.collection("users").find({status:"free"}).toArray(function(err,potentialPeople){
    if (err) return console.log(err);
    var selected = 0, team = [], rand, temp, fid, person, lenPotential = potentialPeople.length, numPoll = lenPotential > 5 ? 5: lenPotential;
    while (selected < numPoll){
      rand = Math.floor(Math.random()*lenPotential);
      temp = potentialPeople[rand];
      potentialPeople[rand] = potentialPeople[lenPotential];
      potentialPeople[lenPotential] = temp;
      person = potentialPeople.pop();
      fid = person.facebook_id
      sendGBButton(fid);
      sendImage(fid, image);
      selected += 1;
      lenPotential -= 1;
      db.collection("users").updateOne({facebook_id: person.facebook_id}, {$set: {status: "polling"}})
      team.push({teammateId: fid, score: null, feedback: null})
    }
    db.collection("users").updateOne({facebook_id: feedbackPerson},{$set: {fashionTeam: team}})
  })
}

function waitforResponse(feedbackPerson){
  setTimeout(function(feedbackPerson){
    db.collection("users").findOne({facebook_id: feedbackPerson},function(err,person){
      if (err) return console.log(err)
      var total_replies = 0, score = 0, comments = []
      person.fashionTeam.forEach(function(fashionTeammate){
        if (fashionTeammate.score != null){
          score += fashionTeammate.score
          total_replies += 1
        }
        if (fashionTeammate.feedback != null){
          comments.push(fashionTeammate.feedback);
        }

      })
      score = (score/total_replies).toFixed(1)
      giveFeedback(feedbackPerson, score, comments)
      endPoll(feedbackPerson);
    })
  },60000, feedbackPerson)
  // },600000, feedbackPerson)
}
function endPoll(person){
  db.collection("users").findOne({facebook_id: person},function(err,r){
    if (err) return console.log(err);
    var fid;
      r.fashionTeam.forEach(function(teammate){
        fid = teammate.teammateId
        if (teammate.status !== "free"){
          sendTextMessage(fid, "The poll has now ended.")
          db.collection("users").updateOne({facebook_id: fid},{$set: {status: "free"}})
        }
      })
      db.collection("users").updateOne({facebook_id: person}, {$unset: {fashionTeam:""}, $set: {status: "free"}})
  })
}

function giveFeedback(person, score, comments){
  var msg = "So I've asked around, and people rated your last outfit a " + score+ " out of 5!"
  comments.length > 0 ? (msg += " Here's some specific feedback people gave.") : null
  sendTextMessage(person, msg)
  comments.forEach(function(feedback){
    sendTextMessage(person, feedback)
  })
}


function greetAndCreateNewUser(user){
  sendTextMessage(user, "Hey there! Just send me a picture of your outfit anytime and I'll tell you how you look and get you some feedback!");
  processNewUser(user);
}

function processNewUser(user){
  db.collection("users").count({facebook_id: user}, function(err,r){
    if (err) return console.log(err);
    if (r === 0){
      db.collection("users").insertOne({facebook_id: user, status: "free"});
    }
  })
}

function sendFollowupGood(recipient){
  let messageData = {
  "attachment":{
    "type":"template",
    "payload":{
      "template_type":"button",
      "text":"Do you think the outfit is just great or freakin' awesome?",
      "buttons":[
        {
          "type":"Postback",
          "title":"Great",
          "payload":4
        },
        {
          "type":"postback",
          "title":"Awesome",
          "payload": 5
        }
        ]
      }
    }
  }
  send(recipient, messageData)
}

function sendFollowupBad(recipient){
  let messageData = {
  "attachment":{
    "type":"template",
    "payload":{
      "template_type":"button",
      "text":"Do you think the outfit is just not great or absolutely terrible?",
      "buttons":[
        {
          "type":"Postback",
          "title":"Not Great",
          "payload":2
        },
        {
          "type":"postback",
          "title":"Terrible",
          "payload": 1
        }
        ]
      }
    }
  }
  send(recipient, messageData)
}
function sendGBButton(sender){
  let messageData = {
  "attachment":{
    "type":"template",
    "payload":{
      "template_type":"button",
      "text":"Someone really needs your help? Can you tell us what you think of this outfit?",
      "buttons":[
        {
          "type":"Postback",
          "title":"Good",
          "payload":"Good"
        },
        {
          "type":"postback",
          "title":"Acceptable",
          "payload": 3
        },
        {
          "type":"postback",
          "title":"Bad",
          "payload":"Bad"
        }
        ]
      }
    }
  }
  send(sender, messageData)
}

function sendTextMessage(recipient, reply) {
  let messageData = { text:reply };
  send(recipient, messageData)
}


exports.processFeedbackEndConversation = processFeedbackEndConversation
exports.forwardImageAndWait = forwardImageAndWait
exports.greetAndCreateNewUser = greetAndCreateNewUser
exports.sendFollowupGood = sendFollowupGood
exports.sendFollowupBad = sendFollowupBad
exports.promptDetails = promptDetails
exports.endConversation = endConversation
exports.askForDetails = askForDetails
exports.sendTextMessage = sendTextMessage
