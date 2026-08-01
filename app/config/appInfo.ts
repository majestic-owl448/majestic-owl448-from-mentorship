// Shared by the frontend and backend SuperTokens config, so everything here must
// be readable in the browser (NEXT_PUBLIC_*).
export const appInfo = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "majestic-owl448",
  apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN ?? "http://localhost:3000",
  websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ?? "http://localhost:3000",
  apiBasePath: "/api/auth",
  websiteBasePath: "/auth",
};
