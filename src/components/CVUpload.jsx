import { useState } from "react";
import axios from "axios";

function CVUpload({ onExtracted }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cvText, setCvText] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/upload-cv`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCvText(res.data.text);
      onExtracted(res.data.text);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setCvText("No CV provided");
    onExtracted("No CV provided"); // proceed with empty CV
  };

  return (
    <div className="card">
      <h1>📄 Upload Your CV</h1>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
        <button onClick={handleSkip}>Skip this step</button>
      </div>

      {cvText && (
        <>
          <h2>📝 Extracted CV Text</h2>
          <textarea value={cvText} rows={15} readOnly />
        </>
      )}
    </div>
  );
}

export default CVUpload;
