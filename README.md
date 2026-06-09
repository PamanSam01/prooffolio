# Prooffolio 🛡️

**Prooffolio** is a decentralized, on-chain professional identity and reputation network built on the **Sui Blockchain**. It empowers professionals and organizations to establish verifiable credentials, discover talent, and build trust in a web3 native environment.

## 🌟 Key Features

*   **Passport Studio:** Mint your verifiable professional identity on the Sui ledger. Manage your skills, links, and baseline reputation securely.
*   **Organization Studio:** Register verified organizations to authorize the issuance of professional credentials.
*   **Decentralized Storage:** All visual assets and proof documents are pinned to the **Walrus Network** for permanent, decentralized availability.
*   **Talent Graph:** Discover and verify professionals across the network based on their on-chain reputation and issued credentials.
*   **Credential Portal:** Issue, track, and verify decentralized credentials directly to user passports.

## 🛠️ Technology Stack

*   **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion
*   **Web3 Integration:** `@mysten/dapp-kit`, `@mysten/sui`
*   **Smart Contracts:** Sui Move
*   **Decentralized Storage:** Walrus Network

## 🚀 Getting Started

First, install the dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔗 Architecture & Smart Contracts

The core logic of Prooffolio resides in the Sui Move smart contracts located in the `/contracts` directory. To deploy or interact with the registry locally, ensure you have the `sui` CLI installed.

```bash
cd contracts
sui move build
```

## 📜 License

This project is licensed under the MIT License.
