import { useState } from "react";
import "./Display.css";

const resolveToGateway = (uri) => {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`;
  }
  // Already a gateway / https link
  return uri;
};

const Display = ({ contract, account }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Preview your uploaded items or fetch files shared with you."
  );
  const [lookupAddress, setLookupAddress] = useState("");

  const getdata = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      setStatusMessage("");
      const target = lookupAddress?.trim() || account;
      const dataArray = await contract.display(target);
      if (!dataArray || dataArray.length === 0) {
        setImages([]);
        setStatusMessage("No images found for this address yet.");
        return;
      }

      const normalized = dataArray.map((item) => resolveToGateway(item));
      setImages(normalized);
      setStatusMessage(`Showing ${normalized.length} image${
        normalized.length > 1 ? "s" : ""
      } for ${target.slice(0, 6)}...${target.slice(-4)}`);
    } catch (e) {
      console.error("Error fetching data:", e);
      setImages([]);
      setStatusMessage("You don't have access to view this gallery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="gallery-card">
      <header className="gallery-card__header">
        <h2>Gallery</h2>
        <p>Enter an address to explore files shared with you, or leave blank to view your own.</p>
      </header>

      <div className="gallery-card__controls">
        <input
          type="text"
          placeholder="0x..."
          className="gallery-card__address"
          value={lookupAddress}
          onChange={(event) => setLookupAddress(event.target.value)}
        />
        <button
          className="gallery-card__button"
          onClick={getdata}
          disabled={loading}
        >
          {loading ? "Loading..." : "Fetch images"}
        </button>
      </div>

      <p className="gallery-card__status">{statusMessage}</p>

      <div className="gallery-card__grid">
        {images.length === 0 ? (
          <div className="gallery-card__empty">
            <p>No images to show yet. Upload one above or fetch from a shared address.</p>
          </div>
        ) : (
          images.map((uri, index) => (
            <a
              href={uri}
              key={uri + index}
              target="_blank"
              rel="noreferrer"
              className="gallery-card__item"
            >
              <img src={uri} alt="uploaded" />
            </a>
          ))
        )}
      </div>
    </section>
  );
};

export default Display;
