//since we'll be creating a mongoose model for our post, we need to include the mongoose module
var mongoose = require('mongoose');

//we're building a LIKE object model in mongoose that we'll use elsewhere
module.exports = mongoose.model('Like', {
    userId: String,
    postId: String
});