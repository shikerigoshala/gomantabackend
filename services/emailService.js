import nodemailer from 'nodemailer';

// Create a test account if in development
let transporter;

if (process.env.NODE_ENV === 'production') {
  // For production, use real SMTP settings
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
} else {
  // For development, use ethereal.email test account
  (async () => {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('Ethereal test account created:');
    console.log('Email:', testAccount.user);
    console.log('Password:', testAccount.pass);
  })();
}

/**
 * Send welcome email to new family group member
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.email - Recipient email (login)
 * @param {string} options.password - Temporary password
 * @param {number} options.amount - Donation amount
 * @param {string} [options.template='welcome'] - Email template type ('welcome' or 'family_welcome')
 */
/**
 * Send welcome email to a new user
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.email - Login email
 * @param {string} options.password - User's password
 * @param {string} [options.userId] - User ID
 * @param {string} [template='welcome'] - Email template type
 */
export const sendWelcomeEmail = async ({ to, name, email, password, userId, amount, template = 'welcome' }) => {
  // Validate required fields
  if (!to || !name || !email || !password) {
    throw new Error('Missing required email parameters');
  }

  // Validate template
  if (template !== 'welcome' && template !== 'family_welcome') {
    throw new Error('Invalid email template type');
  }

  if (template === 'family_welcome' && amount === undefined) {
    throw new Error('Amount is required for family_welcome template');
  }

  if (!transporter) {
    throw new Error('Email transporter not initialized');
  }

  const mailOptions = {
    from: `"Shikeri Goashala" <${process.env.EMAIL_FROM || 'noreply@shikerigoashala.org'}>`,
    to,
    subject: template === 'family_welcome' ? 'Welcome to Gomata Donation - Family Member Account Created' : 'Welcome to Shikeri Goashala',
    text: template === 'family_welcome'
      ? `Welcome to Gomata Donation!

Dear ${name},

Thank you for joining our family donation program. Here are your login details:

User ID: ${userId || 'N/A'}
Email: ${email}
Password: ${password}

You have been added to the family donation of ₹${amount}.

Please change your password after first login for security.

Best regards,
Gomata Donation Team`
      : `Welcome to Shikeri Goashala!

Dear ${name},

Thank you for registering with us. Here are your account details:

User ID: ${userId || 'N/A'}
Email: ${email}
Password: ${password}

Please keep this information secure. We recommend changing your password after your first login for security.

Best regards,
Shikeri Goashala Team`,
    html: template === 'family_welcome'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #10b981;">Welcome to Gomata Donation!</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p>Dear ${name},</p>
            <p>Thank you for joining our family donation program. Here are your login details:</p>
            <div style="background-color: #fff; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p>You have been added to the family donation of ₹${amount}.</p>
            <p style="color: #ef4444; font-weight: 500;">For security reasons, please change your password after first login.</p>
            <p>Best regards,<br>Gomata Donation Team</p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Shikeri Goashala. All rights reserved.</p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #10b981;">Welcome to Shikeri Goashala!</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p>Dear ${name},</p>
            <p>Thank you for registering with us. Here are your account details:</p>
            <div style="background-color: #fff; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p style="color: #ef4444; font-weight: 500;">For security reasons, please change your password after first login.</p>
            <p>Best regards,<br>Shikeri Goashala Team</p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Shikeri Goashala. All rights reserved.</p>
          </div>
        </div>
      `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail
};
