var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({
    firstName: {
        type: String,
        default: ''
    },
    lastName: {
        type: String,
        default: ''
    },
    companyId: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    admin: {
        type: Boolean,
        default: false
    }
}, {
        timestamps: true
    });

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);
