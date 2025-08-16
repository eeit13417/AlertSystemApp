const cron = require('node-cron');
const { sendLowStockEmail } = require('../utils/mailer');
const Stock = require('../models/Stock'); 
const Admin = require('../models/Admin');

async function getLowStockFromMongo() {
  return Stock.find({ status: 1, quantity: { $lt: 10 } }).lean();
}

async function getRecipients() {
  return Admin.find({ notification: true, status: 1 }).lean();
}

async function runLowStockNotify() {
  const low = await getLowStockFromMongo();
  if (!low.length) {
    console.log('[lowStockCron] No low-stock items found, skipping.');
    return;
  }

  const admins = await getRecipients();
  if (!admins.length) {
    console.log('[lowStockCron] No users with notifications enabled, skipping.');
    return;
  }

  let sent = 0;
  for (const u of admins) {
    try {
      await sendLowStockEmail(u.email, low, u.name || 'there');
      sent++;
    } catch (err) {
      console.error(`[lowStockCron] Failed to send to ${u.email}:`, err.message);
    }
  }
  console.log(`[lowStockCron] Sent ${sent}/${admins.length} low-stock notification emails.`);
}

function startLowStockCron() {
  const schedule = process.env.CRON_SCHEDULE || '0 9 * * *';
  cron.schedule(schedule, () => {
    runLowStockNotify().catch(e => console.error('[lowStockCron] error:', e));
  }, { timezone: "Australia/Brisbane" });
  console.log(`[lowStockCron] Scheduled: "${schedule}" (server time).`);
}

module.exports = { startLowStockCron, runLowStockNotify };
