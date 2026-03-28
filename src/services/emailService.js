const nodemailer = require('nodemailer');
const { config } = require('../config');

function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: false,
    auth: {
      user: config.smtpUsername,
      pass: config.smtpPassword,
    },
  });
}

async function sendOnboarderOtpEmail(otp, requesterEmail) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: config.smtpFromEmail,
    to: config.onboarderEmail,
    subject: 'FitBook — Onboarder OTP',
    text: `OTP requested by ${requesterEmail}.\n\nOTP: ${otp}\n\nExpires in ${config.otpExpireMinutes} minutes.`,
    html: `
      <p>OTP requested by <strong>${requesterEmail}</strong>.</p>
      <p style="font-size:24px;letter-spacing:4px;font-weight:bold;">${otp}</p>
      <p>Expires in ${config.otpExpireMinutes} minutes.</p>
    `,
  });
}

async function sendEmailVerificationOtp(email, otp) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: config.smtpFromEmail,
    to: email,
    subject: 'Verify your FitBook email',
    text: `Your verification code is: ${otp}\n\nExpires in ${config.otpExpireMinutes} minutes.`,
    html: `
      <p>Your FitBook email verification code is:</p>
      <p style="font-size:24px;letter-spacing:4px;font-weight:bold;">${otp}</p>
      <p>Expires in ${config.otpExpireMinutes} minutes.</p>
    `,
  });
}

async function sendForgotPasswordOtp(email, otp) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: config.smtpFromEmail,
    to: email,
    subject: 'FitBook password reset code',
    text: `Your password reset code is: ${otp}\n\nExpires in ${config.otpExpireMinutes} minutes.`,
    html: `
      <p>Your FitBook password reset code is:</p>
      <p style="font-size:24px;letter-spacing:4px;font-weight:bold;">${otp}</p>
      <p>Expires in ${config.otpExpireMinutes} minutes.</p>
    `,
  });
}

module.exports = {
  sendOnboarderOtpEmail,
  sendEmailVerificationOtp,
  sendForgotPasswordOtp,
};
