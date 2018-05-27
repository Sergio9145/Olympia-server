//since we'll be creating a mongoose model for our post, we need to include the mongoose module
var mongoose = require('mongoose');

//we're building a POST object model in mongoose that we'll use elsewhere
module.exports = mongoose.model('Post', {
   userId: String, //_id from the user table
   image: String, //url to image file
   comment: String, //poster's comment
   likeCount: Number, //number of likes (convenience value)
   feedbackCount: Number //number of comments from others (convenience value)
});
