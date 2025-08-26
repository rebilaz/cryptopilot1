import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/auth/signin' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase?.().trim?.();
        const password = credentials?.password;
        if (!email || !password) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  const u: any = user;
  if (!u || !u.passwordHash) return null;
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return null;
  return { id: u.id, name: u.name ?? u.email, email: u.email } as any;
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) (session.user as any).id = token.sub;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Ensure relative/allowed redirects only
      if (url.startsWith('/')) return baseUrl + url;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + '/dashboard';
    }
  }
};
