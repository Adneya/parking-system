const nodemailer = require('nodemailer');

// Check if email is configured
const isEmailConfigured = () => {
  return process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
};

// Configure email transporter (only if credentials are available)
const transporter = isEmailConfigured() 
  ? nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    })
  : null;

// @desc    Send welcome email
// @param   {string} email - User email
// @param   {string} userName - User name
exports.sendWelcomeEmail = async (email, userName) => {
  // Skip email if not configured (development)
  if (!transporter) {
    console.warn('Email not configured. Skipping welcome email for:', email);
    return Promise.resolve();
  }

  const subject = 'Welcome to Parking System!';
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .header {
          background-color: #007bff;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #007bff;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Parking System!</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Thank you for joining our parking management system. We're excited to have you on board!</p>
          <p>With our platform, you can:</p>
          <ul>
            <li>Reserve parking spots in advance</li>
            <li>Track your parking history</li>
            <li>Earn loyalty points with every booking</li>
            <li>Manage multiple vehicles</li>
            <li>Access real-time parking availability</li>
          </ul>
          <p>Get started by exploring the app and setting up your profile.</p>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
        </div>
        <div class="footer">
          <p>&copy; 2026 Parking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: htmlContent
    });

    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending welcome email to ${email}:`, error);
    throw error;
  }
};

// @desc    Send email verification email
// @param   {string} email - User email
// @param   {string} verificationToken - Verification token
exports.sendVerificationEmail = async (email, verificationToken) => {
  // Skip email if not configured (development)
  if (!transporter) {
    console.warn('Email not configured. Skipping verification email for:', email);
    return Promise.resolve();
  }

  const subject = 'Verify Your Email - Parking System';
  const verificationLink = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .header {
          background-color: #28a745;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #28a745;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
        }
        .token-box {
          background-color: #f8f9fa;
          padding: 15px;
          border-left: 4px solid #28a745;
          margin-top: 15px;
          font-family: monospace;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for creating an account with Parking System. To complete your registration, please verify your email address.</p>
          <a href="${verificationLink}" class="button">Verify Email</a>
          <p>Or copy and paste the token below:</p>
          <div class="token-box">${verificationToken}</div>
          <p>This verification link will expire in 24 hours.</p>
          <p>If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Parking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: htmlContent
    });

    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending verification email to ${email}:`, error);
    throw error;
  }
};

// @desc    Send password reset email
// @param   {string} email - User email
// @param   {string} resetToken - Password reset token
exports.sendPasswordResetEmail = async (email, resetToken) => {
  // Skip email if not configured (development)
  if (!transporter) {
    console.warn('Email not configured. Skipping password reset email for:', email);
    return Promise.resolve();
  }

  const subject = 'Reset Your Password - Parking System';
  const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .header {
          background-color: #dc3545;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #dc3545;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin-top: 15px;
        }
        .token-box {
          background-color: #f8f9fa;
          padding: 15px;
          border-left: 4px solid #dc3545;
          margin-top: 15px;
          font-family: monospace;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>Or copy and paste the token below:</p>
          <div class="token-box">${resetToken}</div>
          <div class="warning">
            <strong>Security Note:</strong> This password reset link will expire in 10 minutes. If you didn't request this, please ignore this email and your password will remain unchanged.
          </div>
          <p>Never share this link with anyone else.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Parking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: htmlContent
    });

    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending password reset email to ${email}:`, error);
    throw error;
  }
};

// @desc    Test email sending
exports.testEmailSending = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send emails');
    return true;
  } catch (error) {
    console.error('Error with email service:', error);
    return false;
  }
};
