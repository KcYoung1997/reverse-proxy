var config = require('./config')
var app = require('express')()
var fs = require("fs")
var server = require('https').createServer(
  {
    key: fs.readFileSync(config.sslKeyPath).toString(), 
    cert: fs.readFileSync(config.sslCertPath).toString()
  }, app)
var proxy = require('http-proxy').createProxyServer({xfwd: true})

// Allow easy cookie access
var cookieParser = require('cookie-parser')
app.use(cookieParser())

// Morgan for access logging
var morgan = require('morgan')
app.use(morgan('combined', { stream: fs.createWriteStream('./access.log', { flags: 'a' }) }))

// Intel for error logging
var intel = require('intel');
intel.addHandler(new intel.handlers.File({
  file: './error.log',
  formatter: new intel.Formatter({
    format: "[%(date)s] %(message)s"
  })
}));
intel.handleExceptions(false);
 
// Auth
const { auth } = require('express-openid-connect')
const authConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: config.auth0Secret,
  baseURL: config.auth0BaseURL,
  clientID: config.auth0ClientID,
  issuerBaseURL: config.auth0IssuerBaseURL,
  session: {
    cookie: {
      domain: config.domain
    }
  }
}
app.use(auth(authConfig))

// Proxy http(s) requests
app.use('/', function(req, res) {
  try {
    if (!req.oidc.isAuthenticated()) {
      res.cookie('returnTo', req.headers.host + req.originalUrl, {domain: config.domain})
      res.redirect('/login')
    } else {
      // Check who's logged in
      if (!config.allowedLogin.includes(req.oidc.user.email)) {
        res.status(403)
        res.send('access denied')
        return
      }
      // If coming from callback, redirect to original page
      if(req.cookies.returnTo) {
        res.clearCookie('returnTo', {domain: config.domain})
        res.redirect('https://' + req.cookies.returnTo)
        return
      }
      req.headers["X-Authenticated-User"] = req.oidc.user.email
      // Proxy request
      proxy.web(req, res, {target: 'http://' + config.redirects[req.hostname.replace('.' + config.domain, '')]})
    }
  } catch (error) {
    // Write error to log
    intel.error(error)
    // Return 'err'
    res.status(500)
    res.send('err')
    // Print err to console
    throw error
  }
})

// Proxy WebSockets requests
server.on('upgrade', function (req, socket, head) {
  proxy.ws(req, socket, head, {target: 'ws://' + config.redirects[req.headers.host.split(':')[0].replace('.' + config.domain, '')]})
})

console.log(`Listening at https://${config.domain}:${config.sslPort}`)
server.listen(config.sslPort)

// Upgrade HTTP
var http = require('express')()
http.use('*', (req, res) =>{
  res.redirect('https://' + req.hostname + ":" + config.sslPort + req.url)
})
http.listen(config.httpPort)
console.log(`Listening at http://${config.domain}:${config.httpPort}`)