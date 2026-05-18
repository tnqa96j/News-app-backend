import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_SECRET_ID,
  "postmessage",
);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  pic: string;
}

export const googleService = {
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> { // <GoogleLogin>元件流程
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) throw new Error("Invalid Google Token");
    if (!payload.email_verified)
      throw new Error(
        "This Google account's email address has not been verified.",
      );

    return {
      googleId: payload.sub, // Google 使用者的永久唯一 ID，不會因為使用者改 email 而變動
      email: payload.email ?? "",
      name: payload.name ?? "user",
      pic: payload.picture ?? "",
    };
  },
  async getUserInfoFromCode(code: string): Promise<GoogleUserInfo> { // useGoogleLogin flow: 'auth-code'流程
    // 1. 用code換tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    // 2. 用id_token解析使用者資訊
    if (!tokens.id_token) throw new Error("No id_token received");

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid token payload");
    if (!payload.email_verified)
      throw new Error(
        "This Google account's email address has not been verified.",
      );

    return {
      googleId: payload.sub,
      email: payload.email ?? "",
      name: payload.name ?? "user",
      pic: payload.picture ?? "",
    };
  },
};
