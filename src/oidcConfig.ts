import * as oidc from "openid-client";

let getGithubConfig = () => {
  const clientId = process.env.GITHUB_CLIENT_ID as string;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET as string;

  return new oidc.Configuration(
    {
      issuer: "https://github.com/login/oauth/authorize",
      authorization_endpoint: "https://github.com/login/oauth/authorize",
      token_endpoint: "https://github.com/login/oauth/access_token",
    },
    clientId,
    clientSecret
  );
};

export { getGithubConfig };
