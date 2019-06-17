var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var subscription = new Schema({
  companyId: {
    type: String,
    required: true
  },
  subscriptionEndpoint: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
    timestamps: true
  });

var Subscription = mongoose.model('Subscription', subscription);

module.exports = Subscription;