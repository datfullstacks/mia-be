var getEnv = require('../../config/env');

var env = getEnv();

function getActionUrl() {
  return env.appBaseUrl.replace(/\/$/, '') + '/room?app=unseal';
}

function getTemplateContent(amber, event) {
  if (event === 'amber_ready') {
    return {
      title: 'Amber cua ban da den luc mo',
      body: 'Thoi gian cho da ket thuc. Hay vao MIA va dung thong tin amber ben duoi de mo.',
      subject: 'MIA amber ' + amber.code + ' da san sang de mo',
    };
  }

  return {
    title: 'Ban vua nhan duoc mot amber moi',
    body: 'Co nguoi da luu mot thong diep cho ban trong MIA. Hay giu lai thong tin ben duoi va quay lai dung thoi diem de mo.',
    subject: 'MIA amber ' + amber.code + ' da duoc tao',
  };
}

exports.renderMailTemplate = function renderMailTemplate(amber, event) {
  var content = getTemplateContent(amber, event);
  var actionUrl = getActionUrl();
  var passcodeSection = amber.passcode
    ? '\nMat ma mo: ' + amber.passcode
    : '\nMat ma mo: dung mat ma ban da tao truoc do';
  var htmlPasscodeSection = amber.passcode
    ? '<p style="margin:0 0 8px;"><strong>Mat ma mo:</strong> ' + amber.passcode + '</p>'
    : '<p style="margin:0 0 8px;"><strong>Mat ma mo:</strong> Dung mat ma ban da tao truoc do.</p>';

  return {
    subject: content.subject,
    text:
      content.title +
      '\n\n' +
      content.body +
      '\n\nMa amber: ' +
      amber.code +
      passcodeSection +
      '\nMo vao luc: ' +
      amber.openAt +
      '\nMo amber tai: ' +
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
      '<p style="margin:0 0 8px;font-size:18px;"><strong>Ma amber:</strong> ' +
      amber.code +
      '</p>' +
      htmlPasscodeSection +
      '<p style="margin:8px 0 0;"><strong>Open at:</strong> ' +
      amber.openAt +
      '</p>' +
      '</div>' +
      '<p style="margin:0 0 16px;">' +
      '<a href="' +
      actionUrl +
      '" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;">Mo MIA</a>' +
      '</p>' +
      '<p style="margin:0;color:#6b7280;font-size:14px;">Neu nut khong hoat dong, hay mo link nay: ' +
      actionUrl +
      '</p>' +
      '</div>',
  };
};
