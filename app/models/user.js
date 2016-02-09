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
    bcrypt.compare(password, user.get('password'), function(err, result) {
      if(result) {
        req.session.regenerate(function() {
          req.session.user = username; 
          res.redirect('/');
        });
      } else {
        console.log('Wrong password!');
        res.redirect('/login');
      }
    });
  }

});

module.exports = User;