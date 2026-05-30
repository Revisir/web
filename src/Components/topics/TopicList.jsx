import { useState, useMemo } from "react";
import TopicListItem from "./TopicListItem";
import { useTopicsList } from "../../hooks/useTopicQuery";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from "@tanstack/react-table";

export default function TopicList({ listKey, loader }) {
  const [addingTopic, setAddingTopic] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [page, setPage] = useState(1);
  console.log("Rendering ", listKey);
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
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px", height: "100%" }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div>
          {/* Sorting Headers */}
          {/* <div className="d-flex border-bottom py-2 px-3 bg-light fw-semibold small">
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  className="flex-fill"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted()] ?? ""}
                </div>
              ))
            )}
          </div> */}

          {/* List Items */}
          <div className="list-group">
            {table.getRowModel().rows.map((row) => (
              <TopicListItem key={row.original._id} id={row.original._id} />
            ))}

            <div className="list-group-item list-group-item-action">
              <form autoComplete="off" onSubmit={handleQuickAdd} onFocus={() => setInputActive(true)} onBlur={() => setInputActive(false)}>
                <div className="input-group">
                  {addingTopic && (
                    <span className="input-group-text" id="basic-addon2" style={{ width: "45px" }}>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span className="visually-hidden" role="status">
                        Loading...
                      </span>
                    </span>
                  )}
                  <input id="newTopicName" className="form-control" type="text" placeholder="Quickly Add New Topic" aria-label="quickly add new topic" disabled={addingTopic} />
                  {inputActive && (
                    <span className="input-group-text" id="basic-addon2">
                      <svg width="20" height="20" viewBox="0 0 20 20">
                        <g stroke="currentColor" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 3v4c0 2-2 4-4 4H2"></path>
                          <path d="M8 17l-6-6 6-6"></path>
                        </g>
                      </svg>
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center px-3 py-2">
              <small className="text-muted">
                Page {page} of {totalPages}
              </small>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  Previous
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
