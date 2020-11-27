const app = require('express')();
const config = require('./config');
const fs = require('fs');

// Morgan for access logging
var morgan = require('morgan');
const morganFormat = ':remote-addr [:date[clf]] :method :req[host] :url HTTP/:http-version :status :res[content-length] ":referrer" ":user-agent"';
app.use(morgan(morganFormat, { stream: fs.createWriteStream('./access.log', { flags: 'a' }) }));
app.use(morgan(morganFormat));

// Parse cookies into request objects
app.use(require('cookie-parser')());

// Auth0
app.use(require('./auth')(config));

// Auth checking
const checkAuth = (req, res, next) => {
  // If request doesn't require auth
  if (config.noLogin && config.noLogin(req)) {
    next();
  } else if (!req.oidc.isAuthenticated()) {
    // Redirect to login if not authenticated
    res.cookie('returnTo', req.headers.host + req.originalUrl, {domain: config.domain});
    res.redirect('/login');
  } else if (!config.allowedLogin(req)) {
    // Return 403 if not allowed to auth
    res.status(403);
    res.cookie('appSession', '', {domain: '.'+config.domain, expires: 0});
    res.send('Access Denied - refresh to login to another account');
  } else {
    req.headers["X-Authenticated-User"] = req.oidc.user.email;
    next();
  }
};
app.use(checkAuth);

// Redirect to callback set in cookie prior to login
const checkCallback = (req, res, next) => {
  if (req.cookies.returnTo) {
    res.clearCookie('returnTo', {domain: config.domain});
    res.redirect('https://' + req.cookies.returnTo);
  } else next();
};
app.use(checkCallback);

// Proxy
const { createProxyMiddleware } = require('http-proxy-middleware');
const proxy = createProxyMiddleware({target: config.domain, router: config.router, xfwd: true, logLevel: 'debug', pathRewrite: {}});
app.use(proxy);

// Start
const server = require('https').createServer({key: fs.readFileSync(config.sslKeyPath).toString(), cert: fs.readFileSync(config.sslCertPath).toString()}, app);
server.listen(config.sslPort);
console.log(`Listening at https://${config.domain}:${config.sslPort}`);

// Websockets
const wsProxy =  createProxyMiddleware({target: config.domain, router: config.router, xfwd: true, ws: true});
app.use(wsProxy);
server.on('upgrade', wsProxy.upgrade);

// Upgrade HTTP
var http = require('express')();
http.use('*', (req, res) => res.redirect(`https://${req.hostname}:${config.sslPort}${req.url}`));
http.listen(config.httpPort);
console.log(`Listening at http://${config.domain}:${config.httpPort}`);