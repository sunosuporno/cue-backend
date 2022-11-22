const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
const abiTableland = require("./abiTableland.json");
const abi = require("./abi.json");
const offChainOracleAbi = require("./oracleAbi.json");
const multiCallAbi = require("./multiCallAbi.json");
const usdcAbi = require("./usdcAbi.json");
const converter = require("hex2dec");
const PORT = process.env.PORT || 3000;
const alchemyMumbai = process.env.ALCHEMY_MUMBAI;
const alchemyEth = process.env.ALCHEMY_ETH_MAINNET;
const backendUrl = process.env.BACKEND_URL;
const { BigNumber } = require("ethers");
const ethers = require("ethers");
const schedule = require("node-schedule");

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

const web3Eth = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${alchemyEth}`);

const providerEthSocket = new ethers.providers.JsonRpcProvider(
  `https://eth-mainnet.g.alchemy.com/v2/${alchemyEth}`
);

const web3EthSocket = new Web3(
  `wss://eth-mainnet.g.alchemy.com/v2/${alchemyEth}`
);

console.log("Web3 is connected: ", web3.version);

const contract = new web3.eth.Contract(
  abi,
  "0x2125aF4B5a1F21Bf2f6F218384Ee89a18E30AaB6"
);

const contractTableland = new web3EthSocket.eth.Contract(
  abiTableland,
  "0x8EAa9AE1Ac89B1c8C8a8104D08C045f78Aadb42D"
);

const offChainOracleAddress = "0x07D91f5fb9Bf7798734C3f606dB065549F6893bb";
const multiCallAddress = "0xda3c19c6fe954576707fa24695efb830d9cca1ca";
const offChainOracleContract = new web3Eth.eth.Contract(
  offChainOracleAbi,
  offChainOracleAddress
);
const multiCallContract = new web3Eth.eth.Contract(
  multiCallAbi,
  multiCallAddress
);
const usdcContract = new ethers.Contract(
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdcAbi,
  providerEthSocket
);

contract.events.Notify().on("data", (event) => {
  console.log(event.returnValues);
  sendNotif(event.returnValues.wallet_address, event.returnValues.notif_id);
});

contractTableland.events
  .Transfer()
  .on("connected", function (subscriptionId) {
    console.log(subscriptionId);
  })
  .on("data", async (event) => {
    console.log(event.returnValues.from);
    console.log(event.returnValues.to);
    const url =
      "https://discord.com/api/webhooks/1038404742507941941/ql5G58gcJmZTqKS6ru5vMrRMGGIAzHygiRrhWvrkcEdIEs6AjZxsJXN6jS9MEikexhNa";
    const url2 =
      "https://discord.com/api/webhooks/1044323152852942918/oLZwW1QbqJrPgsYJCBBhQY_c3yOQg6x-ONK3JillstI_gSQNEHC0H0m0zR-SRY1s7thv";
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `A new transfer has been made on Tableland Rigs Collection. The sender is: ${event.returnValues.from} the receiver is ${event.returnValues.to} and the token number is ${event.returnValues.tokenId}`,
      }),
    };
    const response = await fetch(url, options);
    const response2 = await fetch(url2, options);
  });

// usdcContract.events
//   .Transfer()
//   .on("connected", function (subscriptionId) {
//     console.log(subscriptionId);
//   })
//   .on("data", async (event) => {
//     console.log(event.returnvalues);
//   });

// usdcContract.on("Transfer", (from, to, value, event) => {
//   console.log(from, to, value, event);
// });

const tokens = [
  {
    address: "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
    decimals: 18,
  },
  {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    decimals: 6,
  },
  {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
    decimals: 6,
  },
  {
    address: "0x111111111117dc0aa78b770fa6a738034120c302", // 1INCH
    decimals: 18,
  },
];

const callData = tokens.map((token) => ({
  to: offChainOracleAddress,
  data: offChainOracleContract.methods
    .getRateToEth(
      token.address,
      true // use wrapper
    )
    .encodeABI(),
}));

const tokenPrices = async () => {
  multiCallContract.methods
    .multicall(callData)
    .call()
    .then(async ({ results, success }) => {
      const prices = {};
      for (let i = 0; i < results.length; i++) {
        if (!success[i]) {
          continue;
        }

        const decodedRate = web3.eth.abi
          .decodeParameter("uint256", results[i])
          .toString();
        const numerator = BigNumber.from(10).pow(tokens[i].decimals);
        const denominator = BigNumber.from(10).pow(18); // eth decimals
        const price = BigNumber.from(decodedRate)
          .mul(numerator)
          .div(denominator);
        prices[tokens[i].address] = price / 10 ** 18;
      }
      console.log(prices);
      const url = `${backendUrl}/sendTokenFloorPriceNotification`;
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prices: prices,
        }),
      };
      const res = await fetch(url, options);
    })
    .catch(console.log);
};

app.get("/", (req, res) => {
  res.status(200).send("Alive!");
});

const fetchNFTContract = async () => {
  const url =
    "https://testnet.tableland.network/query?mode=json&s=select%20distinct%20collection_address%20from%20nft_floor_table_5_913";
  const response = await fetch(url);
  const data = await response.json();
  console.log(data);
  return data;
};

const nftFloor = async () => {
  const nftFloorContracts = await fetchNFTContract();
  nftFloorContracts.forEach(async (contract) => {
    const url = `https://eth-mainnet.g.alchemy.com/nft/v2/${alchemyEth}/getFloorPrice?contractAddress=${contract.collection_address}`;
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };
    console.log(contract.collection_address);
    const response = await fetch(url, options);
    const data = await response.json();
    const price = data.openSea.floorPrice;
    const nftFloorData = {
      contract: contract.collection_address,
      price: price * 10 ** 18,
    };
    console.log(nftFloorData);
    const url2 = `${backendUrl}/sendNFTFloorNotification`;
    const options2 = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: nftFloorData,
      }),
    };
    const response2 = await fetch(url2, options2);
  });
};
// nftFloor();
const job = schedule.scheduleJob("0 0/1 * * *", async () => {
  await nftFloor();
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
