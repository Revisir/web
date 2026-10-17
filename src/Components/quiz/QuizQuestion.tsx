import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, CircleCheck, CircleX, Flag, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardFooter } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/Components/ui/radio-group";
import type { QuizQuestion as QuizQuestionData } from "../../service/quiz_service";
import type { RevealedAnswer } from "../../hooks/useQuiz";
import { getApiErrorMessage } from "../../utils/apiErrors";

type QuizQuestionProps = {
  question: QuizQuestionData;
  // Present once the server has graded the answer.
  answer: RevealedAnswer | undefined;
  flagged: boolean;
  submitting: boolean;
  submitError: unknown;
  flagging: boolean;
  flagError: unknown;
  isLast: boolean;
  finishing: boolean;
  onSubmit: (response: string) => void;
  onRetry: () => void;
  onFlag: () => void;
  onNext: () => void;
};

/** One question: answer it, see it graded with the correct answer, optionally flag it, then move on. */
export default function QuizQuestion({
  question,
  answer,
  flagged,
  submitting,
  submitError,
  flagging,
  flagError,
  isLast,
  finishing,
  onSubmit,
  onRetry,
  onFlag,
  onNext,
}: QuizQuestionProps) {
  const [draft, setDraft] = useState("");
  const promptRef = useRef<HTMLHeadingElement>(null);
  const promptId = useId();
  const inputId = useId();
  const revealed = answer !== undefined;
  // A submitted answer stays fixed: a retry resends it, and the server keeps the first answer it grades.
  const locked = revealed || submitting || Boolean(submitError);
  const canSubmit = !locked && draft.trim() !== "";

  // Each question mounts fresh, so keyboard and screen-reader users start at the new prompt.
  useEffect(() => {
    promptRef.current?.focus();
  }, []);

  function submit() {
    if (!canSubmit) return;
    onSubmit(question.type === "mcq" ? draft : draft.trim());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  // Radio buttons swallow Enter, so submit from the group directly.
  function handleOptionsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submit();
  }

  return (
    <Card className="gap-5">
      <CardContent className="flex flex-col gap-5">
        <h2 ref={promptRef} id={promptId} tabIndex={-1} className="text-headline-sm break-words text-foreground outline-none">
          {question.prompt}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {question.type === "mcq" ? (
            <RadioGroup value={draft} onValueChange={setDraft} disabled={locked} aria-labelledby={promptId} onKeyDown={handleOptionsKeyDown}>
              {(question.options ?? []).map((option, position) => (
                <OptionRow key={`${position}-${option}`} id={`${promptId}-option-${position}`} option={option} answer={answer} />
              ))}
            </RadioGroup>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor={inputId}>Your answer</Label>
              <Input
                id={inputId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={locked}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="h-10"
              />
            </div>
          )}

          {Boolean(submitError) && (
            <QuizNotice
              title="Your answer didn't go through."
              detail={getApiErrorMessage(submitError)}
              action={
                <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={submitting}>
                  <RotateCcw aria-hidden="true" />
                  Retry
                </Button>
              }
            />
          )}

          {!revealed && !submitError && (
            <Button type="submit" size="lg" className="self-start px-4" disabled={!canSubmit}>
              {submitting ? "Checking…" : "Submit answer"}
            </Button>
          )}
        </form>

        <div role="status">{answer && <AnswerReveal answer={answer} showResponse={question.type === "fill_blank"} />}</div>
      </CardContent>

      {revealed && (
        <CardFooter className="flex-wrap justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {flagged ? (
              <>
                <Badge variant="outline">
                  <Flag aria-hidden="true" />
                  Flagged
                </Badge>
                <span className="text-body-sm text-muted-foreground">Not scored, and it won't come back.</span>
              </>
            ) : (
              <FlagButton flagging={flagging} disabled={finishing} onConfirm={onFlag} />
            )}
          </div>
          <Button size="lg" className="px-4" onClick={onNext} disabled={finishing || flagging} autoFocus>
            {isLast ? (finishing ? "Finishing…" : "Finish quiz") : "Next"}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
          {Boolean(flagError) && <QuizNotice className="w-full" title="The question couldn't be flagged." detail={getApiErrorMessage(flagError)} />}
        </CardFooter>
      )}
    </Card>
  );
}

function OptionRow({ id, option, answer }: { id: string; option: string; answer: RevealedAnswer | undefined }) {
  const isCorrect = answer !== undefined && option === answer.correctAnswer;
  const isWrongChoice = answer !== undefined && !answer.correct && option === answer.response;
  return (
    <Label
      htmlFor={id}
      className={cn(
        // Stitch text-* sizes stay off merged classes: tailwind-merge would read them as colors.
        "w-full cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-container-lowest p-3 leading-snug font-normal break-words whitespace-normal has-[[data-state=checked]]:border-primary has-[:disabled]:cursor-default",
        isCorrect && "border-success bg-success/10 has-[[data-state=checked]]:border-success",
        isWrongChoice && "border-destructive bg-destructive/10 has-[[data-state=checked]]:border-destructive",
      )}
    >
      <RadioGroupItem id={id} value={option} className="mt-0.5" />
      <span className="min-w-0 flex-1">{option}</span>
      {isCorrect && (
        <>
          <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
          {" "}
          <span className="sr-only">(correct answer)</span>
        </>
      )}
      {isWrongChoice && (
        <>
          <CircleX aria-hidden="true" className="size-4 shrink-0 text-destructive" />
          {" "}
          <span className="sr-only">(your answer)</span>
        </>
      )}
    </Label>
  );
}

function AnswerReveal({ answer, showResponse }: { answer: RevealedAnswer; showResponse: boolean }) {
  const Icon = answer.correct ? CircleCheck : CircleX;
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3", answer.correct ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10")}>
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", answer.correct ? "text-success" : "text-destructive")} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-headline-sm text-foreground">{answer.correct ? "Correct" : "Incorrect"}</p>
        {showResponse && (
          <p className="text-body-md break-words text-muted-foreground">
            Your answer: <span className="text-foreground">{answer.response}</span>
          </p>
        )}
        <p className="text-body-md break-words text-muted-foreground">
          Correct answer: <span className="font-medium text-foreground">{answer.correctAnswer}</span>
        </p>
      </div>
    </div>
  );
}

function FlagButton({ flagging, disabled, onConfirm }: { flagging: boolean; disabled: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="-ml-2.5 text-muted-foreground" disabled={flagging || disabled}>
          <Flag aria-hidden="true" />
          {flagging ? "Flagging…" : "Flag question"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Flag this question?</AlertDialogTitle>
          <AlertDialogDescription>
            Flag a question that is wrong or unclear. It leaves this quiz's score and never comes back for this topic.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Flag question</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** An inline error with an optional action, such as Retry. */
export function QuizNotice({ title, detail, action, className }: { title: string; detail?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3", className)}>
      <CircleX aria-hidden="true" className="size-4 shrink-0 self-start text-destructive" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body-md break-words text-foreground">{title}</p>
        {detail && <p className="text-body-sm break-words text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </div>
  );
}
