
'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var db;
const CONNECTION_STRING = process.env.DB;
var ObjectId = require('mongodb').ObjectID;


module.exports = function (app) {

  MongoClient.connect(CONNECTION_STRING, function (err, dbo) {
    if (err) {
      console.log('Error connecting db', err);
    } else {
      console.log('Database Connected');
      db = dbo.db('MessageBoards');
    }
  });


  app.route('/api/threads/:board')
    .get(function (req, res) {
      var board = req.params.board;

      db.collection('Threads').find({ board: board }, { "sort": ["bumped_on", "asc"] }).limit(10).toArray(function (err, result) {
        if (err) throw err;

        result = result.map(x => {

          return {
            board: x.board,
            text: x.text,
            created_on: x.created_on,
            bumped_on: x.bumped_on,
            replies: x.replies.slice(1, 3)
          }

        });
        res.json(result);
      });


      // collection.find({}, {"sort" : ['datefield', 'asc']} ).toArray(function(err,docs) {});




    })
    .post(function (req, res) {
      var board = req.params.board;
      var text = req.body.text;
      var delete_password = req.body.delete_password;

      var obj = {};
      obj.board = board;
      obj.text = text;
      obj.delete_password = delete_password;
      obj.created_on = new Date();
      obj.bumped_on = new Date();
      obj.reported = false;
      obj.replies = [];

      db.collection('Threads').insert(obj);
      res.redirect("/b/" + board);
    })
    .put(function (req, res) {
      var board = req.params.board;

      var thread_id = req.body.thread_id;

      db.collection('Threads').update({
        _id: ObjectId(thread_id)
      },
        {
          $set: { reported: true }
        });

      res.json("Success");

    })
    .delete(function (req, res) {
      var board = req.params.board;
      var threadId = req.body.thread_id;
      var delete_password = req.body.delete_password;

      if (delete_password && threadId) {
        db.collection('Threads').remove({
          _id: ObjectId(threadId),
          delete_password: delete_password
        }, function (err, results) {
          if (results.result.n > 0) {
            res.json("Success");
          } else {
            res.json("Invalid password or id");
          }
        });
      }
    });

  app.route('/api/replies/:board')
    .get(function (req, res) {
      var board = req.params.board;
      var threadId = req.query.thread_id;

      db.collection('Threads').find({ _id: ObjectId(threadId) }, { "sort": ["bumped_on", "asc"] }).toArray(function (err, result) {
        if (err) throw err;

        result = result.map(x => {

          return {
            board: x.board,
            text: x.text,
            created_on: x.created_on,
            bumped_on: x.bumped_on,
            replies: x.replies
          }

        });
        res.json(result);
      });

    })
    .post(function (req, res) {
      var board = req.params.board;
      var text = req.body.text;
      var delete_password = req.body.delete_password;
      var threadId = req.body.threadId;

      var reply = {
        _id: new ObjectId(),
        text: text,
        delete_password: delete_password,
        threadId: threadId,
        created_on: new Date(),
        reported: false
      };
      console.log(reply);
      db.collection('Threads').update({ _id: ObjectId(threadId) }, {
        $push: { replies: reply },
        $set: { bumped_on: new Date() }
      });

      res.redirect("/b/" + board + "/" + threadId + "");
    })
    .put(function (req, res) {
      var board = req.params.board;

      var thread_id = req.body.thread_id;
      var reply_id = req.body.reply_id;

      db.collection('Threads').updateOne(
        {
          _id: ObjectId(thread_id),
          replies: { $elemMatch: { _id: ObjectId(reply_id) } }
        },
        {
          $set: { "replies.$.reported": true }
        }
      );

      res.json('Success');

    })
    .delete(function (req, res) {
      var board = req.params.board;

      var thread_id = req.body.thread_id;
      var delete_password = req.body.delete_password;

      db.collection('Threads').update({
        _id: ObjectId(thread_id),
        delete_password: delete_password
      },
        {
          $set: { text: "[deleted]" }
        }, function (err, results) {
          if (results.result.n > 0) {
            res.json("Success");
          } else {
            res.json("Invalid password or id");
          }
        });
    });
};
