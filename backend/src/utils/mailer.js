const nodemailer = require('nodemailer');

let cachedTransporter = null;

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const provider = String(process.env.SMTP_PROVIDER || '').toLowerCase();

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  if (user && pass && (provider === 'gmail' || user.toLowerCase().endsWith('@gmail.com'))) {
    return nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user, pass },
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 15000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000)
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

function getTransporter() {
  if (!cachedTransporter) cachedTransporter = buildTransporter();
  return cachedTransporter;
}

async function sendMail({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  const provider = String(process.env.SMTP_PROVIDER || '').toLowerCase();
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const canUseGmail = provider === 'gmail' || (user && user.toLowerCase().endsWith('@gmail.com'));
  const smtpConfigured = Boolean(user && pass && (host || canUseGmail));

  if (!smtpConfigured) {
    throw new Error('EMAIL_TRANSPORT_NOT_CONFIGURED');
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@barber-factory.local';

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    return info;
  } catch (error) {
    const wrapped = new Error('EMAIL_SEND_FAILED');
    wrapped.mailCode = error && error.code ? error.code : null;
    wrapped.mailResponse = error && error.response ? String(error.response) : '';
    wrapped.cause = error;
    throw wrapped;
  }
}

module.exports = { sendMail };
