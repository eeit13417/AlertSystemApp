const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendLowStockEmail(to, items, displayName = 'there') {
  const subject = `[Action Required] Low stock items (${items.length})`;
  const listText = items.map(s => `• ${s.title} (qty: ${s.quantity})`).join('\n');
  const listHtml = items.map(s => `<li><strong>${s.title}</strong> — qty ${s.quantity}</li>`).join('');

  return transporter.sendMail({
    from: process.env.MAIL_FROM || `"Inventory Bot" <${process.env.SMTP_USER}>`,
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
  });
}

module.exports = { sendLowStockEmail };
