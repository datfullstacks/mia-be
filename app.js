require('dotenv').config({
  path: require('path').resolve(__dirname, '.env'),
});

var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var apiRouter = require('./src/routes');
var notFoundHandler = require('./src/middleware/not-found');
var errorHandler = require('./src/middleware/error-handler');
var authMiddleware = require('./src/middleware/auth');
var getEnv = require('./src/config/env');

var app = express();
var env = getEnv();
var allowedOrigins = env.frontendOrigin
  .split(',')
  .map(function (origin) {
    return origin.trim();
  })
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  }),
);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(authMiddleware.attachCurrentUser);

app.get('/', function (_req, res) {
  res.json({
    name: env.appName,
    message: 'MIA backend is running',
    docs: '/api/overview',
  });
});

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
