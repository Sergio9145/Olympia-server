//
// Olympia Capstone Project
// by Sergiy Opryshko
//

const mongoURL = 'mongodb://olympia_user:olympia_382@ds133570.mlab.com:33570/olympia_db';

// 'require' statements -- this adds external modules from node_modules or our own defined modules
const http = require('http');
const path = require('path');
// express related
const express = require('express');
const bodyParser = require('body-parser');
const hash = require('./js/hash.js');
// database
const mongoose = require('mongoose');
const User = require('./models/User.js');
const PasswordReset = require('./models/PasswordReset.js');
// sendmail
const email = require('./js/send_mail.js');

var router = express();
var server = http.createServer(router);

// establish database connection
mongoose.connect(mongoURL);

// tell the router (ie. express) where to find static files
router.use(express.static(path.resolve(__dirname, 'www')));

// tell the router to parse JSON data for us and put it into req.body
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.post('/register', function(req, res) {
    var post = req.body;

    var newUser = new User({
        firstName: post.firstName,
        lastName: post.lastName,
        email: post.email,
        username: post.username,
        //password: hash.createHash(post.password)
        password: post.password,
        date: new Date(), // current time
        key: "42" // to be decided later
    });

    newUser.save(function(err) {
      if (err) {
		var msg1 = 'Something went wrong on the server';
        console.log(msg1 + ': ' + err);
        res.status(500).send({ msg: msg1 });
      } else {
		var msg2 = 'User ' + post.username + ' has been registered successfully';
        console.log(msg2 + '. Password: ' + post.password);
        res.status(200).send({ msg: msg2 });
      }
    });
});

router.post('/login', function(req, res) {
    var post = req.body;

    var currentUser = new User({
      username: post.username,
      //password: hash.createHash(post.password)
      password: post.password
    });

    User.findOne({ username: currentUser.username })
    .then(function(user){
        if (user.password == currentUser.password) {
	        var msg1 = 'User has logged in successfully';
	        console.log(msg1);
	        res.status(200).send({ msg: msg1 });
        } else {
			var msg2 = 'Incorrect password';
            console.log(msg2);
            res.status(400).send({ msg: msg2 });
        }
    });
});

router.post('/passwordreset', (req, res) => {
    Promise.resolve()
    .then(function(){
        // see if there's a user with this email
        return User.findOne({ email: req.body.email });
    })
    .then(function(user){
      if (user){
        var pr = new PasswordReset();
        pr.email = user.email;
        // pr.password = hash.createHash(req.body.password);
        pr.password = req.body.password;
        pr.expires = new Date((new Date()).getTime() + (20 * 60 * 1000));
        pr.save()
        .then(function(pr){
          if (pr){
            email.send(req.body.email, 'Olympia password reset', 'To reset password click here: https://olympia-opryshko.c9users.io/verifypassword?id=' + pr.id);
            res.status(200).send({ msg: 'Check the mail' });
          }
        });
      }
    });
});

router.get('/verifypassword', function(req, res){
    var password;
    
    Promise.resolve()
    .then(function(){
      return PasswordReset.findOne({id: req.body.id});
    })
    .then(function(pr){
      if (pr){
        if (pr.expires > new Date()){
          password = pr.password;
          // see if there's a user with this email
          return User.findOne({ email: pr.email });
        }
      }
    })
    .then(function(user){
      if (user){
        user.password = password;
        return user.save();
      }
    })
    .then(function(){
		res.sendfile(path.join(__dirname, 'www', 'passwordReset.html'));
    })
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  console.log("Olympia ready!");
});
