module.exports = function getEnv() {
  return {
    appName: process.env.APP_NAME || 'MIA',
    port: process.env.PORT || '3000',
    frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    appBaseUrl: process.env.APP_BASE_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mia',
    mongoDbName: process.env.MONGODB_DB_NAME || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    mailFrom: process.env.MAIL_FROM || 'MIA <onboarding@resend.dev>',
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'mia_session',
    sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
    sessionCookieSameSite: process.env.SESSION_COOKIE_SAME_SITE || 'lax',
    cronSecret: process.env.CRON_SECRET || '',
  };
};
