import type { AuthOptions } from "next-auth";

if (!process.env.NEXTAUTH_URL) {
  console.warn("NEXTAUTH_URL environment variable is not set.");
}
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
  console.warn("NEXTAUTH_SECRET environment variable is not set.");
}

export const authOptions: AuthOptions = {
  providers: [],
  session: { strategy: "jwt" },
  secret: nextAuthSecret || undefined,
};
