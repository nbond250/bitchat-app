// Relay server URL (change if hosting backend elsewhere)
const relayURL = "http://localhost:3000";

let myKeyPair;
let myPublicKeyBase64;
let walletAddress;
let provider;
let signer;

window.onload = () => {
  // Generate or load encryption key pair from localStorage
  const savedPrivateKey = localStorage.getItem("myPrivateKey");

  if (savedPrivateKey) {
    const secretKey = nacl.util.decodeBase64(savedPrivateKey);
    myKeyPair = nacl.box.keyPair.fromSecretKey(secretKey);
  } else {
    myKeyPair = nacl.box.keyPair();
    localStorage.setItem("myPrivateKey", nacl.util.encodeBase64(myKeyPair.secretKey));
  }

  myPublicKeyBase64 = nacl.util.encodeBase64(myKeyPair.publicKey);
  document.getElementById("myPublicKey").value = myPublicKeyBase64;

  // Wallet connect button
  document.getElementById("connectWalletBtn").onclick = connectWallet;
};

async function connectWallet() {
  if (window.ethereum === undefined) {
    alert("MetaMask or compatible wallet is required.");
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    walletAddress = await signer.getAddress();
    document.getElementById("walletAddress").value = walletAddress;
    alert("Wallet connected: " + walletAddress);
  } catch (err) {
    alert("Wallet connection failed: " + err.message);
  }
}

async function sendMessage() {
  if (!walletAddress || !signer) {
    alert("Please connect your wallet first.");
    return;
  }

  const recipientKeyBase64 = document.getElementById("recipientKey").value.trim();
  const messageText = document.getElementById("message").value.trim();

  if (!recipientKeyBase64 || !messageText) {
    alert("Recipient key and message are required.");
    return;
  }

  try {
    // Sign the message with wallet (personal_sign)
    const signature = await signer.signMessage(messageText);

    // Prepare JSON with message + signature
    const payloadObject = {
      message: messageText,
      signature: signature,
    };

    const payloadStr = JSON.stringify(payloadObject);
    const payloadUint8 = nacl.util.decodeUTF8(payloadStr);

    // Encrypt the payload with recipient's encryption key and our secret key
    const recipientKey = nacl.util.decodeBase64(recipientKeyBase64);
    const nonce = nacl.randomBytes(24);
    const box = nacl.box(payloadUint8, nonce, recipientKey, myKeyPair.secretKey);

    // Send encrypted data to relay server
    const payload = {
      senderWallet: walletAddress,
      senderEncryptionKey: myPublicKeyBase64,
      recipientEncryptionKey: recipientKeyBase64,
      nonce: nacl.util.encodeBase64(nonce),
      message: nacl.util.encodeBase64(box),
    };

    const res = await fetch(relayURL + "/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert("✅ Message sent!");
    } else {
      alert("❌ Failed to send message.");
    }
  } catch (e) {
    console.error(e);
    alert("❌ Error sending message: " + e.message);
  }
}

async function loadMessages() {
  const inbox = document.getElementById("inbox");
  inbox.innerHTML = "";

  try {
    const res = await fetch(relayURL + "/messages");
    const messages = await res.json();

    for (const msg of messages) {
      try {
        // Check if message is intended for us (match our public encryption key)
        if (msg.recipientEncryptionKey !== myPublicKeyBase64) {
          continue;
        }

        const nonce = nacl.util.decodeBase64(msg.nonce);
        const box = nacl.util.decodeBase64(msg.message);
        const senderKey = nacl.util.decodeBase64(msg.senderEncryptionKey);

        const decrypted = nacl.box.open(box, nonce, senderKey, myKeyPair.secretKey);

        if (!decrypted) continue;

        const decryptedStr = nacl.util.encodeUTF8(decrypted);
        const payloadObj = JSON.parse(decryptedStr);

        // Verify signature using ethers.js
        const recoveredAddress = ethers.utils.verifyMessage(payloadObj.message, payloadObj.signature);

        const isValid = recoveredAddress.toLowerCase() === msg.senderWallet.toLowerCase();

        const li = document.createElement("li");
        li.textContent = isValid
          ? `From ${msg.senderWallet.substring(0, 10)}...: ${payloadObj.message} (✔️ signature valid)`
          : `From ${msg.senderWallet.substring(0, 10)}...: ${payloadObj.message} (❌ invalid signature)`;

        inbox.appendChild(li);
      } catch (err) {
        // Ignore individual message errors
        console.warn("Failed to decrypt or verify a message", err);
      }
    }
  } catch (err) {
    console.error("Error loading messages:", err);
    alert("❌ Failed to load messages.");
  }
}
