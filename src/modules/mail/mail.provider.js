var crypto = require('crypto');

var getEnv = require('../../config/env');

var env = getEnv();

function buildLocalResult() {
  return Promise.resolve({
    status: 'sent',
    providerMessageId: 'local-' + crypto.randomUUID(),
    errorMessage: null,
  });
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
  if (!env.resendApiKey) {
    return buildLocalResult();
  }

  return sendWithResend(payload);
};
