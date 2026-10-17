import { DateTime } from "luxon";
import { Link, useNavigate } from "react-router-dom";
import { useState, memo } from "react";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
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
import IconButton from "@/Components/common/IconButton";
import { extractRevisionBooleans } from "../../utils/topics.utils";
import { useMinTopicDetails, useTopicDelete } from "../../hooks/useTopicQuery";

// A due topic is reviewed from the queue or its topic page, so the row carries no rating control (R44).
/** @type {import("react").NamedExoticComponent<{ id: string }>} */
const TopicListItem = memo(({ id }) => {
  const navigate = useNavigate();
  const { data: item } = useMinTopicDetails(id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { isPending: isDeleting, mutate: deleteTopic } = useTopicDelete();

  if (!item) {
    return null;
  }
  const { next_revision } = extractRevisionBooleans({ lastRevised: item.lastRevised, revisionDate: item.revisionDate });
  const topicName = item.topicName || item.topic_name;

  const handleDelete = async () => {
    try {
      deleteTopic({ id: item._id });
      setShowDeleteModal(false);
    } catch {
      console.error("Failed to delete topic");
    }
  };
  return (
    <>
      <div className="px-4 py-2 transition-colors hover:bg-surface-container">
        <div className="flex items-center justify-between gap-2">
          <Link to={`/topic/${item._id}`} className="min-w-0 flex-1 text-foreground no-underline hover:text-foreground">
            <span className="block pt-1 text-body-md font-semibold break-words">{topicName}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
              {item.subjectName && <span className="max-w-full truncate rounded bg-primary/15 px-2 py-0.5 font-mono text-mono-sm font-semibold uppercase text-primary">{item.subjectName}</span>}
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                <span className="font-mono text-mono-sm">{next_revision.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}</span>
              </span>
            </span>
          </Link>
          <div className="flex gap-2">
            <IconButton
              label="Delete"
              variant="destructive"
              size="icon-sm"
              className="hidden md:inline-flex"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              disabled={isDeleting}
            >
              <Trash2 />
            </IconButton>

            <IconButton
              label="Edit"
              variant="outline"
              size="icon-sm"
              className="hidden md:inline-flex"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/topic/${item._id}`);
              }}
            >
              <Pencil />
            </IconButton>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="m-0">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className="m-0">Are you sure you want to delete "{topicName}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export default TopicListItem;
