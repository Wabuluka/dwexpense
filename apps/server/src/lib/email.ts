import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: `"Expense Tracker" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;font-size:20px;color:#111">Reset your password</h2>
        <p style="color:#555;margin:0 0 24px">Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}"
          style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          Reset password
        </a>
        <p style="color:#999;font-size:12px;margin:24px 0 0">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
