import { useState } from "react";

const TRACKS = [
  "Academic Interests",
  "Extracurricular Activities",
  "Family & Background"
];

function TrackSelector({ onTrackSelected }) {
  const [selected, setSelected] = useState("");

  const handleSubmit = () => {
    if (selected) onTrackSelected(selected);
  };

  return (
    <div className="card">
      <h1>🧭 Choose Interview Track</h1>
      <p>Select the focus of your essay interview:</p>

      <div style={{ marginTop: "1rem" }}>
        {TRACKS.map((track) => (
          <div key={track} style={{ marginBottom: "0.5rem" }}>
            <label>
              <input
                type="radio"
                name="track"
                value={track}
                checked={selected === track}
                onChange={(e) => setSelected(e.target.value)}
              />
              {" "}{track}
            </label>
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={!selected}>
        Continue
      </button>
    </div>
  );
}

export default TrackSelector;
