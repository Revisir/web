import { useState, useRef, useEffect } from "react";
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from "react-bootstrap";
import { useMutation } from "@tanstack/react-query";
import { startChat, sendMessage, completeChat } from "../../service/chat_service.mjs";

const loadingMessages = [
  "Analyzing your topic materials...",
  "Extracting key concepts...",
  "Preparing revision questions...",
  "Evaluating difficulty level...",
  "Almost ready, finalizing session...",
];

export default function RevisionChat({ topicId, onClose }) {
  const [phase, setPhase] = useState("loading");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingText, setLoadingText] = useState("");
  const messagesEndRef = useRef(null);

  const startMutation = useMutation({
    mutationFn: () => startChat(topicId),
    onSuccess: ({ sessionId, initialMessage }) => {
      setSessionId(sessionId);
      setMessages([{ role: "assistant", text: initialMessage }]);
      setPhase("chat");
    },
    onError: () => setPhase("chat"),
  });

  const sendMutation = useMutation({
    mutationFn: (msg) => sendMessage(sessionId, msg),
    onSuccess: ({ response, sessionComplete }) => {
      setMessages((prev) => [...prev, { role: "assistant", text: response }]);
      if (sessionComplete) setPhase("quality");
    },
    onError: (err) => {
      setMessages((prev) => [...prev, { role: "assistant", text: "Error: " + (err.response?.data?.error?.message || "Failed to get response") }]);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (userQuality) => completeChat({ sessionId, topicId, userQuality, llmQuality: userQuality }),
    onSettled: (_, __, userQuality) => onClose(userQuality),
  });

  useEffect(() => { startMutation.mutate(); }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    let i = 0;
    setLoadingText(loadingMessages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sendMutation.isPending) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    sendMutation.mutate(msg);
  };

  return (
    <Modal show onHide={() => onClose(null)} centered size="lg" backdrop="static">
      <ModalHeader closeButton>
        <ModalTitle>{phase === "quality" ? "Rate Your Recall" : "Revision Chat"}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {startMutation.isError && <div className="alert alert-danger">{startMutation.error?.response?.data?.error?.message || "Failed to start chat"}</div>}
        {phase === "loading" && (
          <div className="text-center py-4">
            <div className="spinner-border" role="status" />
            <p className="mt-3 text-muted">{loadingText}</p>
          </div>
        )}
        {phase === "chat" && (
          <>
            <div style={{ height: "350px", overflowY: "auto", marginBottom: "10px" }}>
              {messages.map((m, i) => (
                <div key={i} className={`mb-2 d-flex ${m.role === "user" ? "justify-content-end" : "justify-content-start"}`}>
                  <div className={`p-2 rounded ${m.role === "user" ? "bg-primary text-white" : "bg-light"}`} style={{ maxWidth: "75%", whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sendMutation.isPending && (
                <div className="mb-2 d-flex justify-content-start">
                  <div className="p-2 rounded bg-light" style={{ maxWidth: "75%" }}>
                    <div className="d-flex gap-1 align-items-center" style={{ height: "24px" }}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#6c757d",
                            animation: "bounce 1.4s infinite",
                            animationDelay: `${i * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <style>{`
              @keyframes bounce {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-8px); }
              }
            `}</style>
            <div className="d-flex gap-2">
              <input
                className="form-control"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your answer..."
                disabled={sendMutation.isPending}
              />
              <Button onClick={handleSend} disabled={sendMutation.isPending || !input.trim()}>
                Send
              </Button>
            </div>
          </>
        )}
        {phase === "quality" && (
          <>
            <p>How well did you recall this topic?</p>
            <div className="d-grid gap-2">
              {[5, 4, 3, 2, 1].map((q) => (
                <Button key={q} variant="outline-success" onClick={() => completeMutation.mutate(q)} disabled={completeMutation.isPending}>
                  {q} - {q === 5 ? "Perfect" : q === 4 ? "Good" : q === 3 ? "Fair" : q === 2 ? "Poor" : "Very Poor"}
                </Button>
              ))}
            </div>
          </>
        )}
      </ModalBody>
      {phase === "chat" && (
        <ModalFooter>
          <Button variant="success" onClick={() => setPhase("quality")}>
            Finish Revision
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
