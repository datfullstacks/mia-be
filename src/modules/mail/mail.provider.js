var crypto = require('crypto');
var nodemailer = require('nodemailer');

var getEnv = require('../../config/env');

var env = getEnv();
var gmailTransporter = null;

function getGmailTransporter() {
  if (!env.gmailUser || !env.gmailAppPassword) {
    return null;
  }

  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.gmailUser,
        pass: env.gmailAppPassword,
      },
    });
  }

  return gmailTransporter;
}

function buildLocalResult() {
  return Promise.resolve({
    status: 'sent',
    providerMessageId: 'local-' + crypto.randomUUID(),
    errorMessage: null,
  });
}

async function sendWithGmail(payload) {
  var transporter = getGmailTransporter();

  if (!transporter) {
    return buildLocalResult();
  }

  try {
    var info = await transporter.sendMail({
      from: env.mailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: {
        'X-Idempotency-Key': payload.idempotencyKey,
      },
    });

    return {
      status: 'sent',
      providerMessageId: info.messageId || 'gmail-' + crypto.randomUUID(),
      errorMessage: null,
    };
  } catch (error) {
    return {
      status: 'failed',
      providerMessageId: 'gmail-failed',
      errorMessage: error instanceof Error ? error.message : 'Gmail SMTP request failed',
    };
  }
}

async function sendWithResend(payload) {
  var response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.resendApiKey,
      'Content-Type': 'application/json',
      'Idempotency-Key': payload.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.mailFrom,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  var body = await response.json().catch(function () {
    return null;
  });

  if (!response.ok) {
    return {
      status: 'failed',
      providerMessageId: 'resend-failed',
      errorMessage:
        (body && body.message) || 'Resend API request failed with status ' + response.status,
    };
  }

  return {
    status: 'sent',
    providerMessageId: body && body.id ? body.id : 'resend-' + crypto.randomUUID(),
    errorMessage: null,
  };
}

exports.sendMail = async function sendMail(payload) {
  if (env.gmailUser && env.gmailAppPassword) {
    return sendWithGmail(payload);
  }

  if (!env.resendApiKey) {
    return buildLocalResult();
  }

  return sendWithResend(payload);
};
