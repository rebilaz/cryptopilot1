import type { AuthOptions } from "next-auth";

if (!process.env.NEXTAUTH_URL) console.warn("NEXTAUTH_URL is not set");
if (!process.env.NEXTAUTH_SECRET) console.warn("NEXTAUTH_SECRET is not set");

export const authOptions: AuthOptions = {
  providers: [],
  session: { strategy: "jwt" },
};
