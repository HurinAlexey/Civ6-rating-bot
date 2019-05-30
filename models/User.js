const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    discordId: {
        type: String,
        required: true,
        unique: true
    },
    ratingScore: {
        type: Number,
        default: 1500
    },
    rank: {
        type: Number,
        default: 5
    }
});

module.exports = mongoose.model('users', userSchema);