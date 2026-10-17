import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Send } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import RatingPicker from "../rating/RatingPicker";
import { startChat, sendMessage, completeChat } from "../../service/chat_service.mjs";
import { getApiErrorCode, getApiErrorMessage } from "../../utils/apiErrors";

const loadingMessages = [
  "Analyzing your topic materials...",
  "Extracting key concepts...",
  "Preparing revision questions...",
  "Evaluating difficulty level...",
  "Almost ready, finalizing session...",
];

/**
 * The AI revision chat. It records its own review when it completes, then calls
 * `onClose(userQuality)`; closing before that calls `onClose(null)`.
 */
export default function RevisionChat({ topicId, onClose }) {
  const [phase, setPhase] = useState("loading");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingTick, setLoadingTick] = useState(0);
  const [rating, setRating] = useState(null);
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
  const { mutate: start } = startMutation;

  const sendMutation = useMutation({
    mutationFn: (msg) => sendMessage(sessionId, msg),
    onSuccess: ({ response, sessionComplete }) => {
      setMessages((prev) => [...prev, { role: "assistant", text: response }]);
      if (sessionComplete) setPhase("quality");
    },
    onError: (err) => {
      setMessages((prev) => [...prev, { role: "assistant", text: getApiErrorMessage(err, "Failed to get response") }]);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (userQuality) => completeChat({ sessionId, topicId, userQuality, llmQuality: userQuality }),
    onSuccess: (_, userQuality) => onClose(userQuality),
    onError: (err, userQuality) => {
      // A topic takes one review a day (KTD8): the earlier review stands, so close as finished.
      if (getApiErrorCode(err) === "ALREADY_REVIEWED_TODAY") onClose(userQuality);
    },
  });

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => setLoadingTick((tick) => tick + 1), 2500);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sendMutation.isPending || !sessionId) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    sendMutation.mutate(msg);
  };

  const completeError = completeMutation.isError && getApiErrorCode(completeMutation.error) !== "ALREADY_REVIEWED_TODAY" ? getApiErrorMessage(completeMutation.error, "Could not save your rating") : null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !completeMutation.isPending) onClose(null);
      }}
    >
      <DialogContent
        className="sm:max-w-2xl"
        // Like a static backdrop: only Escape and the close button end the chat.
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="m-0">{phase === "quality" ? "Rate your recall" : "Revision chat"}</DialogTitle>
          <DialogDescription className="m-0">
            {phase === "quality" ? "How well did you recall this topic? Reviser averages your rating with its own assessment." : "Answer the tutor's questions about this topic."}
          </DialogDescription>
        </DialogHeader>

        {startMutation.isError && (
          <p role="alert" className="m-0 rounded-lg bg-destructive/10 p-3 text-body-md text-destructive">
            {getApiErrorMessage(startMutation.error, "Failed to start chat")}
          </p>
        )}

        {phase === "loading" && (
          <div role="status" className="flex flex-col items-center gap-3 py-6">
            <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-primary" />
            <p className="m-0 text-body-md text-muted-foreground">{loadingMessages[loadingTick % loadingMessages.length]}</p>
          </div>
        )}

        {phase === "chat" && (
          <>
            <div className="flex h-[350px] flex-col gap-2 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-body-md whitespace-pre-wrap break-words ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-container-high text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {sendMutation.isPending && (
                <div className="flex justify-start">
                  <div role="status" aria-label="Reviser is typing" className="flex h-10 items-center gap-1 rounded-lg bg-surface-container-high px-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <Input
                aria-label="Your answer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your answer..."
                disabled={sendMutation.isPending || !sessionId}
              />
              <Button onClick={handleSend} disabled={sendMutation.isPending || !input.trim() || !sessionId}>
                <Send data-icon="inline-start" />
                Send
              </Button>
            </div>
            <DialogFooter>
              {/* Without a session there is nothing to complete; Done on the topic page records a rating instead. */}
              <Button onClick={() => setPhase("quality")} disabled={!sessionId}>
                Finish revision
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "quality" && (
          <>
            {/* No interval previews here: the AI's own score also moves the final rating (R36). */}
            <RatingPicker value={rating} onChange={setRating} disabled={completeMutation.isPending} label="Recall rating" />
            {completeError && (
              <p role="alert" className="m-0 text-body-md text-destructive">
                {completeError}
              </p>
            )}
            <DialogFooter>
              <Button disabled={rating === null || completeMutation.isPending} onClick={() => completeMutation.mutate(rating)}>
                {completeMutation.isPending && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
                {completeMutation.isPending ? "Saving…" : "Record rating"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
