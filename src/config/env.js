module.exports = function getEnv() {
  return {
    appName: process.env.APP_NAME || 'MIA',
    port: process.env.PORT || '3000',
    frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    appBaseUrl: process.env.APP_BASE_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mia',
    mongoDbName: process.env.MONGODB_DB_NAME || '',
    gmailUser: process.env.GMAIL_USER || '',
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    mailFrom: process.env.MAIL_FROM || process.env.GMAIL_USER || 'MIA <onboarding@resend.dev>',
    paymentExpiryMinutes: process.env.PAYMENT_EXPIRY_MINUTES || '15',
    sepayBankName: process.env.SEPAY_BANK_NAME || '',
    sepayBankAccount: process.env.SEPAY_BANK_ACCOUNT || '',
    sepayAccountName: process.env.SEPAY_ACCOUNT_NAME || '',
    sepayWebhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || '',
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'mia_session',
    sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
    sessionCookieSameSite: process.env.SESSION_COOKIE_SAME_SITE || 'lax',
    cronSecret: process.env.CRON_SECRET || '',
  };
};
