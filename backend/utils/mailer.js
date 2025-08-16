const nodemailer = require('nodemailer');

const {
  SMTP_HOST,          
  SMTP_PORT = 587,    
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,          
  USE_GMAIL,          
} = process.env;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else if (String(USE_GMAIL).toLowerCase() === 'true' && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.warn('');
}

async function sendLowStockEmail(to, items, displayName = 'there') {
  const subject = `[Action Required] Low stock items (${items.length})`;
  const listText = items.map(s => `• ${s.title} (qty: ${s.quantity})`).join('\n');
  const listHtml = items.map(s => `<li><strong>${s.title}</strong> — qty ${s.quantity}</li>`).join('');

  const mailOptions = {
    from: MAIL_FROM || (SMTP_USER ? `"Inventory Bot" <${SMTP_USER}>` : 'Inventory Bot <no-reply@example.com>'),
    to,
    subject,
    text:
`Hi ${displayName},

The following items are below the threshold (<10):

${listText}

Please restock them as soon as possible.

Thanks,
Inventory Bot`,
    html:
`<p>Hi ${displayName},</p>
<p>The following items are below the threshold (&lt;10):</p>
<ul>${listHtml}</ul>
<p>Please restock them as soon as possible.</p>
<p>Thanks,<br/>Inventory Bot</p>`,
  };

  if (!transporter) {
    console.log('[mailer][MOCK] sendLowStockEmail:', { to, subject });
    return { mocked: true };
  }

  return transporter.sendMail(mailOptions);
}

module.exports = { sendLowStockEmail };
