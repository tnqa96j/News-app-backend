interface OtpRecord {
  code: string;
  expiresAt: number; // timestamp
  lastSentAt: number; 
}

const otpMap = new Map<string, OtpRecord>();
const OPT_EXPIRE_MS = 5 * 60 * 1000;

export const otpService = {
  generateOtp(account: string): string {
    // 先檢查帳號是否已產生過驗證碼 => 60s內不得重複發送/產生驗證碼
    const existingOtp = otpMap.get(account);
    if(existingOtp && Date.now() - existingOtp.lastSentAt < 60*1000){
        throw new Error("Please wait before requesting another code.");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    otpMap.set(account, {
      code,
      expiresAt: Date.now() + OPT_EXPIRE_MS,
      lastSentAt: Date.now()
    });

    return code;
  },
  verifyOtp(account: string, code: string):boolean{
    const record = otpMap.get(account);
    if(!record) return false;

    // 檢查otp是否過期
    if(Date.now() > record.expiresAt){
        otpMap.delete(account);
        return false;
    }

    // 檢查otp是否正確
    if(record.code !== code) return false;

    otpMap.delete(account); // verify successfull delete code automatically
    return true;
  }
};
