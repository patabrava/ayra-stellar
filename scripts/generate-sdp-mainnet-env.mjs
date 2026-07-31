#!/usr/bin/env node

import {
  generateKeyPairSync,
  randomBytes,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outputPath = path.resolve("deploy/hostinger-sdp-mainnet/.env");
if (fs.existsSync(outputPath) && !process.argv.includes("--force")) {
  console.error(`Refusing to overwrite ${outputPath}. Use --force to rotate it.`);
  process.exit(1);
}

const distribution = stellarKeypair();
const sep10 = stellarKeypair();
const distributionEncryption = stellarKeypair();
const channelEncryption = stellarKeypair();
const { privateKey: ecPrivateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const ec256 = ecPrivateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString()
  .trim()
  .replaceAll("\n", "\\n");

const values = {
  SDP_API_HOST: "sdp-mainnet-api.ayra.haus",
  SDP_DASHBOARD_HOST: "sdp-mainnet-dashboard.ayra.haus",
  DATABASE_NAME: "sdp_ayra_mainnet",
  POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
  ADMIN_ACCOUNT: "AYRA-sdp-mainnet-admin",
  ADMIN_API_KEY: randomBytes(32).toString("hex"),
  DISTRIBUTION_PUBLIC_KEY: distribution.publicKey,
  DISTRIBUTION_SEED: distribution.secretKey,
  SEP10_SIGNING_PUBLIC_KEY: sep10.publicKey,
  SEP10_SIGNING_PRIVATE_KEY: sep10.secretKey,
  DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE:
    distributionEncryption.secretKey,
  CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE: channelEncryption.secretKey,
  SEP24_JWT_SECRET: randomBytes(32).toString("hex"),
  EC256_PRIVATE_KEY: ec256,
  DEFAULT_TENANT_OWNER_EMAIL:
    process.env.AYRA_MAINNET_OWNER_EMAIL || "capoks817@gmail.com",
};

const text = `${Object.entries(values)
  .map(([key, value]) => `${key}='${value}'`)
  .join("\n")}\n`;
fs.writeFileSync(outputPath, text, { encoding: "utf8", mode: 0o600 });
fs.chmodSync(outputPath, 0o600);

console.log(
  JSON.stringify(
    {
      created: outputPath,
      distributionPublicKey: distribution.publicKey,
      sep10SigningPublicKey: sep10.publicKey,
      secretValuesPrinted: false,
    },
    null,
    2,
  ),
);

function stellarKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicJwk = publicKey.export({ format: "jwk" });
  const privateJwk = privateKey.export({ format: "jwk" });
  const publicBytes = Buffer.from(publicJwk.x, "base64url");
  const seedBytes = Buffer.from(privateJwk.d, "base64url");
  return {
    publicKey: encodeStrKey(6 << 3, publicBytes),
    secretKey: encodeStrKey(18 << 3, seedBytes),
  };
}

function encodeStrKey(versionByte, payload) {
  const body = Buffer.concat([Buffer.from([versionByte]), payload]);
  const checksum = crc16Xmodem(body);
  return base32Encode(
    Buffer.concat([
      body,
      Buffer.from([checksum & 0xff, (checksum >> 8) & 0xff]),
    ]),
  );
}

function crc16Xmodem(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

function base32Encode(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
