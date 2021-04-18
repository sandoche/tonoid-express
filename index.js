const express = require('express');
const expressWinston = require('express-winston');
const asyncHandler = require('express-async-handler');
const compression = require('compression');

const init = ({
  port = 80,
  endpoints = [],
  isHTML = false,
  jsonLog = process.env.NODE_ENV === 'production',
}) => async ({ logger }) => {
  // Bootstrap express server
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 10000 }));

  // health check
  app.get('/~health', (req, res) => res.send('ok'));

  // Remove trailing slashes
  app.use((req, res, next) => {
    if (req.path.substr(-1) === '/' && req.path.length > 1) {
      const query = req.url.slice(req.path.length);
      res.redirect(301, req.path.slice(0, -1) + query);
    } else {
      next();
    }
  });

  app.use(compression());

  if (logger.format && logger.winston) {
    const defaultRequestLogger = expressWinston.logger({
      winstonInstance: logger,
      msg: '{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms {{req.ip}}',
      expressFormat: false,
      meta: false,
      colorize: process.env.NODE_ENV !== 'production',
      skip: (req) => {
        const urlLog = req.url.substring(0, 500);
        return /(^\/assets)|(\.(ico|png|jpg|jpeg|webp|woff|woff2|ttf|svg|css|js))|~*health/ig.exec(urlLog);
      },
    });

    const jsonRequestLogger = expressWinston.logger({
      format: logger.format,
      transports: [
        new logger.winston.transports.Console(),
      ],
      metaField: null,
      responseField: null,
      requestWhitelist: [],
      responseWhitelist: ['body'],
      skip: (req) => {
        const urlLog = req.url.substring(0, 500);
        return /(^\/assets)|(\.(ico|png|jpg|jpeg|webp|woff|woff2|ttf|svg|css|js))|~*health/ig.exec(urlLog);
      },
      dynamicMeta: (req, res) => {
        const httpRequest = {};
        const meta = {};
        if (req) {
          const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
          meta.httpRequest = httpRequest;
          httpRequest.requestMethod = req.method;
          httpRequest.requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
          httpRequest.protocol = `HTTP/${req.httpVersion}`;
          httpRequest.remoteIp = ip.indexOf(':') >= 0 ? ip.substring(ip.lastIndexOf(':') + 1) : ip; // just ipv4
          httpRequest.requestSize = req.socket.bytesRead;
          httpRequest.userAgent = req.get('User-Agent');
          httpRequest.referrer = req.get('Referrer');
        }

        if (res) {
          meta.httpRequest = httpRequest;
          httpRequest.status = res.statusCode;
          httpRequest.latency = `${(res.responseTime / 1000)}s`;
          if (res.body) {
            if (typeof res.body === 'object') {
              httpRequest.responseSize = JSON.stringify(res.body).length;
            } else if (typeof res.body === 'string') {
              httpRequest.responseSize = res.body.length;
            }
          }
          meta.severity = (res.statusCode >= 500) ? 'warn' : 'info';
        }
        return meta;
      },
    });
    app.use(jsonLog ? jsonRequestLogger : defaultRequestLogger);
  }

  // API Endpoints
  endpoints.forEach((endpoint) => {
    app.use(endpoint.path, endpoint.handler());
  });

  // Page not found
  app.use((req, res) => {
    res.status(404);
    if (isHTML && req.accepts('html')) return res.render('404', req.defaultVars);
    return res.send({ error: 'Not found' });
  });

  if (logger.gcloudErrorsMiddleWare) {
    app.use(logger.gcloudErrorsMiddleWare);
  }

  // Log Error
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) {
      logger.outputError(`${err.message} (${err.stack.replace(/\n/g, ', ')})`);
      if (logger.gcloudErrorsMiddleWare) {
        return logger.gcloudErrorsMiddleWare(err, req, res, next);
      }
    }
    return next(err);
  });

  // Output Error page
  app.use((err, req, res, next) => { // eslint-disable-line
    const status = err.status || 500;
    res.status(status);
    if (process.env.NODE_ENV === 'production') {
      if (isHTML && req.accepts('html')) return res.render('500', req.defaultVars);
      const message = (status >= 500) ? 'Internal server error' : err.message;
      return res.send({ error: message });
    }
    res.send({
      error: err.message,
      status,
      trace: err,
      stack: err.stack,
    });
  });

  // Init
  const httpServer = await new Promise((resolve, reject) => {
    const httpServerResult = app.listen(port, (err) => {
      if (err) return reject(err);
      return resolve(httpServerResult);
    });
  });

  // Helper to get route
  const getRouter = () => express.Router();

  // Close function
  const close = new Promise((resolve, reject) => {
    httpServer.close((err) => {
      if (err) return reject(err);
      return resolve(true);
    });
  });

  return {
    close,
    getRouter,
    app,
    asyncHandler,
  };
};

const expressModule = module.exports = init; // eslint-disable-line no-multi-assign
expressModule.name = 'express';
