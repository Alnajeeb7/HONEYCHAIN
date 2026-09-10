import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const channelName = 'vanachain-channel';
const chaincodeName = 'vanachain';

const cryptoPath = process.env.CRYPTO_PATH || path.resolve('..', '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations');

async function newGrpcConnection(tlsCertPath, peerEndpoint, peerHostAlias) {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity(mspId, certDirectoryPath) {
    const certFiles = await fs.readdir(certDirectoryPath);
    const credentials = await fs.readFile(path.join(certDirectoryPath, certFiles[0]));
    return { mspId, credentials };
}

async function newSigner(keyDirectoryPath) {
    const keyFiles = await fs.readdir(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(path.join(keyDirectoryPath, keyFiles[0]));
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

export async function getContractForOrg(orgNumber) {
    try {
        const orgName = `org${orgNumber}.example.com`;
        const mspId = `Org${orgNumber}MSP`;
        const peerEndpoint = orgNumber === 1 ? 'localhost:7051' : 'localhost:9051';
        const peerHostAlias = `peer0.${orgName}`;

        const orgCryptoPath = path.join(cryptoPath, orgName);
        const keyDirectoryPath = path.join(orgCryptoPath, 'users', `User1@${orgName}`, 'msp', 'keystore');
        const certDirectoryPath = path.join(orgCryptoPath, 'users', `User1@${orgName}`, 'msp', 'signcerts');
        const tlsCertPath = path.join(orgCryptoPath, 'peers', peerHostAlias, 'tls', 'ca.crt');

        const client = await newGrpcConnection(tlsCertPath, peerEndpoint, peerHostAlias);
        const gateway = connect({
            client,
            identity: await newIdentity(mspId, certDirectoryPath),
            signer: await newSigner(keyDirectoryPath),
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
            endorseOptions: () => ({ deadline: Date.now() + 15000 }),
            submitOptions: () => ({ deadline: Date.now() + 5000 }),
            commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
        });

        const network = gateway.getNetwork(channelName);
        return { contract: network.getContract(chaincodeName), gateway };
    } catch (e) {
        console.warn(`Fabric connection failed for Org${orgNumber}. Make sure the test-network is running.`, e.message);
        return null;
    }
}
