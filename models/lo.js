const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var logisticsObject = new Schema({
    logisticsObject: {
        type: Object,
        required: true
    },
    companyId: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    loId: {
        type: String,
        required: true
    }
}, {
        timestamps: true
    });

var Logobs = mongoose.model('Lo', logisticsObject);

module.exports = Logobs;