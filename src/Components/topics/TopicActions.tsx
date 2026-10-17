import { useId, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { AlarmClock, CalendarClock, Check, CircleAlert, CircleCheck, ListChecks, LoaderCircle, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/Components/ui/alert-dialog";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import StatusBadge from "@/Components/common/StatusBadge";
import RatingPicker from "../rating/RatingPicker";
import type { QuestionBankSummary, ReviewReason } from "../../hooks/useDueQueue";
import { useTopicQuestionsRegenerate, useTopicRevise, type TopicDetail } from "../../hooks/useTopicQuery";
import { getApiErrorCode, getApiErrorMessage } from "../../utils/apiErrors";
import { formatRating, hasIntervals, ratingLabel } from "../../utils/ratings";
import { formatDate, isNumber, pluralize, reviewReasonText } from "../../utils/review";

type TopicActionsProps = {
  topic: TopicDetail;
  onStartAiQuiz: () => void;
};

type QuizState = { available: boolean; reason: ReviewReason | null };

type ReviewView =
  | { kind: "done" }
  | { kind: "upcoming" }
  // normalQuiz is null on backends from before the due queue, which have no question banks.
  | { kind: "due"; normalQuiz: (QuizState & { questionCount: number }) | null; aiQuiz: QuizState };

// A review recorded from this page, shown until the refetched topic reports it.
type RecordedReview = { rating: number; nextRevisionDate?: string } | { alreadyReviewed: true };

// The queue cards' wording, pointing to Regenerate on this page.
const PAGE_REASON_TEXT = { no_questions: "No questions left. Regenerate them below" };

function reasonText(reason: ReviewReason | null) {
  return reviewReasonText(reason, PAGE_REASON_TEXT);
}

function hasMaterials(topic: TopicDetail) {
  const hasUrl = (topic.urls ?? []).some((entry) => /^https?:\/\//.test(typeof entry === "string" ? entry : entry.url));
  return (topic.files?.length ?? 0) > 0 || hasUrl;
}

function reviewView(topic: TopicDetail, now: DateTime): ReviewView {
  const { review } = topic;
  if (review) {
    if (review.doneToday || review.normalQuiz.reason === "done_today") return { kind: "done" };
    if (review.normalQuiz.reason === "not_due") return { kind: "upcoming" };
    return { kind: "due", normalQuiz: review.normalQuiz, aiQuiz: review.aiQuiz };
  }
  // Backends from before the due queue send no availability; offer what the page offered before, Done and the AI chat.
  const lastRevised = topic.lastRevised ? DateTime.fromISO(topic.lastRevised) : null;
  if (lastRevised?.isValid && lastRevised.hasSame(now, "day")) return { kind: "done" };
  const due = DateTime.fromISO(topic.revisionDate).startOf("day");
  if (due.isValid && due > now.startOf("day")) return { kind: "upcoming" };
  const materials = hasMaterials(topic);
  return { kind: "due", normalQuiz: null, aiQuiz: { available: materials, reason: materials ? null : "no_materials" } };
}

// Whole local days past the revision date (R39).
function daysOverdue(revisionDate: string, now: DateTime) {
  const due = DateTime.fromISO(revisionDate).startOf("day");
  return due.isValid ? Math.max(0, Math.round(now.startOf("day").diff(due, "days").days)) : 0;
}

function DueBadge({ revisionDate, now }: { revisionDate: string; now: DateTime }) {
  const overdue = daysOverdue(revisionDate, now);
  if (overdue > 0) {
    return (
      <StatusBadge tone="destructive" icon={<TriangleAlert />}>
        Overdue {pluralize(overdue, "day")}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone="warning" icon={<AlarmClock />}>
      Due today
    </StatusBadge>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label-sm text-outline uppercase">{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}

function DoneSummary({ rating, nextRevisionDate, alreadyReviewed }: { rating?: number | null; nextRevisionDate?: string; alreadyReviewed: boolean }) {
  if (alreadyReviewed) {
    return <p className="m-0 text-body-md text-muted-foreground">This topic was already reviewed today. It comes back on its next review date.</p>;
  }
  return (
    <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2">
      {isNumber(rating) && (
        <Detail label="Rating">
          <span className="font-mono text-mono-lg text-success">
            {formatRating(rating)} · {ratingLabel(rating)}
          </span>
        </Detail>
      )}
      {nextRevisionDate && (
        <Detail label="Next review">
          <time dateTime={nextRevisionDate} className="font-mono text-mono-lg text-foreground">
            {formatDate(nextRevisionDate, DateTime.DATE_MED_WITH_WEEKDAY)}
          </time>
        </Detail>
      )}
    </dl>
  );
}

type DueActionsProps = {
  topicId: string;
  normalQuiz: (QuizState & { questionCount: number }) | null;
  aiQuiz: QuizState;
  onStartAiQuiz: () => void;
  onDone: () => void;
};

function DueActions({ topicId, normalQuiz, aiQuiz, onStartAiQuiz, onDone }: DueActionsProps) {
  const navigate = useNavigate();
  const normalReasonId = useId();
  const aiReasonId = useId();

  const normalBlocked = normalQuiz !== null && !normalQuiz.available;
  // Both quizzes blocked for the same reason share one note.
  const sharedReason = normalBlocked && !aiQuiz.available && normalQuiz.reason === aiQuiz.reason;
  const notes: { id: string; text: string }[] = [];
  if (sharedReason) {
    notes.push({ id: normalReasonId, text: reasonText(normalQuiz.reason) });
  } else {
    if (normalBlocked) notes.push({ id: normalReasonId, text: `Quiz: ${reasonText(normalQuiz.reason)}` });
    if (!aiQuiz.available) notes.push({ id: aiReasonId, text: `AI quiz: ${reasonText(aiQuiz.reason)}` });
  }
  const noQuiz = (normalQuiz === null || normalBlocked) && !aiQuiz.available;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {normalQuiz && (
          <Button
            disabled={!normalQuiz.available}
            aria-describedby={normalQuiz.available ? undefined : normalReasonId}
            // The quiz page's back link returns here.
            onClick={() => navigate(`/topic/${topicId}/quiz`, { state: { from: `/topic/${topicId}` } })}
          >
            <ListChecks data-icon="inline-start" />
            {normalQuiz.available ? `Start quiz (${pluralize(normalQuiz.questionCount, "question")})` : "Start quiz"}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!aiQuiz.available}
          aria-describedby={aiQuiz.available ? undefined : sharedReason ? normalReasonId : aiReasonId}
          onClick={onStartAiQuiz}
        >
          <Sparkles data-icon="inline-start" />
          Start AI quiz
        </Button>
        {/* Done needs no materials or questions (R34). */}
        <Button variant="secondary" onClick={onDone}>
          <Check data-icon="inline-start" />
          Done
        </Button>
      </div>
      {notes.map((note) => (
        <p key={note.id} id={note.id} className="m-0 text-body-sm text-muted-foreground">
          {note.text}
        </p>
      ))}
      {noQuiz && <p className="m-0 text-body-sm text-muted-foreground">Select Done to rate your recall without a quiz.</p>}
    </div>
  );
}

type DoneFormProps = {
  topicName: string;
  intervals?: number[];
  recording: boolean;
  error: string | null;
  onRecord: (rating: number) => void;
};

// Rendered inside the dialog's content, so the choice starts empty each time the dialog opens.
function DoneForm({ topicName, intervals, recording, error, onRecord }: DoneFormProps) {
  const [rating, setRating] = useState<number | null>(null);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="m-0">Rate your recall</DialogTitle>
        <DialogDescription className="m-0">
          How well did you remember "{topicName}"?{hasIntervals(intervals) && " Each rating shows when the topic comes back."}
        </DialogDescription>
      </DialogHeader>
      <RatingPicker value={rating} onChange={setRating} intervals={intervals} disabled={recording} label="Recall rating" />
      {error && (
        <p role="alert" className="m-0 text-body-md text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={recording}>
            Cancel
          </Button>
        </DialogClose>
        <Button disabled={rating === null || recording} onClick={() => rating !== null && onRecord(rating)}>
          {recording && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
          {recording ? "Recording…" : "Record rating"}
        </Button>
      </DialogFooter>
    </>
  );
}

const BUSY_STATES: QuestionBankSummary["state"][] = ["queued", "building"];

function bankStatus(bank: QuestionBankSummary): { text: string; icon: ReactNode } {
  const busy = BUSY_STATES.includes(bank.state);
  const spinner = <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />;
  // A rebuild keeps the previous questions usable until it finishes (R38).
  if (busy && (bank.rebuilding || bank.usableCount > 0)) return { text: "Updating questions", icon: spinner };
  if (busy) return { text: "Preparing questions", icon: spinner };
  if (bank.state === "ready") {
    if (bank.usableCount > 0) return { text: `${pluralize(bank.usableCount, "question")} ready`, icon: <CircleCheck aria-hidden="true" className="size-4 text-success" /> };
    return { text: "No questions left", icon: <CircleAlert aria-hidden="true" className="size-4 text-warning" /> };
  }
  if (bank.state === "failed" || bank.state === "empty") {
    const kept = bank.usableCount > 0 ? `; ${bank.usableCount} still ready` : "";
    return { text: `Couldn't generate questions${kept}`, icon: <CircleAlert aria-hidden="true" className="size-4 text-destructive" /> };
  }
  return { text: "No questions yet", icon: <CircleAlert aria-hidden="true" className="size-4 text-muted-foreground" /> };
}

function QuestionBankStatus({ topicId, bank }: { topicId: string; bank: QuestionBankSummary }) {
  const { mutate: regenerate, isPending, error } = useTopicQuestionsRegenerate();
  const { text, icon } = bankStatus(bank);
  // A build already running uses the current materials; another request would only repeat it.
  const busy = BUSY_STATES.includes(bank.state);

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="m-0 flex items-center gap-2 text-body-md text-muted-foreground">
          {icon}
          <span>{text}</span>
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy || isPending}>
              <RefreshCw data-icon="inline-start" />
              Regenerate questions
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="m-0">Regenerate questions?</AlertDialogTitle>
              <AlertDialogDescription className="m-0">
                This replaces the topic's questions with a new set from its materials. Current questions stay usable until the new set is ready, and flagged questions never come back.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => regenerate({ id: topicId })}>Regenerate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {Boolean(error) && (
        <p role="alert" className="m-0 text-body-sm text-destructive">
          Couldn't regenerate questions. {getApiErrorMessage(error)}
        </p>
      )}
    </div>
  );
}

/** The topic page's review area (R18, R33–R35): quizzes and Done when due, the result once done, and the question bank. */
export default function TopicActions({ topic, onStartAiQuiz }: TopicActionsProps) {
  const titleId = useId();
  const [doneOpen, setDoneOpen] = useState(false);
  const [recorded, setRecorded] = useState<RecordedReview | null>(null);
  const { mutate: revise, isPending: recording, error: reviseError, reset: resetRevise } = useTopicRevise();

  const now = DateTime.local();
  const view = reviewView(topic, now);
  const serverDone = view.kind === "done";
  const done = serverDone || recorded !== null;
  const bank = topic.questionBank;
  const showBank = Boolean(bank) && (bank?.state !== "none" || hasMaterials(topic));

  const openDone = () => {
    resetRevise();
    setDoneOpen(true);
  };

  const recordRating = (rating: number) => {
    revise(
      { id: topic._id, quality: { userQuality: rating } },
      {
        onSuccess: (res) => {
          setRecorded({ rating, nextRevisionDate: res?.nextRevisionDate });
          setDoneOpen(false);
        },
        onError: (error) => {
          // A topic takes one review a day (KTD8); the earlier review stands, so show the topic as done.
          if (getApiErrorCode(error) === "ALREADY_REVIEWED_TODAY") {
            setRecorded({ alreadyReviewed: true });
            setDoneOpen(false);
          }
        },
      },
    );
  };

  const reviseErrorText = reviseError && getApiErrorCode(reviseError) !== "ALREADY_REVIEWED_TODAY" ? getApiErrorMessage(reviseError, "Could not record the rating") : null;

  let badge: ReactNode;
  let body: ReactNode;
  if (done) {
    badge = (
      <StatusBadge tone="success" icon={<CircleCheck />}>
        Done today
      </StatusBadge>
    );
    // The server's copy wins once the refetch reports the review.
    const local = !serverDone && recorded && "rating" in recorded ? recorded : null;
    body = (
      <DoneSummary
        rating={serverDone ? topic.lastQuality : local?.rating}
        nextRevisionDate={serverDone ? topic.revisionDate : local?.nextRevisionDate}
        alreadyReviewed={!serverDone && recorded !== null && "alreadyReviewed" in recorded}
      />
    );
  } else if (view.kind === "upcoming") {
    badge = <StatusBadge icon={<CalendarClock />}>Not due yet</StatusBadge>;
    body = <DoneSummary nextRevisionDate={topic.revisionDate} alreadyReviewed={false} />;
  } else {
    badge = <DueBadge revisionDate={topic.revisionDate} now={now} />;
    body = view.kind === "due" && <DueActions topicId={topic._id} normalQuiz={view.normalQuiz} aiQuiz={view.aiQuiz} onStartAiQuiz={onStartAiQuiz} onDone={openDone} />;
  }

  return (
    <section aria-labelledby={titleId} className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="m-0 text-headline-sm text-foreground">
          Review
        </h3>
        {badge}
      </div>
      {body}
      {showBank && bank && <QuestionBankStatus topicId={topic._id} bank={bank} />}

      <Dialog
        open={doneOpen}
        onOpenChange={(open) => {
          if (!recording) setDoneOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DoneForm topicName={topic.topicName} intervals={topic.nextIntervals} recording={recording} error={reviseErrorText} onRecord={recordRating} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
