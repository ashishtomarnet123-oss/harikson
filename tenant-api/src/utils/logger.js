import pino from 'pino';
export default pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password', 'password_hash', 'token', 'refreshToken',
      'apiKey', 'key', 'secret', 'authorization',
      'email', 'phone', 'content', 'socialLinks'
    ],
    remove: true
  }
});
