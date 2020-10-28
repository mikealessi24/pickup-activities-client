require("dotenv").config();
const express = require("express");
const sql = require("mysql2/promise");
const cors = require("cors");
const PORT = 4000;
const authorizeUser = require("./authorize/function");
const aws = require("aws-sdk");

aws.config.setPromisesDependency();
aws.config.update({
  accessKeyId: process.env.s3TokenKey,
  secretAccessKey: process.env.s3Secret,
  region: "us-east-1",
});
const s3 = new aws.S3();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const pool = sql.createPool({
  host: process.env.host,
  user: process.env.myuser,
  password: process.env.password,
});

app.post("/create-user", authorizeUser, async (req, resp) => {
  console.log("create user hit");
  try {
    const conn = await pool.getConnection();
    const username = req.decodedToken["cognito:username"];
    const avatar = req.body.avatar;
    const response = await conn.execute(
      "INSERT INTO pickup.users (username, avatar) VALUES (?,?)",
      [username, avatar]
    );
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/get-user", authorizeUser, async (req, resp) => {
  console.log("get user hit");
  try {
    const username = req.decodedToken["cognito:username"];
    const conn = await pool.getConnection();
    const response = await conn.execute(
      "Select * FROM pickup.users WHERE username=?",
      [username]
    );
    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/get-s3-pic", authorizeUser, async (req, resp) => {
  console.log("get s3 pic hit");
  try {
    const username = req.decodedToken["cognito:username"];
    const conn = await pool.getConnection();
    const response = await conn.execute(
      "SELECT * FROM pickup.users WHERE username=?",
      [username]
    );
    conn.release();
    console.log("response", response[0][0]);
    const avatarPath = `${response[0][0].avatar}`;
    console.log("file path:", avatarPath);

    const params = {
      Bucket: "pickupimg193505-dev",
      Key: avatarPath,
      Expires: 30,
    };

    s3.getSignedUrlPromise("getObject", params)
      .then((url) => {
        console.log(url);
        resp.status(200).send(url);
      })

      .catch((err) => resp.status(500).send(err));
  } catch (error) {
    console.log(error);
    resp.status(500).send(error);
  }
});

app.listen(PORT, () => console.log("app is listening on", PORT));
