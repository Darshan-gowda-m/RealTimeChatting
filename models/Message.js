const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: String,
    text: String,
    image: String,
    time: String,
    to: String // for direct messaging
});

module.exports = mongoose.model('Message', messageSchema);