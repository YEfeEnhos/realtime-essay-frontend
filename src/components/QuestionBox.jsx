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
  const [currentTheme, setCurrentTheme] = useState("");
  const [themeCounts, setThemeCounts] = useState({});
  const [mode, setMode] = useState("rapid"); // 'rapid' or 'theme'
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [awaitingSubjectApproval, setAwaitingSubjectApproval] = useState(false);

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

  const fetchInitialSubjects = async () => {
    try {
      await loadNextQuestion([]);  // just fetch the first question via backend
    } catch (err) {
      console.error("Error extracting academic subjects:", err);
    }
  };
  

  useEffect(() => {
    if (!started) {
      if (track === "Academic Interests") {
        fetchInitialSubjects();
      } else {
        loadNextQuestion([]);
      }
      setStarted(true);
    }
  }, [started]);

  useEffect(() => {
    if (question && !finished) {
      speakQuestion(question);
    }
  }, [question, finished]);

  const loadNextQuestion = async (currentHistory) => {
    console.log("Backend response:", res.data);
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/next-question`, {
        track,
        cv_text: cvText,
        history: currentHistory,
        theme_counts: themeCounts,
        current_theme: currentTheme,
      });

      setQuestion(res.data.question);
      setCurrentTheme(res.data.current_theme);
      setThemeCounts(res.data.theme_counts);
    } catch (err) {
      console.error("Failed to load question", err);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const updatedHistory = [...history, { question, answer }];
    setHistory(updatedHistory);
    setAnswer("");

    if (updatedHistory.length >= 8) {
      setFinished(true);
      return;
    }

    if (mode === "rapid" && subjects.length > 0 && !awaitingSubjectApproval) {
      const subject = subjects[subjectIndex];
      const followUp = [
        `How have you pursued your interest in ${subject} in school or summer programs?`,
        `Looks like you've done something related to ${subject}. Tell me more.`,
        `How have you explored ${subject} outside the classroom — any projects or research?`
      ];
      if (subjectIndex < subjects.length - 1) {
        setSubjectIndex(subjectIndex + 1);
        setAwaitingSubjectApproval(true);
        const q = `Can we move on to the next subject: ${subjects[subjectIndex + 1]}?`;
        setQuestion(q);
        speakQuestion(q);
        return;
      } else {
        setMode("theme");
      }
    }

    await loadNextQuestion(updatedHistory);
  };

  const handleYesToSubject = () => {
    setAwaitingSubjectApproval(false);
    const subject = subjects[subjectIndex];
    const q = `Great! Let’s talk about ${subject}. How have you explored this subject in or outside school?`;
    setQuestion(q);
    speakQuestion(q);
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
          <p>{question}</p>
          <audio ref={audioRef} controls style={{ margin: "1rem 0" }} />

          {awaitingSubjectApproval && (
            <button onClick={handleYesToSubject}>Yes, move on to next subject</button>
          )}

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
