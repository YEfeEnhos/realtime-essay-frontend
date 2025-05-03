import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ReactMediaRecorder } from "react-media-recorder";

function QuestionBox({ cvText, track }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  const audioRef = useRef(null);

  const loadQuestion = async (currentHistory) => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/next-question", {
        track: track,
        cv_text: cvText,
        history: currentHistory,
      });

      const newQuestion = res.data.question;
      setQuestion(newQuestion);
    } catch (error) {
      console.error("Error loading question:", error);
    }
    setLoading(false);
  };

  const speakQuestion = async (text) => {
    if (!text) return;
    try {
      const res = await axios.post(
        "http://localhost:8000/speak",
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
      console.error("Error speaking question:", error);
    }
  };

  useEffect(() => {
    if (!started) {
      loadQuestion([]);
      setStarted(true);
    }
  }, [started]);

  useEffect(() => {
    if (question && !finished) {
      speakQuestion(question);
    }
  }, [question, finished]);

  const handleSubmit = async () => {
    const updatedHistory = [...history, { question, answer }];
    setHistory(updatedHistory);
    setAnswer("");

    if (updatedHistory.length >= 8) {
      setFinished(true);
      return;
    }

    await loadQuestion(updatedHistory);
  };

  const handleAudioUpload = async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "recording.wav");

    const res = await axios.post("http://localhost:8000/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setAnswer(res.data.text);
  };

  const downloadTranscript = () => {
    let content = `🎓 College Essay Interview Transcript\n\n`;
    history.forEach((entry, index) => {
      content += `Question ${index + 1}: ${entry.question}\n`;
      content += `Answer ${index + 1}: ${entry.answer}\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "interview_transcript.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="card">
      <h2>🎤 Interview</h2>

      {loading ? (
        <p>Loading next question...</p>
      ) : finished ? (
        <>
          <p style={{ fontSize: "1.2rem" }}>
            🎯 Thank you for the conversation! You’ve completed the interview.
          </p>
          <button onClick={downloadTranscript}>
            📥 Download Your Interview
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: "1.2rem" }}>{question}</p>

          <audio ref={audioRef} controls style={{ marginTop: "1rem" }} />

          <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <ReactMediaRecorder
              audio
              render={({ status, startRecording, stopRecording, mediaBlobUrl }) => (
                <div>
                  <p>{status === "recording" ? "Recording..." : ""}</p>
                  <button
                    onClick={() => {
                      startRecording();
                    }}
                    disabled={status === "recording"}
                  >
                    🎙️ Start Recording
                  </button>
                  <button
                    onClick={() => {
                      stopRecording();
                    }}
                    disabled={status !== "recording"}
                  >
                    🛑 Stop Recording
                  </button>

                  {mediaBlobUrl && (
                    <div style={{ marginTop: "10px" }}>
                      <audio src={mediaBlobUrl} controls />
                      <br />
                      <button
                        onClick={async () => {
                          const blob = await fetch(mediaBlobUrl).then((r) => r.blob());
                          await handleAudioUpload(blob);
                        }}
                      >
                        📤 Transcribe Answer
                      </button>
                    </div>
                  )}
                </div>
              )}
            />
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Write or edit your answer here..."
          />

          <button onClick={handleSubmit} disabled={!answer.trim()}>
            Submit Answer
          </button>
        </>
      )}
    </div>
  );
}

export default QuestionBox;
