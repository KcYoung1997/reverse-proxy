module.exports = (config) => {
    const { auth } = require('express-openid-connect');
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
    };
    return auth(authConfig);
};