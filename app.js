const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
const abi = require("./abi.json");
const converter = require("hex2dec");
const PORT = process.env.PORT || 3000;
const alchemyMumbai = process.env.ALCHEMY_MUMBAI;
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const Web3 = require("web3");
const e = require("express");

const web3 = new Web3("wss://polygon-mumbai.g.alchemy.com/v2/" + alchemyMumbai);

console.log("Web3 is connected: ", web3.version);

const contract = new web3.eth.Contract(
  abi,
  "0x2125aF4B5a1F21Bf2f6F218384Ee89a18E30AaB6"
);

contract.events.Notify().on("data", (event) => {
  console.log(event.returnValues);
  sendNotif(event.returnValues.wallet_address, event.returnValues.notif_id);
});

app.get("/", (req, res) => {
  res.status(200).send("Alive!");
});

app.get("/user/:address", async (req, res) => {
  const walletAddress = req.params.address;
  try {
    await client.connect();
    const collection = client.db("Users").collection("userData");
    const user = await collection.findOne({ walletAddress: walletAddress });
    if (user) {
      res.status(200).send(user);
    } else {
      res.status(200).send("User not found");
    }
  } catch (err) {
    console.log(err);
  } finally {
    await client.close();
  }
});

app.post("/userAdd/:address/:mail", async (req, res) => {
  const walletAddress = req.params.address;
  const email = req.params.mail;
  console.log(walletAddress, email);
  try {
    await client.connect();
    const collection = client.db("Users").collection("userData");
    await collection.insertOne({ walletAddress: walletAddress, email: email });
    res.status(200).send("User added");
  } catch (err) {
    console.log(err);
  } finally {
    client.close();
  }
});

const sendNotif = async (walletAddress, notifId) => {
  try {
    await client.connect();
    console.log(walletAddress, notifId);
    const wallet = converter.decToHex(walletAddress);
    const collection = client.db("Users").collection("userData");
    console.log(wallet);
    const user = await collection.findOne({ walletAddress: wallet });
    userEmail = user.email;

    console.log(user);
  } catch (err) {
    console.log(err);
  } finally {
    await client.close();
  }
};

// const decodeLogs = web3.eth.abi.decodeLog(
//   [
//     {
//       type: "string",
//       name: "Notify",
//     },
//     {
//       type: "string",
//       name: "wallet_address",
//       indexed: true,
//     },
//     {
//       type: "string",
//       name: "notif_id",
//       indexed: true,
//     },
//   ],
//   "0x30fe45f857a9ef2c6e22b94a540dc3eefb6e8a0d9d9e8bb4dce4fc7b70c2e10c",
//   [
//     "0xbcc61b31df5d8e174537448a908c8b8c6003800f2e45099d43df746d7f6ad3ff",
//     "0x6ccd092cf10acb50fdcae863c500b18fcf6750054552bd31a866915ab8f99f72",
//   ]
// );

// console.log(decodeLogs);

// const logs = web3.eth.abi.decodeLog(
sendNotif("43690047485523017521719660013406923964685528852", "test_notif_1");

app.listen(PORT);
