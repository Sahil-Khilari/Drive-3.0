<div align="center">
  <h1>Drive 3.0 – Decentralized Image Drive</h1>
  <p><strong>Upload images to IPFS and control who can view them using an Ethereum smart contract.</strong></p>
</div>

---

## 📌 Idea
Centralized cloud services own your data and rely on proprietary infra. Drive 3.0 decentralizes the storage reference layer: images live on IPFS (content addressed), while a smart contract stores references (URIs) and access permissions. Only the owner or explicitly allowed addresses can fetch another user’s image list.

## 🔍 High-Level Architecture

```
User Browser (React + MetaMask)
  ├─ Upload image (Pinata API -> IPFS) => returns CID
  ├─ Store ipfs://CID via add(address, uri) on Upload.sol
  └─ Fetch display(address) guarded by access rules

Smart Contract (Upload.sol / Hardhat)
  ├─ mapping(address => string[]) value
  ├─ mapping(owner => mapping(viewer => bool)) ownership
  ├─ allow(address) / disallow(address)
  └─ display(owner) restricted to owner or allowed viewer

IPFS (via Pinata)
  └─ Holds the actual image content addressable by CID
```

## 🧱 Smart Contract Summary (`contracts/Upload.sol`)
| Function | Purpose |
|----------|--------|
| `add(address user, string url)` | Append an `ipfs://` URI to `user`'s list. |
| `allow(address user)` | Grant viewing access to `user`. |
| `disallow(address user)` | Revoke previously granted access. |
| `display(address user)` | Returns array of URIs if caller is owner or has access. |
| `shareAccess()` | Returns historical access entries (with current status). |

> NOTE: No deletion of individual URIs; contract is append-only for references.

## 🗂 Directory Structure
```
Drive3.0/
├── hardhat.config.js          # Hardhat config
├── contracts/Upload.sol       # Solidity contract
├── scripts/deploy.js          # Deployment script
├── client/                    # React frontend (CRA)
│   ├── src/
│   │   ├── App.js             # Root component (provider + routing of components)
│   │   ├── components/
│   │   │   ├── FileUpload.js  # Upload + Pinata + preview + contract add
│   │   │   ├── Display.js     # Fetches & renders images based on access
│   │   │   ├── Modal.js       # Sharing access UI (calls allow())
│   │   │   └── *.css          # Component styles
│   │   └── artifacts/         # Hardhat-generated ABI JSON (copied after compile)
│   ├── .env.example           # Template for Pinata keys (do not commit real .env)
│   └── package.json
└── package.json               # Root (Hardhat) deps
```

## ✨ Features
- IPFS-backed image references (`ipfs://CID`) stored on-chain.
- Access control: grant & revoke viewer permissions per address.
- Client-side image preview before upload.
- Minimal, responsive UI (React + hooks + ethers.js).
- Re-fetch images by owner or shared address.

## 🛡 Security & Limitations
| Aspect | Current State | Consider Improving |
|--------|---------------|--------------------|
| Pinata Secret Key | Exposed in frontend during dev (env injected) | Move upload to backend / serverless proxy; use JWT scoped keys |
| On-chain Data | URIs only (not encrypted) | Add optional client-side encryption (e.g., AES w/ shared secret) |
| Access Revocation | Prevents new reads but prior data could be cached | Use per-object encryption keys rotated on revocation |
| Gas Cost | Stores full URI strings in arrays | Shorten to raw CID + reconstruct prefix in UI |
| Deletion | Not supported (immutable log) | Add soft-delete mapping if needed |

## ⚙️ Installation & Setup

### 1. Clone & Install (Hardhat root)
```bash
git clone https://github.com/Sahil-Khilari/Drive-3.0.git
cd Drive3.0
npm install
```

### 2. Compile Contract
```bash
npx hardhat compile
```

### 3. Start Local Chain (optional for dev)
```bash
npx hardhat node
```

### 4. Deploy (Local Example)
In a new terminal:
```bash
npx hardhat run scripts\deploy.js --network localhost
```
Copy the printed contract address and update it inside `client/src/App.js` (the `contractAddress` constant).

### 5. Frontend Dependencies
```bash
cd client
npm install
```

### 6. Environment Variables (Frontend)
Create `client/.env` (do NOT commit):
```
REACT_APP_PINATA_API_KEY=YOUR_PINATA_KEY
REACT_APP_PINATA_SECRET_API_KEY=YOUR_PINATA_SECRET
```
Restart the dev server after editing.

> Production tip: move the Pinata call server-side to avoid exposing secrets.

### 7. Run Frontend
```bash
cd client
npm start
```
Open: http://localhost:3000

## 🔑 Contract API (Detailed)
```solidity
function add(address _user, string memory url) external
// Appends a new image reference to _user's array (caller must pass their own address). No auth check here.

function allow(address user) external
// Grants user permission to call display(msg.sender).

function disallow(address user) public
// Revokes permission.

function display(address _user) external view returns (string[] memory)
// Reverts unless msg.sender == _user OR ownership[_user][msg.sender] == true.

function shareAccess() public view returns (Access[] memory)
// Returns historical access list entries (with current access bool).
```

## 🖥 Frontend Component Responsibilities
| Component | Responsibility |
|-----------|---------------|
| `App.js` | Initializes provider, signer, contract, coordinates layout. |
| `FileUpload.js` | Select + preview image, send to Pinata, store CID URI on-chain. |
| `Display.js` | Fetch & normalize URIs, render image grid with gateway links. |
| `Modal.js` | Address input to grant access (`allow`). Populates dropdown from `shareAccess()`. |

## 🔄 Data Flow (Upload)
1. User selects file → preview rendered (Object URL).
2. User clicks Upload → Pinata API (multipart) → receives `IpfsHash` (CID).
3. Frontend stores `ipfs://CID` using `contract.add(account, uri)` → waits for tx confirmation.
4. Display component calls `contract.display(account)` → gets array → converts each to `https://gateway.pinata.cloud/ipfs/<CID>`.

## 🔄 Data Flow (Sharing)
1. Owner opens Share modal → enters address A → calls `allow(A)`.
2. Address A can now call `display(owner)` and render URIs.
3. Owner may call `disallow(A)` (removes future access only).

## 🧪 Suggested Tests (Not Included Yet)
| Scenario | Expectation |
|----------|-------------|
| Add image then display self | Array length increments. |
| Another user w/out allow | `display` reverts. |
| Grant then display | Succeeds. |
| Revoke then display | Reverts. |

## 🛠 Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| 401 from Pinata | Bad / quoted keys in `.env` | Remove quotes; restart dev server. |
| `You don't have access` | Caller not owner or allowed | Call `allow(address)` from owner first. |
| Images not appearing | Tx not awaited or no CID stored | Ensure `await tx.wait()` executed. |
| Empty gallery after upload | Wrong contract address | Re-deploy & update address in `App.js`. |

## 🚀 Roadmap (Ideas)
- JWT / backend proxy for uploads (hide secret).
- Optional encryption (per-user symmetric key exchange).
- Pagination or lazy loading for large galleries.
- Replace raw string CIDs with events + indexing (The Graph).
- Drag & drop multi-file batch uploads.
- ENS name resolution for friendlier sharing.

## ⚠ Disclaimer
This is an educational prototype. Do not store sensitive or copyrighted material. Secrets placed in a client bundle are NOT secure.

---

## 🙌 Contributing
PRs and issues welcome. Please open an issue describing the change before large refactors.

## 📄 License
GPL-3.0 (see SPDX identifier in `Upload.sol`).

---

Happy hacking! If you build a feature on top of this (encryption, sharing UI, etc.) share it back ✨

