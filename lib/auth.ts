import type { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [],
  session: { strategy: "jwt" },
};
