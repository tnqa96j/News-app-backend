import nodemailer from "nodemailer";

// 建立寄信器
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.verify((error) => {
  if(error){
    console.error("Mail transporter error:", error);
  } else {
    console.log("Mail server ready");
  }
})

export const mailService = {
  async sendOtp(email: string, code: string): Promise<void> {
    await transporter.sendMail({
      from: `"News App" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your verification code",
      html: `
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
