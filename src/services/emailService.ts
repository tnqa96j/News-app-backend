import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

export const mailService = {
  async sendOtp(email: string, code: string): Promise<void> {
    await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: "News App",
        email: process.env.MAIL_USER,
      },
      to: [{ email }],
      subject: "Your verification code",
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 400px;">
          <h2>Verification Code</h2>
          <p>Your code is:</p>
          <h1 style="letter-spacing: 8px; color: #333;">${code}</h1>
          <p style="color: #999; font-size: 12px;">Valid for 5 minutes. Do not share this code.</p>
        </div>
            `,
    });
  },
};
