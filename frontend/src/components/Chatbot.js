
// ChatBot.js
import React, { useState } from "react";
import emailjs from "@emailjs/browser";

export default function ChatBot({ parsedResumes }) {
  const [question, setQuestion] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [jobDesc, setJobDesc] = useState("");
  const [jdParsed, setJdParsed] = useState(null);
  // HR weight inputs
  const [weights, setWeights] = useState({
    skills: 50,
    education: 20,
    experience: 20,
    certifications: 10,
  });
  // HOLD state for scoring + cutoff
  const [lastScores, setLastScores] = useState([]);          // [{ name, email, score }]
  const [awaitingCutoff, setAwaitingCutoff] = useState(false);
  const [passedCandidates, setPassedCandidates] = useState([]); // same shape as lastScores

  // HOLD state for invitation form
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]); // array of indexes
  const [inviteMessage, setInviteMessage] = useState("");

  // 1) Parse JD first
  const handleJDSubmit = async () => {
    const res = await fetch("http://localhost:5000/parse_jd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jd_text: jobDesc })
    });
    const data = await res.json();
    setJdParsed(data.parsed_jd);
    setChatLog(prev => [
      ...prev,
      { sender: "bot", text: "✅ Job Description parsed. You can now type ‘score’ to get candidate scores." }
    ]);
  };

  // 2) Main chat/score/cutoff/invite logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const lower = question.toLowerCase().trim();
    setChatLog(prev => [...prev, { sender: "user", text: question }]);
    setQuestion("");
    // Validate weights sum to 100

    // 2A) If we are waiting for a cutoff value...
    if (awaitingCutoff) {
      const cutoff = parseFloat(lower);
      if (isNaN(cutoff)) {
        setChatLog(prev => [
          ...prev,
          { sender: "bot", text: "⚠️ Please enter a valid numeric cutoff." }
        ]);
        return;
      }
      // Filter lastScores with that cutoff
      const passed = lastScores.filter(item => item.score >= cutoff);
      if (passed.length === 0) {
        setChatLog(prev => [
          ...prev,
          { sender: "bot", text: `No candidate has a score ≥ ${cutoff}.` }
        ]);
        // Reset
        setAwaitingCutoff(false);
        return;
      }
      // Display passed candidates, then show invitation form UI
      passed.forEach(item => {
        setChatLog(prev => [
          ...prev,
          { sender: "bot", text: `✓ Passed: ${item.name} (${item.email})` }
        ]);
      });

      setPassedCandidates(passed);
      setShowInvitationForm(true);
      setAwaitingCutoff(false);
      setChatLog(prev => [
        ...prev,
        { sender: "bot", text: "Please select whom you want to invite and type your message below." }
      ]);
      return;
    }

    // 2B) If user typed “score” → fetch scores from backend
    if (lower.includes("score")) {
      const totalWeight = Object.values(weights).reduce((a, b) => a + Number(b), 0);
      if (totalWeight !== 100) {
        setChatLog(prev => [...prev, { sender: "bot", text: "⚠️ Please ensure the weights sum to 100 before scoring." }]);
        setQuestion("");
        return;
      }
      const res = await fetch("http://localhost:5000/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: parsedResumes,
          job_description: jdParsed
        })
      });
      const data = await res.json();
      const scoresArray = data.scored_candidates || [];

      // Build our lastScores array with name/email from parsedResumes[i].parsed_data
      const combined = scoresArray.map((c, i) => {
        const pd = parsedResumes[i].parsed_data;
        return {
          name: pd?.name || `Candidate ${i + 1}`,
          email: pd?.email || "no-email@example.com",
          score: c.score
        };
      });
      setLastScores(combined);

      // Display each score on its own line
      combined.forEach(item => {
        setChatLog(prev => [
          ...prev,
          { sender: "bot", text: `${item.name}: ${item.score}` }
        ]);
      });
      // Then ask for cutoff
      setChatLog(prev => [
        ...prev,
        { sender: "bot", text: "Please enter a cutoff score to filter candidates." }
      ]);
      setAwaitingCutoff(true);
      return;
    }

    // 2C) Otherwise fallback to general Q&A on first resume
    const res2 = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question,
        resume: parsedResumes[0].parsed_data,
      }),
    });
    const data2 = await res2.json();
    setChatLog(prev => [...prev, { sender: "bot", text: data2.answer }]);
  };

  // 3) Handle selection toggles in invitation form
  const toggleRecipient = (index) => {
    setSelectedRecipients(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // 4) Send Invitations button click
  const handleSendInvitations = async () => {
    if (selectedRecipients.length === 0) {
      setChatLog(prev => [...prev, { sender: "bot", text: "⚠️ Please select at least one recipient." }]);
      return;
    }
    if (!inviteMessage.trim()) {
      setChatLog(prev => [...prev, { sender: "bot", text: "⚠️ Please enter a message to send." }]);
      return;
    }

    const serviceID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    let sentList = [];
    let failedList = [];

    for (const idx of selectedRecipients) {
      const candidate = passedCandidates[idx];

      const templateParams = {
        to_name: candidate.name,
        to_email: candidate.email,
        message: inviteMessage,
        // reply_to: "hr@example.com"  // optional
      };

      try {
        await emailjs.send(serviceID, templateID, templateParams, publicKey);
        sentList.push(candidate.email);
      } catch (err) {
        console.error(err);
        failedList.push(candidate.email);
      }
    }

    if (sentList.length) {
      setChatLog(prev => [
        ...prev,
        { sender: "bot", text: `✅ Invitations sent to: ${sentList.join(", ")}` }
      ]);
    }

    if (failedList.length) {
      setChatLog(prev => [
        ...prev,
        { sender: "bot", text: `❌ Failed to send to: ${failedList.join(", ")}` }
      ]);
    }

    setShowInvitationForm(false);
    setSelectedRecipients([]);
    setInviteMessage("");
  };


  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h2>Resume Screener Chatbot</h2>

      {/* 📝 Job Description input */}
      <textarea
        placeholder="Paste Job Description here..."
        rows={5}
        value={jobDesc}
        onChange={(e) => setJobDesc(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button onClick={handleJDSubmit}>Parse JD</button>
      <div style={{ margin: "10px 0" }}>
        <h4>Set Priority Weights (Total = 100)</h4>
        {["skills", "education", "experience", "certifications"].map((key) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <label style={{ marginRight: 8 }}>{key.charAt(0).toUpperCase() + key.slice(1)}:</label>
            <input
              type="number"
              min={0}
              max={100}
              value={weights[key]}
              onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })}
              style={{ width: 60 }}
            />
          </div>
        ))}
      </div>
      {/* 💬 Chat log */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: 10,
          height: 300,
          overflowY: "scroll",
          marginBottom: 10,
          backgroundColor: "#f9f9f9",
        }}
      >
        {chatLog.map((chat, idx) => (
          <div
            key={idx}
            style={{
              textAlign: chat.sender === "user" ? "right" : "left",
              margin: "5px 0"
            }}
          >
            <b>{chat.sender === "user" ? "You:" : "Bot:"}</b> {chat.text}
          </div>
        ))}
      </div>

      {/* 📥 Invitation form (shows only after cutoff filtering) */}
      {showInvitationForm && (
        <div style={{ marginBottom: 20, border: "1px solid #aaa", padding: 10 }}>
          <h4>Select Candidates to Invite:</h4>
          {passedCandidates.map((item, idx) => (
            <div key={idx}>
              <input
                type="checkbox"
                checked={selectedRecipients.includes(idx)}
                onChange={() => toggleRecipient(idx)}
              />
              <label style={{ marginLeft: 8 }}>
                {item.name} ({item.email}) — Score: {item.score}
              </label>
            </div>
          ))}
          <h4 style={{ marginTop: 12 }}>Enter Invitation Message:</h4>
          <textarea
            rows={4}
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
            placeholder="Dear [Name], we’d like to invite you to …"
          />
          <button onClick={handleSendInvitations}>Send Invitations</button>
        </div>
      )}

      {/* ✍️ User input field */}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={
            awaitingCutoff
              ? "Enter numeric cutoff (e.g. 70)"
              : "Ask a question or type 'score'"
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: "80%", padding: "8px" }}
        />
        <button type="submit" style={{ padding: "8px 16px" }}>
          Send
        </button>
      </form>
    </div>
  );
}
