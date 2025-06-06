import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ReactMediaRecorder } from "react-media-recorder";

function QuestionBox({ cvText, track }) {
  const [question, setQuestion] = useState({ text: "", tag: "" });
  const [history, setHistory] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("");
  const [themeCounts, setThemeCounts] = useState({});
  const [mode, setMode] = useState("rapid"); // 'rapid' or 'theme'
  const [deepQuestionCount, setDeepQuestionCount] = useState(0);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [academicIndex, setAcademicIndex] = useState(0);




  const audioRef = useRef(null);

  const speakQuestion = async (text) => {
    if (!text) return;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/speak`,
        { text },
        { responseType: "blob" }
      );
      const audioBlob = res.data;
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error("Error in TTS:", error);
    }
  };

  const loadNextQuestion = async (currentHistory, backgroundIndexOverride = backgroundIndex, academicIndexOverride = academicIndex) => {
    console.log("▶ Sending request with payload:", {
      track,
      cv_text: cvText,
      history: currentHistory,
      theme_counts: themeCounts,
      current_theme: currentTheme,
      is_rapid_fire: mode === "rapid",
      background_index: backgroundIndexOverride,
      academic_index: academicIndexOverride,
    });
  

    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/next-question`, {
        track,
        cv_text: cvText,
        history: currentHistory,
        theme_counts: themeCounts,
        current_theme: currentTheme,
        is_rapid_fire: mode === "rapid",
        background_index: backgroundIndexOverride,
        academic_index: academicIndexOverride,
      });
      console.log("✅ Backend response received:", res.data);

      if (!res.data || !res.data.question) {
        console.error("🚨 Invalid response from backend:", res.data);
        setLoading(false);
        return;
      }
      


  
      const nextQ = res.data.question;
      const tag = res.data.tag || "";

      

      if (tag === "end_rapid_fire_academic") {
        console.log("⚠️ Tag detected: end_rapid_fire_academic — switching to theme mode");

        setMode("theme");
        setAcademicIndex(0);  // ✅ Reset academic question index
        setLoading(false);
        return;               // ✅ Stop here; next render triggers new mode
      }

      console.log("Backend response:", res.data);
  
      if (
        nextQ.toLowerCase().includes("i now have enough information to move on") ||
        nextQ.toLowerCase().includes("let’s now move to broader questions")
      ) {
        setMode("theme");
      }

      console.log("🧠 Setting question text to:", nextQ);
      setQuestion({ text: nextQ, tag });

      try {
        setCurrentTheme(res.data.current_theme || "");
        setThemeCounts(res.data.theme_counts || {});
      } catch (e) {
        console.error("❌ Error updating theme state:", e);
      }
      

      if (res.data.academic_index !== undefined) {
        setAcademicIndex(res.data.academic_index); // ✅ Update index for next turn
      }
  
      if (res.data.question.includes("That’s the end of the background interview")) {
        setFinished(true);
      }
    } catch (err) {
      console.error("Failed to load question", err);
    }
    console.log("✅ Finished processing question. UI should now show question.");
    setLoading(false);
  };
  
  

  useEffect(() => {
    if (!started) {
      if (track === "Family & Background") {
        setMode("theme");  // Skip rapid fire for this track
      }
      loadNextQuestion([]);
      setStarted(true);
    }
  }, [started]);

  useEffect(() => {
    if (question.text && !finished) {
      speakQuestion(question.text);
    }
  }, [question, finished]);
  
  
  const handleSubmit = async () => {

    const updatedHistory = [...history, { question: question.text, answer, tag: question.tag }];


    setHistory(updatedHistory);
    setAnswer("");
  
    let nextBackgroundIndex = backgroundIndex;
  
    if (track === "Family & Background") {
      nextBackgroundIndex = backgroundIndex + 1;
      setBackgroundIndex(nextBackgroundIndex); // update state for later use
    }

    let nextAcademicIndex = academicIndex;
    if (track === "Academic Interests" && mode === "theme") {
      nextAcademicIndex = academicIndex + 1;
      setAcademicIndex(nextAcademicIndex); // ✅ Local update for backend
    }
  
    if (mode === "theme") {
      const nextCount = deepQuestionCount + 1;
      setDeepQuestionCount(nextCount);
  
      if (
        (track === "Academic Interests" && nextCount >= 9) ||
        (track === "Family & Background" && nextCount >= 25)
      ) {
        setFinished(true);
        return;
      }
    }
    console.log("📚 Submitting answer. Updated history:", updatedHistory);

    await loadNextQuestion(updatedHistory, nextBackgroundIndex, nextAcademicIndex);

  };
  
  

  const handleAudioUpload = async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/transcribe`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setAnswer(res.data.text);
  };

  const downloadTranscript = () => {
    let content = `🎓 Interview Transcript\n\n`;
    history.forEach((entry, i) => {
      content += `Q${i + 1}: ${entry.question}\nA${i + 1}: ${entry.answer}\n\n`;
    });
    const file = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = "interview.txt";
    a.click();
  };

  const handleAbort = () => {
    setFinished(true);
  };

  return (
    <div className="card">
      <h2>🎤 Interview</h2>

      {loading ? (
        <p>Loading next question...</p>
      ) : finished ? (
        <>
          <p>🎯 Thank you for the conversation! You’ve completed the interview.</p>
          <button onClick={downloadTranscript}>📥 Download Interview</button>
        </>
      ) : (
        <>
          <p>{question.text}</p>

          <audio ref={audioRef} controls style={{ margin: "1rem 0" }} />

          <div>
            <ReactMediaRecorder
              audio
              render={({ status, startRecording, stopRecording, mediaBlobUrl }) => (
                <div>
                  <p>{status === "recording" ? "Recording..." : ""}</p>
                  <button onClick={startRecording} disabled={status === "recording"}>
                    🎙 Start Recording
                  </button>
                  <button onClick={stopRecording} disabled={status !== "recording"}>
                    🛑 Stop Recording
                  </button>
                  {mediaBlobUrl && (
                    <>
                      <audio src={mediaBlobUrl} controls />
                      <button
                        onClick={async () => {
                          const blob = await fetch(mediaBlobUrl).then((r) => r.blob());
                          await handleAudioUpload(blob);
                        }}
                      >
                        📤 Transcribe
                      </button>
                    </>
                  )}
                </div>
              )}
            />
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type or edit your answer here"
            rows={4}
          />

          <button onClick={handleSubmit} disabled={!answer.trim()}>
            Submit Answer
          </button>
          <button onClick={handleAbort} style={{ marginLeft: "1rem", color: "red" }}>
            Abort Interview
          </button>
        </>
      )}
    </div>
  );
}

export default QuestionBox;
