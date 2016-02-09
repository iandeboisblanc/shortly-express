var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',

  constructor: function() {
    db.Model.apply(this, arguments);
    var password = this.get('password');
    bcrypt.hash(password, null, null, function(err, hash) {
      if(err) {
      } else {
        this.set('password', hash);
      }
    }.bind(this));
  }
});

module.exports = User;