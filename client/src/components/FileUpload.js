import { useEffect, useState } from "react";
import axios from "axios";
import "./FileUpload.css";

// NOTE: Do NOT expose real Pinata secret keys in production frontend code.
// For a real app, move the upload step to a backend/serverless function.
// Here we read keys from environment variables (must be prefixed with REACT_APP_ to be injected at build time).
const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.REACT_APP_PINATA_SECRET_API_KEY;

const FileUpload = ({ contract, account }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No image selected");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setFileName("No image selected");
    setPreviewUrl("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatusMessage("Select an image before uploading.");
      return;
    }
    if (!contract || !account) {
      setStatusMessage("Connect your wallet to upload images.");
      return;
    }
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      setStatusMessage(
        "Pinata keys missing. Set REACT_APP_PINATA_API_KEY and REACT_APP_PINATA_SECRET_API_KEY."
      );
      return;
    }
    try {
      setLoading(true);
      setStatusMessage("");
      const formData = new FormData();
      formData.append("file", file);

      const resFile = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: formData,
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key:PINATA_SECRET_API_KEY,
          "Content-Type": "multipart/form-data",
        },
      });

      const cid = resFile?.data?.IpfsHash;
      if (!cid) throw new Error("No CID returned from Pinata");

      // Store canonical ipfs:// URI on-chain
      const imgURI = `ipfs://${cid}`;

      // Await blockchain tx confirmation
      const tx = await contract.add(account, imgURI);
      await tx.wait();

      setStatusMessage("Image uploaded & recorded on-chain");
      resetSelection();
    } catch (err) {
      console.error("Upload error:", err);
      setStatusMessage("Unable to upload image");
    } finally {
      setLoading(false);
    }
  };

  const retrieveFile = (e) => {
    const data = e.target.files?.[0];
    if (!data) return;
    if (!data.type.startsWith("image/")) {
      setStatusMessage("Please select an image file");
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const nextPreview = URL.createObjectURL(data);
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(data);
    reader.onloadend = () => setFile(data);
    setFileName(data.name);
    setPreviewUrl(nextPreview);
    setStatusMessage("");
    e.preventDefault();
  };

  return (
    <section className="upload-card">
      <header className="upload-card__header">
        <h2>Your Files</h2>
        <p>Upload images to pin them on IPFS and share securely.</p>
      </header>

      <form className="upload-card__form" onSubmit={handleSubmit}>
        <div className="upload-card__controls">
          <label htmlFor="file-upload" className="upload-card__choose">
            {loading ? "Uploading..." : "Choose Image"}
          </label>
          <input
            disabled={!account || loading}
            type="file"
            id="file-upload"
            name="data"
            accept="image/*"
            onChange={retrieveFile}
          />
          <button
            type="submit"
            className="upload-card__submit"
            disabled={!file || loading}
          >
            {loading ? "Please wait..." : "Upload"}
          </button>
        </div>

        <div className="upload-card__status">
          <span>{fileName}</span>
          {statusMessage && <p className="upload-card__message">{statusMessage}</p>}
        </div>
      </form>

      <div className="upload-card__preview">
        {previewUrl ? (
          <img src={previewUrl} alt="Selected preview" />
        ) : (
          <div className="upload-card__placeholder">
            <p>No image selected yet</p>
          </div>
        )}
      </div>
    </section>
  );
};
export default FileUpload;


