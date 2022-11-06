const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
const abiTableland = require("./abiTableland.json");
const abi = require("./abi.json");
const converter = require("hex2dec");
const PORT = process.env.PORT || 3000;
const alchemyMumbai = process.env.ALCHEMY_MUMBAI;
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
const uri = process.env.MONGO_URI;
const courierKey = process.env.COURIER_API_KEY;

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

const contractTableland = new web3.eth.Contract(
  abiTableland,
  "0x4b48841d4b32C4650E4ABc117A03FE8B51f38F68"
);

contract.events.Notify().on("data", (event) => {
  console.log(event.returnValues);
  sendNotif(event.returnValues.wallet_address, event.returnValues.notif_id);
});

contractTableland.events.RunSQL().on("data", async (event) => {
  console.log(event.returnValues);
  const url =
    "https://discord.com/api/webhooks/1038404742507941941/ql5G58gcJmZTqKS6ru5vMrRMGGIAzHygiRrhWvrkcEdIEs6AjZxsJXN6jS9MEikexhNa";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: `A new query has been run on Tableland Network. The query is: ${event.returnValues.statement} by ${event.returnValues.caller}`,
    }),
  };
  const response = await fetch(url, options);
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
      res.status(200).json({
        message: "User not found",
      });
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
    const tablelandUrl = `https://testnet.tableland.network/query?mode=json&s=select%20*%20from%20notif_table_80001_2728%20where%20notif_name%20=%20%27${notifId}%27`;
    const res = await fetch(tablelandUrl);
    const data = await res.json();
    const ipfs_hash = data[0].ipfs_hash;
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfs_hash}`;
    const ipfsResponse = await fetch(ipfsUrl);
    const ipfsData = await ipfsResponse.json();
    console.log(ipfsData);
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + courierKey,
      },
      body: JSON.stringify({
        message: {
          template: "4HNG8QHVCF4MZHGEQS0EF6CJ17EP",
          data: {
            notification: ipfsData.message,
            companyName: data[0].company_name,
          },
          to: {
            email: userEmail,
          },
          brand_id: "N3CA06ENV84GRMMDWVJF3DT615E0",
        },
      }),
    };

    const response = await fetch("https://api.courier.com/send", options);
    const resdata = await response.json();
    console.log(resdata);
  } catch (err) {
    console.log(err);
  } finally {
    await client.close();
  }
};

app.listen(PORT);
