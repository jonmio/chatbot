'use strict'

const mongo = require("./mongo.js");

mongo.connect(function(err){
  if (err) return console.log(err);

  const express = require('express');
  const bodyParser = require('body-parser');
  const app = express();
  const handler = require("./handler.js")

  app.set('port', (process.env.PORT || 8000));
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  app.post('/webhook/', function (req, res) {
    for (let i=0; i < req.body.entry.length; i++){
      let messaging_events = req.body.entry[i].messaging;
      for (let j = 0; j < messaging_events.length; j++) {
        let event = messaging_events[j];
        handler.handle(event);
      }
    }
    res.sendStatus(200);
  });


  app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
  });

  app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot');
  });

  app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    }
    else {
      res.send('Error, wrong token');
    }
  });
});
