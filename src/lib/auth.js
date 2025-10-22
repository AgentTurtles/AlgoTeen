import CredentialsProvider from 'next-auth/providers/credentials';

import { SupabaseAdapter } from './supabaseAdapter';
import { verifyPassword } from './passwords';
import { getCredentialsByUsername, getCredentialsByUserId, getAlpacaCredentials } from './userStore';

const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'algoteen-dev-secret';

const supabaseAdapter = SupabaseAdapter();

export const authOptions = {
  adapter: supabaseAdapter,
  secret: AUTH_SECRET,
  session: {
    strategy: 'database'
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup'
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password ?? '';

        if (!username || password.length === 0) {
          return null;
        }

        const record = await getCredentialsByUsername(username);
        if (!record || !record.password_hash) {
          return null;
        }

        const valid = verifyPassword(password, record.password_hash);
        if (!valid) {
          return null;
        }

        const user = await supabaseAdapter.getUser(record.user_id);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.username ?? user.name ?? username,
          email: user.email ?? null
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.name = user.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.sub) {
        return null;
      }

      const user = await supabaseAdapter.getUser(token.sub);
      if (!user) {
        return null;
      }

      const credentials = await getCredentialsByUserId(token.sub);
      const alpaca = await getAlpacaCredentials(token.sub);

      return {
        ...session,
        user: {
          ...(session?.user ?? {}),
          id: user.id,
          name: user.username ?? user.name ?? credentials?.username ?? null,
          username: credentials?.username ?? null,
          email: user.email ?? null
        },
        alpaca: {
          hasCredentials: Boolean(alpaca?.apiKey && alpaca?.secretKey),
          account: alpaca?.account ?? null
        }
      };
    }
  }
};

export function getSupabaseAuthAdapter() {
  return supabaseAdapter;
}
