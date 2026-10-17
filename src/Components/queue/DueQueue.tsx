import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { CalendarCheck, SearchX } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Skeleton } from "@/Components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/Components/ui/alert-dialog";
import QueueCard from "./QueueCard";
import QueueFilters, { type QueueFilterOption } from "./QueueFilters";
import RevisionChat from "../topics/RevisionChat";
import TopicModal from "../topics/TopicModal";
import { DUE_QUEUE_KEY, useDueQueue, type DueTopic } from "../../hooks/useDueQueue";
import { useRefreshTopicAfterReview, useTopicDelete } from "../../hooks/useTopicQuery";
import { getApiErrorMessage } from "../../utils/apiErrors";

const ALL = "all";
const NEEDS_ATTENTION = "attention";
const SUBJECT_PREFIX = "subject:";

const GRID_CLASS = "m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2";

type QueueEntry = { topic: DueTopic; overdueDays: number };

type CardActions = {
  onStartAiQuiz: (topic: DueTopic) => void;
  onEdit: (topic: DueTopic) => void;
  onDelete: (topic: DueTopic) => void;
};

// Whole days from the revision date to the learner's local today (R39); negative when not due yet.
function daysOverdue(revisionDate: string, today: DateTime): number {
  const due = DateTime.fromISO(revisionDate).startOf("day");
  return due.isValid ? Math.round(today.diff(due, "days").days) : 0;
}

// Overdue, or last rated below 3 (R8).
function needsAttention({ topic, overdueDays }: QueueEntry): boolean {
  const failedRecently = typeof topic.lastQuality === "number" && topic.lastQuality < 3;
  return overdueDays > 0 || failedRecently;
}

function matchesFilter(entry: QueueEntry, filter: string): boolean {
  if (filter === NEEDS_ATTENTION) return needsAttention(entry);
  if (filter.startsWith(SUBJECT_PREFIX)) return entry.topic.subjectName === filter.slice(SUBJECT_PREFIX.length);
  return true;
}

function filterOptions(entries: QueueEntry[]): QueueFilterOption[] {
  const subjectCounts = new Map<string, number>();
  for (const { topic } of entries) {
    if (topic.subjectName) subjectCounts.set(topic.subjectName, (subjectCounts.get(topic.subjectName) ?? 0) + 1);
  }
  const subjects = [...subjectCounts].sort(([a], [b]) => a.localeCompare(b));
  return [
    { value: ALL, label: "All", count: entries.length },
    ...subjects.map(([subject, count]) => ({ value: `${SUBJECT_PREFIX}${subject}`, label: subject, count })),
    { value: NEEDS_ATTENTION, label: "Overdue or failed recently", count: entries.filter(needsAttention).length },
  ];
}

function QueueSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading today's list</span>
      <ul className={GRID_CLASS}>
        {[0, 1, 2, 3].map((key) => (
          <li key={key}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-8 w-48" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-12 text-center">
      {icon}
      <h2 className="m-0 text-headline-sm text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function QueueList({ topics, ...actions }: { topics: DueTopic[] } & CardActions) {
  const [filter, setFilter] = useState(ALL);

  const today = DateTime.local().startOf("day");
  const entries = topics.map((topic) => ({ topic, overdueDays: daysOverdue(topic.revisionDate, today) }));
  const visible = entries.filter((entry) => matchesFilter(entry, filter));

  return (
    <div className="flex flex-col gap-4">
      <QueueFilters options={filterOptions(entries)} value={filter} onChange={setFilter} />
      {visible.length === 0 ? (
        <EmptyState icon={<SearchX className="size-8 text-muted-foreground" />} title="No topics match this filter">
          <Button variant="outline" onClick={() => setFilter(ALL)}>
            Show all
          </Button>
        </EmptyState>
      ) : (
        <ul className={GRID_CLASS}>
          {visible.map(({ topic, overdueDays }) => (
            <li key={topic._id} className="min-w-0">
              <QueueCard topic={topic} overdueDays={overdueDays} {...actions} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DueQueue() {
  const queryClient = useQueryClient();
  const { data: topics, isPending, error, refetch } = useDueQueue();
  const { mutate: deleteTopic } = useTopicDelete();
  const refreshAfterReview = useRefreshTopicAfterReview();

  const [chatTopicId, setChatTopicId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<DueTopic | null>(null);
  // The target outlives the open flag so the dialog keeps its text while it animates closed.
  const [deleteTarget, setDeleteTarget] = useState<DueTopic | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refreshQueue = () => queryClient.invalidateQueries({ queryKey: DUE_QUEUE_KEY });

  // The chat records its own review. Refetch the queue so the card turns done and, when a
  // rating came back, the topic's other views, which the app's cache never marks stale on its own.
  const closeChat = (topicId: string, userQuality: number | null) => {
    setChatTopicId(null);
    if (userQuality == null) {
      refreshQueue();
      return;
    }
    refreshAfterReview(topicId);
  };

  // A saved edit refetches the queue through useTopicUpdate; a cancelled one changes nothing.
  const closeEditor = (show: boolean) => {
    if (show) return;
    setEditingTopic(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { _id, topicName } = deleteTarget;
    setDeleteError(null);
    deleteTopic({ id: _id }, { onError: (err) => setDeleteError(`Could not delete "${topicName}". ${getApiErrorMessage(err)}`) });
  };

  let content: ReactNode;
  if (isPending) {
    content = <QueueSkeleton />;
  } else if (!topics) {
    // Only a failed first load leaves no data; a failed refetch keeps showing the last list.
    content = (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl bg-card p-4">
        <p className="m-0 text-body-md text-destructive">Could not load today's list. {getApiErrorMessage(error)}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (topics.length === 0) {
    content = (
      <EmptyState icon={<CalendarCheck className="size-8 text-success" />} title="Nothing due today">
        <p className="m-0 text-body-md text-muted-foreground">You're all caught up.</p>
        <Button asChild variant="outline">
          <Link to="/topics" className="no-underline">
            See all topics
          </Link>
        </Button>
      </EmptyState>
    );
  } else {
    content = (
      <QueueList
        topics={topics}
        onStartAiQuiz={(topic) => setChatTopicId(topic._id)}
        onEdit={setEditingTopic}
        onDelete={(topic) => {
          setDeleteTarget(topic);
          setConfirmingDelete(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {deleteError && (
        <p role="alert" className="m-0 text-body-md text-destructive">
          {deleteError}
        </p>
      )}
      {content}

      {chatTopicId && <RevisionChat topicId={chatTopicId} onClose={(userQuality: number | null) => closeChat(chatTopicId, userQuality)} />}

      {editingTopic && <TopicModal topic={editingTopic} setShowModal={closeEditor} />}

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="m-0">Delete topic?</AlertDialogTitle>
            <AlertDialogDescription className="m-0">"{deleteTarget?.topicName}" and its review history will be deleted. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
