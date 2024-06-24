exports.authConfig = {
  Auth: {
    Cognito: {
      userPoolClientId: "3e8tou4g3lhrv8gclsh4pa1q2a",
      userPoolId: "ap-south-1_0TvHBu6WE",
      loginWith: {
        oauth: {
          domain: "reviser530.auth.ap-south-1.amazoncognito.com",
          redirectSignIn: ["http://localhost:3000/callback"],
          redirectSignOut: ["http://localhost:3000/"],
          scopes: ["phone", "email", "openid","profile"],
          responseType: "code",
        },
      },
    },
  },
};
