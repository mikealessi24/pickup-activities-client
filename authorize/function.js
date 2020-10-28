const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");

function authorizeUser(request, response, next) {
  console.log("auth user hit");
  if (request.body.token == null) {
    console.log("token is undefined");
    return response.status(401).send();
  }
  const jwk = {
    keys: [
      {
        alg: "RS256",
        e: "AQAB",
        kid: "HPXQt3m01Jf8AyrrCxNwS4Pt5DcfT46jWfyTAzJSfGY=",
        kty: "RSA",
        n:
          "jK5hN69TFLKu3ffXZxYNBXOuOuV1kb5a-kPI4gyYzNHm7cvgDfC_5NP__mOZfxISzc1T64EZuTl59RSC1a4BODio-26b6b8u2P0ejhCLE_GNMEnrDQX2NvM6LtzZMxrM0b4MhPuimFIF-L3fKgPe3F_WQhUMO5LXqOaFoDy4KUMZ7SQ-J-hoWrD69rvgp9sV1R-VMj6YRmINmivFBP75Q-mdcCkneOL3PQQ3HfQYqrqQkV9eP0Qg8l8ouQtAu7aKMmT_ICDlbBT5AfBXdJQ5t1on3rzNiqjGJRpeaEE4z8eiynAWxbJqgckRhyMASkjNe9MpGc4Xzsi-B01vxh-e8Q",
        use: "sig",
      },
      {
        alg: "RS256",
        e: "AQAB",
        kid: "Bmi52GaMSDbG3vWZVknyFiJ1lAOxbYCe3KH1f8meZck=",
        kty: "RSA",
        n:
          "tGkvcU2SxEqQz2upmcM6RtI7boMCDxojyqymmQFPOxbmBCBJy2JLlR55vX4gw7AefSHqmdPQeG2eg8chnkHNk0OzVh5aEeCK3uis0rx46KHTjpjWFIhlgxG9BFrTLen4cUJATUn0J5RopkZGfp522CTtAVneYbJBBXfGU3Cowuw2JGB65zBX3tnfDAncrPotBXESxNTg4XaHtzUMP9eq4B8TTtXU-mDuzWmo-U_sUzDjLYb4ywMSj1_K0RjwLrHB4GHWFFkCfqBh_oC1oaWVZMSFp8oPykRSLvyZFtKWeACQghRSsINBl2Ufu8AuNZ2NHsu39cAnI0Dw5xVZL6uIGQ",
        use: "sig",
      },
    ],
  };
  const jwkForIdToken = jwk.keys[0];
  const pem = jwkToPem(jwkForIdToken);
  try {
    jwt.verify(request.body.token, pem, (error, decodedToken) => {
      if (error) {
        console.log(error);
        return response.status(403).send(error);
      }
      // console.log('decoded token', decodedToken);
      request.decodedToken = decodedToken;
      next();
    });
  } catch (error) {
    return response.status(500).send(error);
  }
}

module.exports = authorizeUser;
