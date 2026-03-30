export type Env = {
  DB?: D1Database;
  ARTIFACTS?: R2Bucket;
  GITHUB_TOKEN?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AUTH_COOKIE_SECRET?: string;
  ASSETS?: Fetcher;
};
