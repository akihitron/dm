

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_AUTH_TOKEN: string;
      NODE_ENV: 'development' | 'production';
      DATABASE_URL: string;
      NODE_CLUSTER: string;
      PORT?: string;
      PWD: string;
    }
  }
}






export { }