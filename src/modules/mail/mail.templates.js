var getEnv = require('../../config/env');

var env = getEnv();

function getActionUrl() {
  return env.appBaseUrl.replace(/\/$/, '') + '/room?app=unseal';
}

function getTemplateContent(amber, event) {
  if (event === 'amber_ready') {
    return {
      title: 'Your amber is ready to open',
      body: 'The waiting period is over. Visit MIA and enter the amber code below.',
      subject: 'MIA amber ' + amber.code + ' is ready to open',
    };
  }

  return {
    title: 'A new amber has been sealed for you',
    body: 'Someone sealed a message in MIA for you. Keep the code below and return when it is time.',
    subject: 'MIA amber ' + amber.code + ' was sealed',
  };
}

exports.renderMailTemplate = function renderMailTemplate(amber, event) {
  var content = getTemplateContent(amber, event);
  var actionUrl = getActionUrl();

  return {
    subject: content.subject,
    text:
      content.title +
      '\n\n' +
      content.body +
      '\n\nCode: ' +
      amber.code +
      '\nOpen at: ' +
      amber.openAt +
      '\nUnseal: ' +
      actionUrl,
    html:
      '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;padding:24px;">' +
      '<h2 style="margin:0 0 16px;color:#111827;">' +
      content.title +
      '</h2>' +
      '<p style="margin:0 0 16px;">' +
      content.body +
      '</p>' +
      '<div style="margin:0 0 16px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">' +
      '<p style="margin:0 0 8px;"><strong>Code:</strong> ' +
      amber.code +
      '</p>' +
      '<p style="margin:0;"><strong>Open at:</strong> ' +
      amber.openAt +
      '</p>' +
      '</div>' +
      '<p style="margin:0 0 16px;">' +
      '<a href="' +
      actionUrl +
      '" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;">Open MIA</a>' +
      '</p>' +
      '<p style="margin:0;color:#6b7280;font-size:14px;">If the button does not work, open: ' +
      actionUrl +
      '</p>' +
      '</div>',
  };
};
