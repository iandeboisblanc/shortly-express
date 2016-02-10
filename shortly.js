var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var http = require("http");
var https = require("https");

var app = express();

var getGitHub = function(token, callback) {
  var options = { 
    host: 'https://api.github.com',
    path: 'user?access_token=' + token,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Shortly',
    }
  };
  https.request(options, function(res) {
    var body = '';
    res.on('data', function(data) {
      body += data;
    });
    res.on('end', function() {
      console.log('Response:', body);
      callback(null, body);
    });
  }).on('error', function(err) {
    console.log('Error: ', err);
  });
};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret: 'secrets secrets are no fun'}));
app.use(express.static(__dirname + '/public'));

app.use(passport.initialize());
app.use(passport.session());

passport.use('provider', new OAuth2Strategy({
  authorizationURL: 'https://github.com/login/oauth/authorize',
  clientID: '1a23ca155ecda249c0e9',
  tokenURL: 'https://github.com/login/oauth/access_token',
  clientSecret: 'bbcfffc10c3a2172ef9524205c3b6bab0a0b675a',
  callbackURL: 'http://localhost:4568/auth/provider/callback',
}, function(token, tokenSecret, profile, done) {
  console.log(arguments);
  console.log("about to request github");
  getGitHub(token, function(err,data) {
    console.log("\n\n Returned from server ", err,data);
  });
  new User({username:'GitHubUser', password:'dontmatta23423q4123r1  23r23r2'})
    .save()
    .then(function(user) {
      done(null, user);
    });   
}));

passport.use(new LocalStrategy(function(username, password, done) {
  Users.query({where: {username: username}})
  .fetchOne()
  .then(function(user) { 
    return user.isValidPassword(password)
            .then(function(result) {
              return done(null,user);
            })
            .catch(function(err) {
              return done(null, false, {message:"invalid password"});
            });
  })
  .catch(function(err) {
    return done(null, false, {message: "invalid username"});
  });
})
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Users.query({where: {id: id}})
  .fetchOne()
  .then(function(user) {
    done(null, user);
  })
  .catch(function(err) {
    done(err, null);
  });
});


var restrict = function(req, res, next) {
  if(req.user) {
    next();
  } else {
    res.redirect('/login');
  }
};


app.get('/', restrict, 
function(req, res) {
  res.render('index');
});

app.get('/create', restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', restrict,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/auth/provider', passport.authenticate('provider'));

app.get('/auth/provider/callback', 
  passport.authenticate('provider', {successRedirect: '/',
                                    failureRedirect:'/login'}));

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {successRedirect: '/',
                                          failureRedirect: '/login'}) );

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  new User({username:username, password:password})
    .save()
    .then(function(user) {
      req.login(user, function(err) {
        if(!err) {
          res.redirect('/');
        }
      });
    });
});

app.get('/signout', 
function(req, res) {
  req.logout();
  res.redirect('/login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
