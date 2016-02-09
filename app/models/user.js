var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
Promise.promisifyAll(bcrypt);


var User = db.Model.extend({
  tableName: 'users',

  constructor: function() {
    db.Model.apply(this, arguments);
    var password = this.get('password');
    bcrypt.hashAsync(password, null, null)
    .then(function(hash) {
      this.set('password', hash);
    }.bind(this))
    .catch(function(err) {
      console.log('ERROR HASHING PASWWORD!!!!!!!!!!!!!', err);
    });
  },

  isValidPassword: function(password) {
    return bcrypt.compareAsync(password, this.get('password'))
    .then(function(result) {
      if(result) {
        return true;
      } else {
        throw new Error('Invalid password');
      }
    });
  }

});

module.exports = User;