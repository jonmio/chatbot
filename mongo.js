var MongoClient = require( 'mongodb' ).MongoClient;
var _db;

module.exports = {

  connect: function(callback){
    MongoClient.connect("mongodb://localhost:27017/chatbot", function(err,database){
      _db = database;
      _db.collection("users").updateMany({},{$set: {status: "free"}});
      return callback(err);
    });
  },

  getDb: function() {
    return _db;
  }
};
