var getEnv = require('../../config/env');

var env = getEnv();

function getActionUrl() {
  return env.appBaseUrl.replace(/\/$/, '') + '/room?app=unseal';
}

function getTemplateContent(amber, event) {
  if (event === 'amber_ready') {
    return {
      title: 'Amber của bạn đã đến lúc mở',
      body: 'Thời gian chờ đã kết thúc. Hãy vào MIA và dùng thông tin amber bên dưới để mở.',
      subject: 'MIA amber ' + amber.code + ' đã sẵn sàng để mở',
    };
  }

  return {
    title: 'Bạn vừa nhận được một amber mới',
    body: 'Có người đã lưu một thông điệp cho bạn trong MIA. Hãy giữ lại thông tin bên dưới và quay lại đúng thời điểm để mở.',
    subject: 'MIA amber ' + amber.code + ' đã được tạo',
  };
}

exports.renderMailTemplate = function renderMailTemplate(amber, event) {
  var content = getTemplateContent(amber, event);
  var actionUrl = getActionUrl();
  var passcodeSection = amber.passcode
    ? '\nMật mã mở: ' + amber.passcode
    : '\nMật mã mở: dùng mật mã bạn đã tạo trước đó';
  var htmlPasscodeSection = amber.passcode
    ? '<p style="margin:0 0 8px;"><strong>Mật mã mở:</strong> ' + amber.passcode + '</p>'
    : '<p style="margin:0 0 8px;"><strong>Mật mã mở:</strong> Dùng mật mã bạn đã tạo trước đó.</p>';

  return {
    subject: content.subject,
    text:
      content.title +
      '\n\n' +
      content.body +
      '\n\nMã amber: ' +
      amber.code +
      passcodeSection +
      '\nMở vào lúc: ' +
      amber.openAt +
      '\nMở amber tại: ' +
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
      '<p style="margin:0 0 8px;font-size:18px;"><strong>Mã amber:</strong> ' +
      amber.code +
      '</p>' +
      htmlPasscodeSection +
      '<p style="margin:8px 0 0;"><strong>Mở vào lúc:</strong> ' +
      amber.openAt +
      '</p>' +
      '</div>' +
      '<p style="margin:0 0 16px;">' +
      '<a href="' +
      actionUrl +
      '" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;">Mở MIA</a>' +
      '</p>' +
      '<p style="margin:0;color:#6b7280;font-size:14px;">Nếu nút không hoạt động, hãy mở link này: ' +
      actionUrl +
      '</p>' +
      '</div>',
  };
};
