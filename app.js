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
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

const Web3 = require("web3");

const web3 = new Web3("wss://polygon-mumbai.g.alchemy.com/v2/" + alchemyMumbai);

console.log("Web3 is connected: ", web3.version);

// web3.eth.subscribe(
//   "logs",
//   {
//     address: "0xeE2e79cDc8825c34D52EcF25c8BE998b892090d5",
//     topics: [
//       "0x30fe45f857a9ef2c6e22b94a540dc3eefb6e8a0d9d9e8bb4dce4fc7b70c2e10c",
//     ],
//   },
//   function (error, result) {
//     if (!error) console.log(result);
//   }
// );

const contract = new web3.eth.Contract(
  abi,
  "0x2125aF4B5a1F21Bf2f6F218384Ee89a18E30AaB6"
);

contract.events.Notify().on("data", (event) => {
  console.log(event.returnValues);
  sendNotif(event.returnValues.wallet_address, event.returnValues.notif_id);
});

const sendNotif = async (walletAddress, notifId) => {
  try {
    console.log(walletAddress, notifId);
  } catch (err) {
    console.log(err);
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
//   [
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
//   "0x",
//   [
//     "0xbcc61b31df5d8e174537448a908c8b8c6003800f2e45099d43df746d7f6ad3ff",
//     "0x6ccd092cf10acb50fdcae863c500b18fcf6750054552bd31a866915ab8f99f72",
//   ]
// );

// var hex = converter.decToHex("43690047485523017521719660013406923964685528852");
// console.log(hex);
// console.log(logs);

app.listen(PORT);
