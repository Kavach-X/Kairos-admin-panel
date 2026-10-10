import { createAuthClient } from "better-auth/react";
import { emailOTPClient, phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL!,
  basePath: process.env.NEXT_PUBLIC_AUTH_BASE_PATH || "/api/auth",
  plugins: [emailOTPClient(), phoneNumberClient()],
});

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient;
