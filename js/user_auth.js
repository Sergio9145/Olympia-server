const Admin = require('./../models/Admin.js');
const LocalStrategy = require('passport-local').Strategy;
// const hash = require('./../js/hash.js');

//encapsulate initialization of the passport functionality
module.exports.init = function(passport){
	// Passport needs to be able to serialize and deserialize users to support persistent login sessions
    passport.serializeUser(function(user, callback) {
        // console.log('serializing user: ' + user.username);
        callback(null, user._id);
    });

    passport.deserializeUser(function(id, callback) {
        Admin.findById(id, function(err, user) {
            // console.log('deserializing user: ' + user.username);
            callback(err, user);
        });
    });

    //set up the login handler
    passport.use('login', new LocalStrategy(handleLoginAttempt));
    //set up the signup handler
	passport.use('signup', new LocalStrategy(handleSignupAttempt));
};

//encapsulate validating whether this session has an authenticated user
module.exports.isAuthenticated = function (req, res, next) {
    // console.log('Check if we have an authenticated user:');
	// if user is authenticated in the session 
	if (req.isAuthenticated()) {
	    // console.log('User is authenticated!');
        //allow them to proceed
        next();
    }
};

//passport will call this function when someone attempts to log in
function handleLoginAttempt(username, password, cb){
    //don't log user's passwords in plain text to the console in production
    console.log('handleLoginAttempt: username: ' + username + ' password: ' + password);
    
    Promise.resolve()
    .then(function(){
        //see if there's a user with this username
        return Admin.findOne({'username' : username});
    })
    .then(function(user){
        var param = false;
        //if the user exists and the hash of the password provided matches
        if (user && password == user.password) //&& hash.isValid(user, password)
            //return the user object
            param = user;
        //execute the callback with appropriate parameters
        cb(null, param);
    })
    .catch(function(err){
        //even if something went wrong, we still need to call the callback
        console.log('handleLoginAttempt: exception: ' + err);
        cb(err);
    });
}

//passport will call this function when someone attempts to join
function handleSignupAttempt(username, password, cb){
    //don't log user's passwords in plain text to the console in production
    console.log('handleSignupAttempt: username: ' + username + ' password: ' + password);
    
    Promise.resolve()
    .then(function(){
        //see if there's a user with this username
        return Admin.findOne({'username' : username});
    })
    .then(function(user){
        //if the user does not exist
        if (!user){
            //we can safely create one
            //storing a hash of the password
            Promise.resolve()
            .then(function(){
                user = new Admin();
                user.username = username;
                user.password = password; //hash.createHash(password);
                return user.save();
            })
            .then(function(user){
                //execute the callback with appropriate parameters
                console.log('User ' + user.username + ' created');
                cb(null, user);
            });
        } else {
            cb(null, false);
        }
    })
    .catch(function(err){
        //even if something went wrong, we still need to call the callback
        console.log('handleSignupAttempt: exception: ' + err);
        cb(err);
    });
}
