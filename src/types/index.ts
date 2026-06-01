export interface SplitwiseConfig {
  consumerKey: string;
  consumerSecret: string;
}

export interface OAuthTokens {
  accessToken: string;
  tokenSecret: string;
}

export interface FriendBalance {
  friendId: number;
  friendName: string;
  amount: number;
  currency: string;
}

export interface SplitwiseApi {
  getFriends: () => Promise<FriendBalance[]>;
  createPayment: (friendId: number, amount: number, description?: string) => Promise<{ expenseId: number }>;
}

export interface AppConfig {
  splitwise: SplitwiseConfig;
  defaultRecipient: {
    phone: string;
    name: string;
    splitwiseFriendId?: number;
  };
  preferences: {
    currency: string;
  };
  userName?: string;
}

export const DEFAULT_CONFIG_PATH = '~/.auto-settle/config.json';
export const DEFAULT_OAUTH_PATH = '~/.auto-settle/oauth.json';