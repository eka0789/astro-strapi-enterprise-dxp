module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'novasphere_admin_jwt_secret_token_key_change_in_prod'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'novasphere_api_token_salt_value_12345'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'novasphere_transfer_token_salt_67890'),
    },
  },
});
