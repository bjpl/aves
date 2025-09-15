module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'someSecretKey'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'someRandomLongString'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'anotherRandomLongString'),
    },
  },
});