const { createPool } = require('../database/pool');
const logger = require('../utils/logger');
const cron = require('node-cron');

let monitorInterval = null;

// Check and update subscription statuses
async function checkSubscriptions() {
  try {
    const pool = createPool();
    const trialDays = parseInt(process.env.TRIAL_DAYS) || 5;

    // Update expired trials
    await pool.query(`
      UPDATE users
      SET subscription_status = 'expired',
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE subscription_status = 'trial'
      AND trial_end_date < NOW()
      AND is_active = true
    `);

    // Update expired subscriptions
    await pool.query(`
      UPDATE users
      SET subscription_status = 'expired',
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE subscription_status = 'active'
      AND subscription_end_date < NOW()
      AND is_active = true
    `);

    // Activate new subscriptions (from payments)
    await pool.query(`
      UPDATE users
      SET subscription_status = 'active',
          subscription_start_date = p.subscription_start_date,
          subscription_end_date = p.subscription_end_date,
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
      FROM payments p
      WHERE users.id = p.user_id
      AND p.status = 'success'
      AND users.subscription_status = 'expired'
      AND p.subscription_start_date IS NOT NULL
      AND p.subscription_end_date > NOW()
    `);

    logger.info('Subscription statuses updated');
  } catch (error) {
    logger.error('Error checking subscriptions:', error);
  }
}

// Send renewal reminders
async function sendRenewalReminders() {
  try {
    const pool = createPool();

    // Find users whose subscriptions expire in 3 days
    const result = await pool.query(`
      SELECT id, phone, subscription_end_date
      FROM users
      WHERE subscription_status = 'active'
      AND subscription_end_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      AND is_active = true
    `);

    // TODO: Send email or in-app reminders when subscription is about to expire
    // For now, just log
    if (result.rows.length > 0) {
      logger.info(`Found ${result.rows.length} users needing renewal reminders`);
    }
  } catch (error) {
    logger.error('Error sending renewal reminders:', error);
  }
}

// Start subscription monitor
function startSubscriptionMonitor() {
  logger.info('Starting Subscription Monitor service');

  // Check subscriptions every hour
  cron.schedule('0 * * * *', () => {
    checkSubscriptions();
  });

  // Send renewal reminders daily at 9 AM
  cron.schedule('0 9 * * *', () => {
    sendRenewalReminders();
  });

  // Initial check
  checkSubscriptions();
}

// Stop subscription monitor
function stopSubscriptionMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info('Subscription Monitor service stopped');
  }
}

module.exports = {
  startSubscriptionMonitor,
  stopSubscriptionMonitor,
  checkSubscriptions
};

