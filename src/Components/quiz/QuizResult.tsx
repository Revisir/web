import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DateTime } from "luxon";
import { ArrowLeft, Flag } from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import type { QuizCompletion, QuizQuestion, QuizQuestionResult } from "../../service/quiz_service";
import { formatRating, ratingLabel } from "../../utils/ratings";

type QuizResultProps = {
  topicName: string;
  questions: QuizQuestion[];
  completion: QuizCompletion;
  backTo: string;
  backLabel: string;
};

/** The finished quiz: score, rating or none, next review date and each question's result (R27, R30). */
export default function QuizResult({ topicName, questions, completion, backTo, backLabel }: QuizResultProps) {
  const { rating, scored, correct, nextRevisionDate, results } = completion;
  const percent = scored > 0 ? Math.round((correct / scored) * 100) : null;
  const prompts = new Map(questions.map((question) => [question.id, question.prompt]));

  return (
    <section aria-labelledby="quiz-result-title" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-label-sm text-outline uppercase">Quiz complete</p>
        <h1 id="quiz-result-title" className="text-headline-md break-words text-foreground">
          {topicName}
        </h1>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="Score">
          <p className="font-mono text-headline-lg text-foreground">{percent === null ? "–" : `${percent}%`}</p>
          <p className="font-mono text-mono-md text-muted-foreground">{`${correct} of ${scored} correct`}</p>
        </Stat>
        <Stat label="Rating">
          {rating === null ? (
            <p className="text-headline-sm text-foreground">No rating recorded</p>
          ) : (
            <>
              <p className="font-mono text-headline-lg text-primary">{formatRating(rating)}</p>
              <p className="text-body-md text-muted-foreground">{ratingLabel(rating)}</p>
            </>
          )}
        </Stat>
        <Stat label="Next review">
          <p className="font-mono text-mono-lg text-foreground">
            {nextRevisionDate ? DateTime.fromISO(nextRevisionDate).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY) : "Still due"}
          </p>
        </Stat>
      </dl>

      {rating === null && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-body-md text-foreground">
          A quiz needs at least three scored questions to record a rating, so this one recorded nothing. The topic is still due.
        </p>
      )}

      <section aria-labelledby="quiz-result-questions" className="flex flex-col gap-3">
        <h2 id="quiz-result-questions" className="text-headline-sm text-foreground">
          Questions
        </h2>
        <ol className="flex flex-col gap-2">
          {results.map((result, position) => (
            <li key={result.questionId} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-mono-sm text-outline">{`Q${position + 1}`}</span>
                <ResultBadge result={result} />
              </div>
              {prompts.has(result.questionId) && <p className="text-body-md break-words text-foreground">{prompts.get(result.questionId)}</p>}
              <p className="text-body-sm break-words text-muted-foreground">
                Correct answer: <span className="text-foreground">{result.correctAnswer}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Button asChild size="lg" className="self-start px-4">
        <Link to={backTo} replace>
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          {backLabel}
        </Link>
      </Button>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <dt className="text-label-sm text-outline uppercase">{label}</dt>
      <dd className="flex flex-col gap-0.5">{children}</dd>
    </div>
  );
}

// A flagged question is left out of the score whether or not it was answered correctly (R26).
function ResultBadge({ result }: { result: QuizQuestionResult }) {
  if (result.flagged) {
    return (
      <Badge variant="outline">
        <Flag aria-hidden="true" />
        Flagged, not scored
      </Badge>
    );
  }
  if (result.correct) return <Badge className="bg-success/15 text-success">Correct</Badge>;
  return <Badge variant="destructive">Wrong</Badge>;
}
