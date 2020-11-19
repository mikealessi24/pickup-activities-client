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
    resp.status(200).send({ message: "created account" });
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.put("/update-avatar", authorizeUser, async (req, resp) => {
  console.log("update avatar hit ");
  try {
    const conn = await pool.getConnection();
    const username = req.decodedToken["cognito:username"];
    const avatar = req.body.avatar;
    const response = await conn.execute(
      "UPDATE pickup.users SET avatar=? WHERE username=?",
      [avatar, username]
    );
    conn.release();
    resp.status(200).send(response);
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/update-user", authorizeUser, async (req, resp) => {
  console.log("update user hit");
  try {
    const conn = await pool.getConnection();
    const username = req.decodedToken["cognito:username"];
    //get original data
    const foo = await conn.execute(
      "SELECT * FROM pickup.users WHERE username=?",
      [username]
    );
    const oldData = foo[0][0];
    const firstname =
      req.body.firstname === "" || undefined
        ? oldData.firstname
        : req.body.firstname;
    const lastname =
      req.body.lastname === "" || undefined
        ? oldData.lastname
        : req.body.lastname;
    const about =
      req.body.about === "" || undefined ? oldData.about : req.body.about;

    const response = await conn.execute(
      `UPDATE pickup.users SET firstname=?, lastname=?, about=? WHERE username=?`,
      [firstname, lastname, about, username]
    );
    conn.release();
    resp.status(201).send({ message: "user updated" });
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

app.post("/get-other-user", authorizeUser, async (req, resp) => {
  console.log("get user by username hit");
  try {
    const user = req.body.user;
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `SELECT * FROM pickup.users WHERE username=?`,
      [user]
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
    const username = req.body.user
      ? req.body.user
      : req.decodedToken["cognito:username"];
    const conn = await pool.getConnection();
    const response = await conn.execute(
      "SELECT * FROM pickup.users WHERE username=?",
      [username]
    );
    conn.release();
    console.log("response", response[0][0]);
    const avatarPath = `public/${response[0][0].avatar}`;
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

app.post("/create-activity", authorizeUser, async (req, resp) => {
  console.log("create activity hit");
  try {
    const host = req.decodedToken["cognito:username"];
    const title = req.body.title;
    const time = req.body.time;
    const date = req.body.date;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const info = req.body.info;
    const numParticipants = req.body.numParticipants;
    const private = "no";
    const completed = "no";
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `INSERT INTO pickup.activities (host, title, time, date, latitude, longitude, info, numParticipants, private, completed) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        host,
        title,
        time,
        date,
        latitude,
        longitude,
        info,
        numParticipants,
        private,
        completed,
      ]
    );
    conn.release();
    resp.status(201).send({ message: "activity created" });
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/delete-active-post", authorizeUser, async (req, resp) => {
  console.log("delete active post hit");
  id = req.body.activityId;
  try {
    const conn = await pool.getConnection();
    const response1 = await conn.execute(
      `DELETE FROM pickup.participants WHERE activity=?`,
      [id]
    );
    const response2 = await conn.execute(
      `DELETE FROM pickup.activities WHERE id=?`,
      [id]
    );
    conn.release();
    resp.status(200).send({ message: "successfully deleted" });
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/update-active-post", authorizeUser, async (req, resp) => {
  console.log("update active post hit");
  try {
    const id = req.body.activityId;
    const title = req.body.title;
    const time = req.body.time;
    const date = req.body.date;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const info = req.body.info;
    const numParticipants = req.body.numParticipants;
    const private = req.body.private;
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `UPDATE pickup.activities SET title=?, time=?, date=?, latitude=?, longitude=?, info=?, numParticipants=?, private=? WHERE id=?`,
      [
        title,
        time,
        date,
        latitude,
        longitude,
        info,
        numParticipants,
        private,
        id,
      ]
    );
    conn.release();
    resp.status(200).send({ message: "successful update" });
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/get-activities", authorizeUser, async (req, resp) => {
  console.log("get all activities hit");
  const public = "no";
  const completed = "no";
  try {
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `SELECT * FROM pickup.activities WHERE private=? AND completed=?`,
      [public, completed]
    );
    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/get-specific-activity", authorizeUser, async (req, resp) => {
  console.log("get specific activity hit");
  try {
    const id = req.body.activityId;
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `SELECT * FROM pickup.activities WHERE id=?`,
      [id]
    );
    conn.release();
    resp.status(200).send(response[0][0]);
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/get-all-hosted", authorizeUser, async (req, resp) => {
  console.log("get activites hosted");
  const user = req.body.user
    ? req.body.user
    : req.decodedToken["cognito:username"];
  try {
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `SELECT * FROM pickup.activities WHERE host=?`,
      [user]
    );
    resp.status(200).send(response[0]);
    conn.release();
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/get-all-participated", authorizeUser, async (req, resp) => {
  console.log("get activites hosted");
  const user = req.body.user
    ? req.body.user
    : req.decodedToken["cognito:username"];
  try {
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `SELECT * FROM pickup.participants 
      Join pickup.activities 
      WHERE activities.id=participants.activity 
      AND participants.participant=?`,
      [user]
    );
    resp.status(200).send(response[0]);
    conn.release();
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/get-following-activities", authorizeUser, async (req, resp) => {
  console.log("get following activities hit");
  const username = req.decodedToken["cognito:username"];
  completed = "no";
  try {
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `SELECT * FROM (SELECT * FROM pickup.following WHERE following.follower=?) AS a
      JOIN pickup.activities ON activities.host=a.beingFollowed AND activities.completed=?`,
      [username, completed]
    );
    conn.release();
    console.log(response[0]);
    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send(error);
  }
});

app.post("/get-participant-count", authorizeUser, async (req, resp) => {
  console.log("get participants hit");
  const activity = req.body.activityId;
  try {
    const conn = await pool.getConnection();
    const response = await conn.query(
      `SELECT SUM(counter) AS numJoined FROM pickup.participants WHERE activity=?`,
      [activity]
    );
    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

// adds a participant based on the whether or not the activity is full
app.post("/add-participant", authorizeUser, async (req, resp) => {
  console.log("add participant hit");
  try {
    const activity = req.body.activityId;
    const participant = req.decodedToken["cognito:username"];
    const counter = req.body.counter;
    const conn = await pool.getConnection();

    const result1 = await conn.query(
      `SELECT numParticipants FROM pickup.activities WHERE id=?`,
      [activity]
    );
    const numAllowed = result1[0][0].numParticipants;

    const result2 = await conn.query(
      `SELECT SUM(counter) as numJoined FROM pickup.participants WHERE activity=?`,
      [activity]
    );
    const numJoined = result2[0][0].numJoined;

    console.log(Number(numJoined) + Number(counter));
    if (Number(numJoined) + Number(counter) === Number(numAllowed)) {
      await conn.execute(
        `INSERT INTO pickup.participants (activity,participant,counter) VALUES (?,?,?)`,
        [activity, participant, counter]
      );
      const complete = "yes";
      await conn.execute(
        `UPDATE pickup.activities SET completed=? WHERE id=?`,
        [complete, activity]
      );
      conn.release();
      return resp.status(200).send({ message: "success" });
    }

    if (Number(numJoined) + Number(counter) < Number(numAllowed)) {
      await conn.execute(
        `INSERT INTO pickup.participants (activity,participant,counter) VALUES (?,?,?)`,
        [activity, participant, counter]
      );
      conn.release();
      return resp.status(200).send({ message: "success" });
    } else {
      console.log("full");
      return resp.status(405).send({ message: "activity full" });
    }
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/follow", authorizeUser, async (req, resp) => {
  console.log("follow hit");
  try {
    const follower = req.decodedToken["cognito:username"];
    const beingFollowed = req.body.user;
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `INSERT INTO pickup.following (follower, beingFollowed) VALUES (?,?)`,
      [follower, beingFollowed]
    );
    conn.release();
    resp.status(201).send({ message: "successful follow" });
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/unfollow", authorizeUser, async (req, resp) => {
  console.log("unfollow hit");
  try {
    const follower = req.decodedToken["cognito:username"];
    const beingFollowed = req.body.user;
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `DELETE FROM pickup.following WHERE follower=? AND beingFollowed=?`,
      [follower, beingFollowed]
    );
    conn.release();
    resp.status(200).send({ message: "successful unfollow" });
  } catch (error) {
    console.log(error);
    resp.status(500).send(error);
  }
});

app.post("/get-following", authorizeUser, async (req, resp) => {
  console.log("get following hit");
  try {
    const follower = req.decodedToken["cognito:username"];
    const conn = await pool.getConnection();
    const response = await conn.execute(
      `SELECT * FROM pickup.following WHERE follower=?`,
      [follower]
    );
    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    resp.status(500).send(error);
    console.log(error);
  }
});

app.post("/search", authorizeUser, async (req, resp) => {
  console.log("get search results hit");
  try {
    const search = req.body.search;
    const private = "no";
    const completed = "no";
    const conn = await pool.getConnection();
    const response = await conn.execute(
      "SELECT * FROM pickup.activities WHERE title LIKE ? AND (private=? AND completed=?)",
      ["%" + search + "%", private, completed]
    );
    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send(error);
  }
});

app.listen(PORT, () => console.log("app is listening on", PORT));
