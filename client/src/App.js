import Upload from "./artifacts/contracts/Upload.sol/Upload.json";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import "./App.css";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    const loadProvider = async () => {
      if (provider) {
        window.ethereum.on("chainChanged", () => {
          window.location.reload();
        });

        window.ethereum.on("accountsChanged", () => {
          window.location.reload();
        });
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        let contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

        const contract = new ethers.Contract(
          contractAddress,
          Upload.abi,
          signer
        );
        //console.log(contract);
        setContract(contract);
        setProvider(provider);
      } else {
        console.error("Metamask is not installed");
      }
    };
    provider && loadProvider();
  }, []);
  return (
    <div className="app">
      {modalOpen && <Modal setModalOpen={setModalOpen} contract={contract} />}

      <header className="app-header">
        <div className="app-title">
          <h1>Drive 3.0</h1>
          <p>Pin images to IPFS and manage access with a few clicks.</p>
        </div>
        <div className="app-actions">
          <div className="wallet-chip">
            <span>Wallet</span>
            <strong>
              {account
                ? `${account.slice(0, 6)}...${account.slice(-4)}`
                : "Not connected"}
            </strong>
          </div>
          <button className="share" onClick={() => setModalOpen(true)}>
            Share
          </button>
        </div>
      </header>

      <main className="app-main">
        <FileUpload account={account} contract={contract} />
        <Display contract={contract} account={account} />
      </main>
    </div>
  );
}

export default App;
