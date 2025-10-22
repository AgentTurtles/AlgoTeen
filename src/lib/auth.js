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
    strategy: 'jwt'
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
        try {
          const username = credentials?.username?.trim();
          const password = credentials?.password ?? '';
    
          if (!username || password.length === 0) {
            return null;
          }
    
          const record = await getCredentialsByUsername(username);
          if (!record?.password_hash) {
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
            name: user.username || user.name || username,
            email: user.email || null
          };
        } catch (error) {
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    }
  }
};

export function getSupabaseAuthAdapter() {
  return supabaseAdapter;
}
