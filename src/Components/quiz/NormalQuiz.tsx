import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, X } from "lucide-react";
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
import { Progress } from "@/Components/ui/progress";
import { Skeleton } from "@/Components/ui/skeleton";
import QuizQuestion, { QuizNotice } from "./QuizQuestion";
import QuizResult from "./QuizResult";
import { useQuiz } from "../../hooks/useQuiz";
import { getApiErrorCode, getApiErrorMessage } from "../../utils/apiErrors";

type BackLink = { to: string; label: string };

// Start errors the learner cannot fix by retrying (see the quiz API contract).
const START_ERRORS: Record<string, { title: string; detail: string }> = {
  ALREADY_REVIEWED_TODAY: {
    title: "You already reviewed this topic today",
    detail: "A topic takes one review a day. It comes back on its next review date.",
  },
  NOT_DUE: {
    title: "This topic isn't due yet",
    detail: "A quiz opens once the topic is due for review.",
  },
  NOT_ENOUGH_QUESTIONS: {
    title: "Not enough questions for a quiz",
    detail: "A quiz needs at least three usable questions from this topic's materials.",
  },
  TOPIC_NOT_FOUND: {
    title: "Topic not found",
    detail: "This topic doesn't exist or has been deleted.",
  },
};

/** The normal quiz page at /topic/:id/quiz (R21–R30). */
export default function NormalQuiz() {
  const { id = "" } = useParams();
  // A new topic id starts a new session from scratch.
  return <QuizSessionView key={id} topicId={id} />;
}

// Where the quiz was started from, passed as router state `from`; Today's List otherwise.
function useBackLink(): BackLink {
  const from: unknown = (useLocation().state as { from?: unknown } | null)?.from;
  const to = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/";
  if (to === "/") return { to, label: "Back to Today's List" };
  if (to === "/topics") return { to, label: "Back to Topics" };
  if (to.startsWith("/topic/")) return { to, label: "Back to the topic" };
  return { to, label: "Go back" };
}

function QuizSessionView({ topicId }: { topicId: string }) {
  const quiz = useQuiz(topicId);
  const back = useBackLink();
  const navigate = useNavigate();

  if (quiz.starting) {
    return (
      <QuizPage>
        <div aria-busy="true" className="flex flex-col gap-4">
          <p className="text-body-md text-muted-foreground">Starting your quiz…</p>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-1 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </QuizPage>
    );
  }

  if (quiz.startError || !quiz.session) {
    const known = START_ERRORS[getApiErrorCode(quiz.startError) ?? ""];
    return (
      <QuizPage>
        <section role="alert" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h1 className="text-headline-md text-foreground">{known?.title ?? "The quiz couldn't start"}</h1>
          <p className="text-body-md text-muted-foreground">{known?.detail ?? getApiErrorMessage(quiz.startError)}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {!known && (
              <Button size="lg" className="px-4" onClick={quiz.retryStart}>
                <RotateCcw aria-hidden="true" data-icon="inline-start" />
                Try again
              </Button>
            )}
            <BackButton back={back} variant={known ? "default" : "outline"} />
          </div>
        </section>
      </QuizPage>
    );
  }

  const { session, question } = quiz;

  if (quiz.completion) {
    return (
      <QuizPage>
        <QuizResult topicName={session.topicName} questions={session.questions} completion={quiz.completion} backTo={back.to} backLabel={back.label} />
      </QuizPage>
    );
  }

  if (!question) {
    return (
      <QuizPage>
        <section role="alert" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h1 className="text-headline-md text-foreground">This quiz has no questions</h1>
          <div>
            <BackButton back={back} />
          </div>
        </section>
      </QuizPage>
    );
  }

  const total = quiz.questions.length;
  const finishErrorCode = getApiErrorCode(quiz.finishError);

  return (
    <QuizPage>
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <ExitButton onConfirm={() => navigate(back.to, { replace: true })} />
          <p className="font-mono text-mono-sm whitespace-nowrap text-primary">{`Question ${quiz.index + 1} of ${total}`}</p>
        </div>
        <h1 className="text-headline-md break-words text-foreground">{session.topicName}</h1>
        <Progress value={(quiz.answeredCount / total) * 100} aria-label="Quiz progress" aria-valuetext={`${quiz.answeredCount} of ${total} answered`} />
      </header>

      <QuizQuestion
        key={question.id}
        question={question}
        answer={quiz.answer}
        flagged={quiz.isFlagged}
        submitting={quiz.submitting}
        submitError={quiz.submitError}
        flagging={quiz.flagging}
        flagError={quiz.flagError}
        isLast={quiz.isLast}
        finishing={quiz.finishing}
        onSubmit={quiz.submitAnswer}
        onRetry={quiz.retryAnswer}
        onFlag={quiz.flagQuestion}
        onNext={quiz.next}
      />

      {Boolean(quiz.finishError) &&
        (finishErrorCode === "ALREADY_REVIEWED_TODAY" ? (
          <QuizNotice
            title="This topic was already reviewed today, so this quiz wasn't recorded."
            action={<BackButton back={back} variant="outline" size="sm" />}
          />
        ) : (
          <QuizNotice title="Your results couldn't be saved. Select Finish quiz to try again." detail={getApiErrorMessage(quiz.finishError)} />
        ))}
    </QuizPage>
  );
}

// A focused single column that stays readable at phone width.
function QuizPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6 py-6">{children}</div>;
}

function BackButton({ back, variant = "default", size = "lg" }: { back: BackLink; variant?: "default" | "outline"; size?: "sm" | "lg" }) {
  return (
    <Button asChild variant={variant} size={size} className={size === "lg" ? "px-4" : undefined}>
      <Link to={back.to} replace>
        <ArrowLeft aria-hidden="true" data-icon="inline-start" />
        {back.label}
      </Link>
    </Button>
  );
}

// Leaving records no rating and keeps the topic due; flags already placed stay (R28).
function ExitButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="-ml-2.5 text-muted-foreground">
          <X aria-hidden="true" data-icon="inline-start" />
          Exit quiz
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this quiz?</AlertDialogTitle>
          <AlertDialogDescription>No rating is recorded and the topic stays due. Questions you flagged stay retired.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep going</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Leave quiz
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
