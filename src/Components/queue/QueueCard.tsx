import { useId, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlarmClock, ArrowRight, CalendarClock, CircleCheck, EllipsisVertical, ListChecks, Pencil, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import IconButton from "@/Components/common/IconButton";
import MetricChip from "@/Components/common/MetricChip";
import StatusBadge from "@/Components/common/StatusBadge";
import type { DueTopic, ReviewAvailability, ReviewReason } from "../../hooks/useDueQueue";
import { formatRating, ratingLabel } from "../../utils/ratings";
import { formatDate, isNumber, pluralize, REVIEW_REASON_TEXT, reviewReasonText } from "../../utils/review";

type QueueCardProps = {
  topic: DueTopic;
  // Whole local days since the revision date: 0 when due today, negative when not due yet.
  overdueDays: number;
  onStartAiQuiz: (topic: DueTopic) => void;
  onEdit: (topic: DueTopic) => void;
  onDelete: (topic: DueTopic) => void;
};


const LINK_CLASS = "inline-flex items-center gap-1 text-label-md text-primary no-underline hover:underline";

function TopicStatus({ topic, overdueDays }: { topic: DueTopic; overdueDays: number }) {
  if (topic.review?.doneToday) {
    return (
      <StatusBadge tone="success" icon={<CircleCheck />}>
        Done
      </StatusBadge>
    );
  }
  if (overdueDays > 0) {
    return (
      <StatusBadge tone="destructive" icon={<TriangleAlert />}>
        Overdue {pluralize(overdueDays, "day")}
      </StatusBadge>
    );
  }
  if (overdueDays === 0) {
    return (
      <StatusBadge tone="warning" icon={<AlarmClock />}>
        Due today
      </StatusBadge>
    );
  }
  return (
    <StatusBadge icon={<CalendarClock />}>
      Due {formatDate(topic.revisionDate)}
    </StatusBadge>
  );
}

function ReasonText({ reason, topicId }: { reason: ReviewReason | null; topicId: string }) {
  if (reason === "no_questions") {
    return (
      <>
        {REVIEW_REASON_TEXT.no_questions} —{" "}
        <Link to={`/topic/${topicId}`} className="text-primary underline underline-offset-4">
          regenerate them on the topic page
        </Link>
      </>
    );
  }
  return <>{reviewReasonText(reason)}</>;
}

function DoneSummary({ topic }: { topic: DueTopic }) {
  const rating = topic.lastQuality;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-surface-container-lowest px-3 py-2 text-body-sm text-muted-foreground">
      {isNumber(rating) && (
        <span>
          Rated{" "}
          <span className="font-mono text-mono-md font-semibold text-success">
            {formatRating(rating)} · {ratingLabel(rating)}
          </span>
        </span>
      )}
      <span>
        Next review{" "}
        <time dateTime={topic.revisionDate} className="font-mono text-mono-md text-foreground">
          {formatDate(topic.revisionDate)}
        </time>
      </span>
    </div>
  );
}

function ReviewActions({ topic, review, onStartAiQuiz }: { topic: DueTopic; review: ReviewAvailability; onStartAiQuiz: (topic: DueTopic) => void }) {
  const navigate = useNavigate();
  const normalReasonId = useId();
  const aiReasonId = useId();
  const { normalQuiz, aiQuiz } = review;

  // Both quizzes blocked for the same reason share one note.
  const sharedReason = !normalQuiz.available && !aiQuiz.available && normalQuiz.reason === aiQuiz.reason;
  const notes: { id: string; content: ReactNode }[] = [];
  if (sharedReason) {
    notes.push({ id: normalReasonId, content: <ReasonText reason={normalQuiz.reason} topicId={topic._id} /> });
  } else {
    if (!normalQuiz.available) {
      notes.push({ id: normalReasonId, content: <>Quiz: <ReasonText reason={normalQuiz.reason} topicId={topic._id} /></> });
    }
    if (!aiQuiz.available) {
      notes.push({ id: aiReasonId, content: <>AI quiz: <ReasonText reason={aiQuiz.reason} topicId={topic._id} /></> });
    }
  }
  // With no quiz to take, the topic page's Done finishes the review (R11).
  const pointToDone = !normalQuiz.available && !aiQuiz.available && normalQuiz.reason !== "not_due";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!normalQuiz.available}
          aria-describedby={normalQuiz.available ? undefined : normalReasonId}
          onClick={() => navigate(`/topic/${topic._id}/quiz`)}
        >
          <ListChecks data-icon="inline-start" />
          {normalQuiz.available ? `Start quiz (${pluralize(normalQuiz.questionCount, "question")})` : "Start quiz"}
        </Button>
        <Button
          variant="outline"
          disabled={!aiQuiz.available}
          aria-describedby={aiQuiz.available ? undefined : sharedReason ? normalReasonId : aiReasonId}
          onClick={() => onStartAiQuiz(topic)}
        >
          <Sparkles data-icon="inline-start" />
          Start AI quiz
        </Button>
      </div>
      {notes.map((note) => (
        <p key={note.id} id={note.id} className="m-0 text-body-sm text-muted-foreground">
          {note.content}
        </p>
      ))}
      {pointToDone && (
        <Link to={`/topic/${topic._id}`} className={LINK_CLASS}>
          Mark as done on the topic page
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export default function QueueCard({ topic, overdueDays, onStartAiQuiz, onEdit, onDelete }: QueueCardProps) {
  const titleId = useId();
  const { review } = topic;

  return (
    <Card role="article" aria-labelledby={titleId} className="h-full">
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <span className="max-w-full truncate rounded bg-primary/15 px-2 py-0.5 font-mono text-mono-sm font-semibold uppercase text-primary">{topic.subjectName}</span>
            <h2 id={titleId} className="m-0 text-headline-sm break-words text-foreground">
              <Link to={`/topic/${topic._id}`} className="text-foreground no-underline hover:text-primary hover:underline">
                {topic.topicName}
              </Link>
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <TopicStatus topic={topic} overdueDays={overdueDays} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="Topic actions" size="icon-sm">
                  <EllipsisVertical />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(topic)}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(topic)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <dl className="m-0 flex flex-wrap gap-1.5">
          {isNumber(topic.interval) && <MetricChip label="Interval" value={pluralize(topic.interval, "day")} />}
          {isNumber(topic.repetitionNumber) && <MetricChip label="Repetitions" value={topic.repetitionNumber} />}
          {isNumber(topic.eFactor) && <MetricChip label="Ease factor" value={topic.eFactor.toFixed(2)} />}
          {isNumber(topic.estimatedRecall) && <MetricChip label="Recall" value={`${Math.round(topic.estimatedRecall * 100)}%`} />}
        </dl>

        <div className="mt-auto">
          {review?.doneToday ? (
            <DoneSummary topic={topic} />
          ) : review ? (
            <ReviewActions topic={topic} review={review} onStartAiQuiz={onStartAiQuiz} />
          ) : (
            // Backends from before the due queue send no availability; the topic page still reviews the topic.
            <Link to={`/topic/${topic._id}`} className={LINK_CLASS}>
              Open topic
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
