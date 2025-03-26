const fs = require("fs");
const axios = require("axios");
const { Wallet } = require("ethers");
const crypto = require("crypto");
const path = require("path");
const config = require("../../config");
const { log } = require("../utils");
const pLimit = require("p-limit");

async function signMessage(wallet) {
    const nonce = generateNonce();
    const timestamp = new Date().toISOString();
    const message = `klokapp.ai wants you to sign in with your Ethereum account:
${wallet.address}


URI: https://klokapp.ai/
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${timestamp}`;

    return {
        signature: await wallet.signMessage(message),
        message: message,
        nonce: nonce,
        timestamp: timestamp
    };
}

function generateNonce() {
    return Buffer.from(crypto.randomBytes(48)).toString("hex");
}

const MAX_RETRIES = 5; 
const RETRY_DELAY = 3000;

async function authenticate(wallet) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            const signResult = await signMessage(wallet);

            const payload = {
                signedMessage: signResult.signature,
                message: signResult.message,
                referral_code: `${config.REFERRAL_CODE}`,
            };

            log(`[INFO] Authenticating for ${wallet.address}...`, "info");

            const response = await axios.post(`${config.BASE_URL}/verify`, payload, {
                headers: config.DEFAULT_HEADERS,
                timeout: 60000, 
            });

            const { session_token } = response.data;
            log(`[SUCCESS] Token received for ${wallet.address}`, "success");

            const tokenPath = path.join(process.cwd(), "session-token.key");
            fs.appendFileSync(tokenPath, `${session_token}\n`);
            return session_token;
        } catch (error) {
            attempt++;
            log(`[ERROR] Attempt ${attempt} failed for ${wallet.address}: ${error.message}`, "error");
            if (error.response) {
                log(`[ERROR] Status: ${error.response.status}, Data:`, error.response.data, "error");
            }

            if (attempt < MAX_RETRIES) {
                log(`[INFO] Retrying for ${wallet.address} in ${RETRY_DELAY / 1000} seconds...`, "info");
                await delay(RETRY_DELAY);
            }
        }
    }
    log(`[ERROR] All attempts failed for ${wallet.address}`, "error");
    return null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    authenticate,
    signMessage,
    generateNonce,
    authenticateAllWallets: async (privateKeys) => {
        const tokens = [];
        const limit = pLimit(config.THREADS || 10); 

        if (!privateKeys || privateKeys.length === 0) {
            log("[ERROR] No private keys provided", "error");
            return tokens;
        }

        const promises = privateKeys.map(key =>
            limit(async () => {
                try {
                    const wallet = new Wallet(key.trim());
                    const token = await authenticate(wallet);
                    if (token) tokens.push(token);
                } catch (error) {
                    log(`[ERROR] Invalid private key: ${error.message}`, "error");
                }
            })
        );

        await Promise.all(promises);
        return tokens;
    }
};