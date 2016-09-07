const Misc = require("./actions.js")
const validScores = {1: true, 2:true, 3:true, 4:true, 5:true}
const db = require("./mongo.js").getDb();

var handle = function(event){
  let sender = event.sender.id;
  if (event.message){
    if(event.message.text){
      db.collection("users").findOne({facebook_id: sender}, function(err, docs){
        if (err) return console.log(err);
        if (docs){
          if (docs.status === "writing feedback") return Misc.processFeedbackEndConversation(sender, event.message.text);
          if (docs.status === "free") return Misc.sendTextMessage(sender, "Although I'd love to chat with you, I can only process images of your outfit.")
          if (docs.status === "waiting feedback") return Misc.sendTextMessage(sender, "I'll have your feedback ready in a few minutes.")
          if (docs.status === "polling") return Misc.sendTextMessage(sender, "Please use the buttons to respond.")
        }
      })
    }

    else if (event.message.attachments){
      db.collection("users").findOne({facebook_id: sender}, function(err, docs){
        if (err) return console.log(err);
        if (docs.status === "free") return Misc.forwardImageAndWait(sender, event.message.attachments);
        if (docs.status === "writing feedback") return Misc.sendTextMessage(sender, "Sorry, I can only process text-based feedback.")
        if (docs.status === "waiting feedback") return Misc.sendTextMessage(sender, "I'll have your feedback ready in a few minutes. Unfortunately, we can't process images in the meantime.")
        if (docs.status === "polling") return Misc.sendTextMessage(sender, "Please finish the poll first before we process your image by using the buttons to respond.")

      })
    }
  }

  else if (event.postback && event.postback.payload){
    if (event.postback.payload === "Get Started") return Misc.greetAndCreateNewUser(sender);

    db.collection("users").findOne({facebook_id: sender, status:"polling"},function(err,r){
      if (err) return console.log(err);
      if (r){
        if (event.postback.payload in validScores) return Misc.askForDetails(sender, event.postback.payload)
        switch (event.postback.payload){
          case "Good":
            return Misc.sendFollowupGood(sender);
          case "Bad":
            return Misc.sendFollowupBad(sender);
          case "Yes":
            return Misc.promptDetails(sender);
          case "No":
            return Misc.endConversation(sender);
        }
        return Misc.sendTextMessage(sender, "This button is no longer valid...")
      }
    })
  }

  //postback trolls
  // else{
  //   db.collection("users").findOne({facebook_id: sender},function(err,r){
  //     switch (r.status){
  //       case "free":
  //         return sendTextMessage(sender, "The button you clicked is no longer valid.")
  //       case "waiting feedback":
  //         return sendTextMessage(sender, "The button you clicked is no longer valid, but we'll give you feedback on your outfit in a couple minutes. We're waiting on a few responses!")
  //       case "writing feedback":
  //         return sendTextMessage(sender, "The button you clicked is no longer valid. We can only process text-based feedback.")
  //     }
  //   })
  // }
}

exports.handle = handle;
