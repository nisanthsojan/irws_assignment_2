var express = require('express');
var path = require('path');
var logger = require('morgan');
var fs = require('fs');

var routes = require('./routes/index');
var counter = require('./routes/counter');
var config = require('./config.json');


var app = express();

// This loop takes the text files from the lib folder
// and uses the fs module to read it into a variable
app.locals.corpuses = [];
config.files.forEach(function (fileName) {
    app.locals.corpuses.push({
        name: path.basename(fileName),
        data: fs.readFileSync(fileName, 'utf8')
    });
});

app.locals.title = config.title;
// the stop words are catched from the config file and made to a word array
app.locals.stopWords = config['stop-words'].split(' ');


// setup template engine - we're using Hogan-Express
app.set('view engine', 'html');
app.set('layout', 'layout');
app.engine('html', require('hogan-express'));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/counter', counter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
