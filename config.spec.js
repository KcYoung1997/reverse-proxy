var config = module.exports = {}

config.httpPort = 80;
config.sslPort = 443;
config.domain = 'localhost.com';
config.router = {
    "subdomain1.localhost.com": "http://127.0.0.1:8080",
    "subdomain2.localhost.com": "http://192.168.0.123:8080",
};
config.allowedLogin = (req) => req.oidc.user.email === 'person@example.com';
config.noLogin = (req) => req.hostname === 'subdomain2.localhost.com';

config.sslKeyPath = './selfsigned.key';
config.sslCertPath = './selfsigned.crt';

config.auth0Secret = 'JD6AS8NLK7I21AFASF3VQW5NLKFNZ';
config.auth0BaseURL = 'https://localhost.com:443';
config.auth0ClientID = 'eslikgjnq12908ry1';
config.auth0IssuerBaseURL = 'https://example.auth0.com';