import { useState, useMemo } from "react";
import { CornerDownLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import TopicListItem from "./TopicListItem";
import { useTopicsList } from "../../hooks/useTopicQuery";
import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";

const ADDON_CLASS = "inline-flex shrink-0 items-center justify-center border border-input bg-surface-container px-3 text-muted-foreground";

export default function TopicList({ listKey, loader }) {
  const [addingTopic, setAddingTopic] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [page, setPage] = useState(1);

  const { data, totalPages, isFetched } = useTopicsList(listKey, loader, page);

  const columns = useMemo(
    () => [
      { accessorKey: "topicName", header: "Topic" },
      { accessorKey: "subjectName", header: "Subject" },
      { accessorKey: "revisionDate", header: "Next Revision" },
      { accessorKey: "lastRevised", header: "Last Revised" },
    ],
    [],
  );

  const table = useReactTable({
    data: data || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const handleQuickAdd = async (event) => {
    event.preventDefault();
    setAddingTopic(true);
    setAddingTopic(false);
  };

  return (
    <>
      {!isFetched ? (
        <div className="flex h-full min-h-[200px] items-center justify-center" role="status">
          <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <div>
          {/* List Items */}
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
            {table.getRowModel().rows.map((row) => (
              <TopicListItem key={row.original._id} id={row.original._id} />
            ))}

            <div className="px-4 py-2">
              <form autoComplete="off" onSubmit={handleQuickAdd} onFocus={() => setInputActive(true)} onBlur={() => setInputActive(false)}>
                <div className="flex w-full items-stretch">
                  {addingTopic && (
                    <span className={`${ADDON_CLASS} w-[45px] rounded-l-lg border-r-0`}>
                      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                      <span className="sr-only" role="status">
                        Loading...
                      </span>
                    </span>
                  )}
                  <Input
                    id="newTopicName"
                    className={`h-9 flex-1 ${addingTopic ? "rounded-l-none" : ""} ${inputActive ? "rounded-r-none" : ""}`}
                    type="text"
                    placeholder="Quickly Add New Topic"
                    aria-label="quickly add new topic"
                    disabled={addingTopic}
                  />
                  {inputActive && (
                    <span className={`${ADDON_CLASS} rounded-r-lg border-l-0`}>
                      <CornerDownLeft aria-hidden="true" className="size-4" />
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-body-sm text-muted-foreground">
                Page <span className="font-mono text-mono-sm">{page}</span> of <span className="font-mono text-mono-sm">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
