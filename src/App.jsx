import { useState } from "react";
import CVUpload from "./components/CVUpload";
import TrackSelector from "./components/TrackSelector";
import QuestionBox from "./components/QuestionBox";
import "./App.css";

function App() {
  const [cvText, setCvText] = useState("");
  const [track, setTrack] = useState("");

  return (
    <div className="app">
      {!cvText && <CVUpload onExtracted={setCvText} />}
      {cvText && !track && <TrackSelector onTrackSelected={setTrack} />}
      {cvText && track && <QuestionBox cvText={cvText} track={track} />}
    </div>
  );
}

export default App;
