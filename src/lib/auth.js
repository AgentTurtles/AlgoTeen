const ALPACA_ACCOUNT_URL = process.env.ALPACA_ACCOUNT_URL ?? 'https://paper-api.alpaca.markets/v2/account';
const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'algoteen-dev-secret';

async function fetchAlpacaAccount(apiKey, secretKey) {
  try {
    const response = await fetch(ALPACA_ACCOUNT_URL, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey
      }
    });

    if (!response.ok) {
      throw new Error('Invalid Alpaca credentials');
    }

    return response.json();
  } catch (error) {
    throw new Error('Unable to reach Alpaca account endpoint');
  }
}

export const authOptions = {
  secret: AUTH_SECRET,
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin'
  },
  providers: [
    {
      id: 'alpaca',
      name: 'Alpaca',
      type: 'credentials',
      async authorize(credentials) {
        const apiKey = credentials?.apiKeyId?.trim?.() ?? credentials?.apiKey?.trim?.();
        const secretKey = credentials?.secretKey?.trim?.();
        if (!apiKey || !secretKey) {
          return null;
        }
        try {
          const account = await fetchAlpacaAccount(apiKey, secretKey);
          return {
            id: account.id,
            account,
            alpaca: {
              apiKey,
              secretKey
            }
          };
        } catch (error) {
          return null;
        }
      }
    }
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.alpaca) {
        return {
          ...token,
          sub: user.id,
          alpaca: {
            apiKey: user.alpaca.apiKey,
            secretKey: user.alpaca.secretKey,
            account: user.account
          },
          account: user.account
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.alpaca?.apiKey || !token?.alpaca?.secretKey) {
        return null;
      }

      const nextSession = {
        ...(session ?? {}),
        user: {
          ...(session?.user ?? {}),
          id: token.sub ?? session?.user?.id ?? null,
          account: token?.alpaca?.account ?? session?.user?.account ?? null
        },
        alpaca: {
          account: token.alpaca.account,
          hasCredentials: true
        }
      };

      return nextSession;
    }
  }
};
