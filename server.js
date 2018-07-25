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
// const hash = require('./js/hash.js');
// database
const mongoose = require('mongoose');
// session
const session = require('express-session');  
const mongoSession = require('connect-mongodb-session')(session);
const passport = require('passport');
const userAuth = require('./js/user_auth.js');

const User = require('./models/User.js');
const Admin = require('./models/Admin.js');
const Key = require('./models/Key.js');
const PasswordReset = require('./models/PasswordReset.js');
// sendmail
const email = require('./js/send_mail.js');

var router = express();
var server = http.createServer(router);

// establish database connection
mongoose.connect(mongoURL);
// create a sessions collection as well
var mongoSessionStore = new mongoSession({
    uri: mongoURL,
    collection: 'sessions'
});

// tell the router (ie. express) where to find static files
router.use(express.static(path.resolve(__dirname, 'www')));

// tell the router to parse JSON data for us and put it into req.body
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// add session support
router.use(session({
  secret: process.env.SESSION_SECRET || 'Houston, We h@ve a pr0b1em!',
  store: mongoSessionStore,
  resave: true,
  saveUninitialized: false
}));
// add passport for authentication support
router.use(passport.initialize());
router.use(passport.session());
userAuth.init(passport);

function guid() {
	function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

router.post('/register', function(req, res) {
	User.findOne({ username: req.body.username })
	.then(function(foundUser) {
		if (foundUser) {
			var msg1 = 'Username is not available or already exists';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		} else {
			var newToken = guid();
			var trial_days = 5;
			var now = new Date();
			var exp = new Date();
			exp.setDate(exp.getDate() + trial_days);
			var newUser = new User({
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				email: req.body.email,
				username: req.body.username,
				//password: hash.createHash(req.body.password)
				password: req.body.password,
				loginToken: newToken, // should be a unique string
				dateRegistered: now, // current time
				key: guid(),
				expiresDate: exp
			});
			
			newUser.save(function(err) {
				if (err) {
					var msg1 = 'Could not be saved';
					console.log(msg1 + ': ' + err);
					res.status(500).send({ msg: msg1 });
				} else {
					console.log('User ' + req.body.username + ' has been registered successfully with Password: ' + req.body.password + ' and Token: ' + newToken);
					res.status(200).send({ token: newToken });
				}
			});
		}
	});
});

router.post('/login', function(req, res) {
	User.findOne({ username: req.body.username })
	.then(function(foundUser) {
		var msg1;
		if (foundUser) {
			if (foundUser.password == req.body.password) {
				console.log('User ' + foundUser.username + ' has logged in successfully with Password: ' + foundUser.password + ' and was given Token: ' + foundUser.loginToken);
				res.status(200).send({ token: foundUser.loginToken });
			} else {
				msg1 = 'Incorrect password';
				console.log(msg1);
				res.status(500).send({ msg: msg1 });
			}
		} else {
			msg1 = 'User not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		}
	});
});

router.post('/passwordreset', (req, res) => {
	User.findOne({ email: req.body.email })
	.then(function(foundUser) {
		if (foundUser) {
			var pr = new PasswordReset();
			pr.email = foundUser.email;
			// pr.password = hash.createHash(req.body.password);
			pr.password = req.body.password;
			pr.expires = new Date((new Date()).getTime() + (20 * 60 * 1000));
			pr.save()
			.then(function(pr) {
				if (pr) {
					email.send(req.body.email, 'Olympia password reset', 'To reset password click here: https://olympia-opryshko.c9users.io/verifypassword?id=' + pr.id);
					res.status(200).send({ msg: 'Check the mail' });
				}
			});
		} else {
			var msg1 = 'User with such email not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });			
		}
	});
});

router.get('/verifypassword', function(req, res) {
	var password;

	PasswordReset.findOne({ id: req.body.id })
	.then(function(pr) {
		if (pr) {
			if (pr.expires > new Date()) {
				password = pr.password;
				// see if there's a user with this email
				return User.findOne({ email: pr.email });
			}
		}
	})
	.then(function(user) {
		if (user) {
			user.password = password;
			return user.save();
		}
	})
	.then(function() {
		PasswordReset.deleteOne({ id: req.body.id })
			.then(function() {
				res.sendfile(path.join(__dirname, 'www', 'passwordReset.html'));
			});
	});
});

router.post('/changename', function(req, res) {
	User.findOne({ username: req.body.username })
	.then(function(foundUser) {
		var msg1;
		if (foundUser) {
			if (foundUser.password == req.body.password) {
				User.updateOne({ username: req.body.username }, { firstName: req.body.firstName, lastName: req.body.lastName }, function(err, res) {
					if (err) throw err;
					console.log("1 record updated");
				});
				User.findOne({ username: req.body.username })
				.then(function(newUser) {
					console.log('User\'s first name and last names were successfully changed to ' + newUser.firstName + ' ' + newUser.lastName);
					res.status(200).send({ firstName: newUser.firstName, lastName: newUser.lastName });
				});
			} else {
				msg1 = 'Incorrect password';
				console.log(msg1);
				res.status(500).send({ msg: msg1 });
			}
		} else {
			msg1 = 'User not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });	
		}
	});
});

router.post('/changeemail', function(req, res) {
	User.findOne({ username: req.body.username })
	.then(function(foundUser) {
		var msg1;
		if (foundUser) {
			if (foundUser.password == req.body.password) {
				User.updateOne({ username: req.body.username }, { email: req.body.email}, function(err, res) {
					if (err) throw err;
					console.log("1 record updated");
				});
				User.findOne({ username: req.body.username })
				.then(function(newUser) {
					console.log('User\'s email was successfully changed to ' + newUser.email);
					res.status(200).send({ email: newUser.email });
				});
			} else {
				msg1 = 'Incorrect password';
				console.log(msg1);
				res.status(500).send({ msg: msg1 });
			}
		} else {
			msg1 = 'User not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		}
		
	});
});

router.post('/changepassword', function(req, res) {
	User.findOne({ username: req.body.username })
	.then(function(foundUser) {
		var msg1;
		if (foundUser) {
			if (foundUser.password == req.body.password) {
				User.updateOne({ username: req.body.username }, { password: req.body.newpassword }, function(err, res) {
					if (err) throw err;
					console.log("1 record updated");
				});
				User.findOne({ username: req.body.username })
				.then(function(newUser) {
					console.log('User\'s password was successfully changed to ' + newUser.password);
					res.status(200).send({	 });
				});
			} else {
				msg1 = 'Incorrect password';
				console.log(msg1);
				res.status(500).send({ msg: msg1 });
			}
		} else {
			msg1 = 'User not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		}
	});
});

router.post('/deleteaccount', function(req, res) {
	User.findOne({ username: req.body.username })
	.then(function(foundUser) {
		var msg1;
		if (foundUser) {
			if (foundUser.password == req.body.password) {
				User.deleteOne({ username: req.body.username })
				.then(function() {
					console.log("1 record deleted");
					console.log('User\'s account was successfully deleted');
					res.status(200).send({	 });
				});
			} else {
				msg1 = 'Incorrect password';
				console.log(msg1);
				res.status(500).send({ msg: msg1 });
			}
		} else {
			msg1 = 'User not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		}
	});
});

router.post('/getkey', function(req, res) {
	User.findOne({ username: req.body.username })
	.then(function(foundUser) {
		var msg1;
		if (foundUser) {
			console.log('User\'s key is ' + foundUser.key + ' expires on ' + foundUser.expiresDate);
			var millis = foundUser.expiresDate.getTime();
			res.status(200).send({ key: foundUser.key, expiresDate: millis });
		} else {
			msg1 = 'User not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		}
	});
});

router.get('/privacypolicy', function(req, res){
	console.log('privacypolicy request');
	res.sendFile(path.join(__dirname, 'www', 'privacyPolicy.html'));
});

router.get('/termsandconditions', function(req, res){
	console.log('termsandconditions request');
	res.sendFile(path.join(__dirname, 'www', 'termsAndConditions.html'));
});

// -----------------------------------------------------------------
//						ADMINISTRATION REQUESTS
// -----------------------------------------------------------------
router.get('/', function(req, res){
	var defaultAdmin = new Admin({
		firstname: 'John',
		lastname: 'Doe',
		username: 'admin',
		password: 'admin'
	});

	Admin.findOne({ username: defaultAdmin.username })
	.then(function(foundUser) {
		if (foundUser) {
			console.log('Default admin already exists');
		} else {
			defaultAdmin.save(function(err) {
				if (err) {
					console.log('Default admin/admin record could not be saved: ' + err);
				} else {
					console.log('Default admin/admin record created');
				}
			});
		}
	});

	res.sendFile(path.join(__dirname, 'www', 'adminPanel.html'));
});

router.post('/admin-login', function(req, res, next) {
	//tell passport to attempt to authenticate the login
	passport.authenticate('login', function(err, user, info) {
		//callback returns here
		if (err){
			//if error, say error
			res.json({isValid: false, message: 'Internal error'});
		} else if (!user) {
			//if no user, say invalid login
			res.json({isValid: false, message: 'Invalid user. Try again.'});
		} else {
			//log this user in
			req.logIn(user, function(err){
				if (!err)
					//send a message to the client to say so
					res.json({isValid: true, message: 'Welcome, ' + user.username + '.'});
			});
		}
	})(req, res, next);
});

router.post('/admin-get-admins', userAuth.isAuthenticated, function(req, res){
	var allAdmins;
	Admin.find({})
	.then(function(admins){
		allAdmins = admins;
		var promises = [];
		allAdmins.forEach(function(user){
			promises.push();
		});
		return Promise.all(promises);
	})
	.then(function(){
		//send them to the client in JSON format
		res.json(allAdmins);
	});
});

router.post('/admin-get-keys', userAuth.isAuthenticated, function(req, res){
	var allKeys;
	Key.find({})
	.then(function(keys){
		allKeys = keys;
		var promises = [];
		allKeys.forEach(function(user){
			promises.push();
		});
		return Promise.all(promises);
	})
	.then(function(){
		//send them to the client in JSON format
		res.json(allKeys);
	});
});

router.post('/admin-get-users', userAuth.isAuthenticated, function(req, res){
	var allUsers;
	User.find({})
	.then(function(users){
		allUsers = users;
		var promises = [];
		allUsers.forEach(function(user){
			promises.push();
		});
		return Promise.all(promises);
	})
	.then(function(){
		//send them to the client in JSON format
		res.json(allUsers);
	});
});

router.post('/admin-add-admin', userAuth.isAuthenticated, function(req, res) {
	Admin.findOne({ username: req.body.username })
	.then(function(foundUser) {
		if (foundUser) {
			var msg1 = 'Username is not available or already exists';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		} else {
			var newUser = new Admin({
				firstname: req.body.firstname,
				lastname: req.body.lastname,
				username: req.body.username,
				password: req.body.password
			});

			newUser.save(function(err) {
				if (err) {
					var msg1 = 'Could not be saved';
					console.log(msg1 + ': ' + err);
					res.status(500).send({ msg: msg1 });
				} else {
					var msg1 = 'Admin ' + req.body.username + ' has been registered successfully with Password: ' + req.body.password;
					console.log(msg1);
					res.status(200).send({ msg: msg1 });
				}
			});
		}
	});
});

router.post('/admin-add-admin', userAuth.isAuthenticated, function(req, res) {
	Admin.findOne({ username: req.body.username })
	.then(function(foundUser) {
		if (foundUser) {
			var msg1 = 'Username is not available or already exists';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		} else {
			var newUser = new Admin({
				firstname: req.body.firstname,
				lastname: req.body.lastname,
				username: req.body.username,
				password: req.body.password
			});

			newUser.save(function(err) {
				if (err) {
					var msg1 = 'Could not be saved';
					console.log(msg1 + ': ' + err);
					res.status(500).send({ msg: msg1 });
				} else {
					var msg1 = 'Admin ' + req.body.username + ' has been added successfully with Password: ' + req.body.password;
					console.log(msg1);
					res.status(200).send({ msg: msg1 });
				}
			});
		}
	});
});

router.post('/admin-modify-admin', userAuth.isAuthenticated, function(req, res) {
	Admin.findOne({ username: req.body.username })
	.then(function(foundUser) {
		if (foundUser) {
			foundUser.firstname = req.body.firstname;
			foundUser.lastname = req.body.lastname;
			foundUser.password = req.body.password;

			foundUser.save(function(err) {
				if (err) {
					var msg1 = 'Could not be saved';
					console.log(msg1 + ': ' + err);
					res.status(500).send({ msg: msg1 });
				} else {
					var msg1 = 'Admin ' + req.body.username + ' record was successfully updated';
					console.log(msg1);
					res.status(200).send({ msg: msg1 });
				}
			});
		} else {
			var msg1 = 'Username was not found';
			console.log(msg1);
			res.status(500).send({ msg: msg1 });
		}
	});
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
	console.log("Olympia ready!");
});
