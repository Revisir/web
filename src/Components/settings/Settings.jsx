import { useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "react-bootstrap";
import { DateTime } from "luxon";
import { apiKeyErrorMessage, useApiKeyRevoke, useApiKeys } from "../../hooks/useApiKeys";
import CreateApiKeyModal from "./CreateApiKeyModal";

const STATUS_BADGE = {
  active: { label: "Active", className: "text-bg-success" },
  expired: { label: "Expired", className: "text-bg-secondary" },
  revoked: { label: "Revoked", className: "text-bg-danger" },
};

// Bootstrap tables colour their cells from this variable, so dim inactive rows through it.
const DIMMED_ROW = { "--bs-table-color": "var(--bs-secondary-color)" };

function formatDate(iso) {
  return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}

function formatDateTime(iso) {
  return DateTime.fromISO(iso).toLocaleString(DateTime.DATETIME_MED);
}

function lastUsedText(lastUsedAt) {
  return lastUsedAt ? DateTime.fromISO(lastUsedAt).toRelative() : "Never";
}

// Active keys first; expired and revoked below. The backend's newest-first order holds within each group.
function sortKeys(apiKeys) {
  return [...apiKeys].sort((a, b) => Number(b.status === "active") - Number(a.status === "active"));
}

function StatusBadge({ status }) {
  const { label, className } = STATUS_BADGE[status] ?? { label: status, className: "text-bg-secondary" };
  return <span className={`badge ${className}`}>{label}</span>;
}

function RevokeApiKeyModal({ apiKey, onClose }) {
  const { mutate: revokeKey, isPending, error } = useApiKeyRevoke();

  const handleConfirm = () => {
    revokeKey({ id: apiKey.id }, { onSuccess: onClose });
  };

  return (
    <Modal show onHide={isPending ? undefined : onClose} centered aria-labelledby="revoke-api-key-title">
      <ModalHeader closeButton={!isPending}>
        <ModalTitle id="revoke-api-key-title">Revoke API key</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p>
          Revoke <strong>{apiKey.name}</strong> (<code>{apiKey.displayPrefix}…</code>)?
        </p>
        <p className="text-body-secondary">{apiKey.lastUsedAt ? `Last used ${lastUsedText(apiKey.lastUsedAt)}.` : "This key has never been used."}</p>
        <p className="mb-0">Any client using this key stops working on its next request. This can't be undone.</p>
        {error && (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {apiKeyErrorMessage(error, "Could not revoke the key. Try again.")}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={handleConfirm} disabled={isPending}>
          {isPending ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              <span role="status">Revoking...</span>
            </>
          ) : (
            "Revoke key"
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}

function ApiKeyTable({ apiKeys, onRevoke }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Key</th>
            <th scope="col">Created</th>
            <th scope="col">Expires</th>
            <th scope="col">Last used</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortKeys(apiKeys).map((apiKey) => {
            const isActive = apiKey.status === "active";
            return (
              <tr key={apiKey.id} style={isActive ? undefined : DIMMED_ROW}>
                <td className="fw-semibold text-break">{apiKey.name}</td>
                <td>
                  <code className="text-nowrap">{apiKey.displayPrefix}…</code>
                </td>
                <td className="text-nowrap">{formatDate(apiKey.createdAt)}</td>
                <td className="text-nowrap">{apiKey.expiresAt ? formatDate(apiKey.expiresAt) : "Never"}</td>
                <td className="text-nowrap" title={apiKey.lastUsedAt ? formatDateTime(apiKey.lastUsedAt) : undefined}>
                  {lastUsedText(apiKey.lastUsedAt)}
                </td>
                <td>
                  <StatusBadge status={apiKey.status} />
                </td>
                <td className="text-end">
                  {isActive && (
                    <button className="btn btn-outline-danger btn-sm" onClick={() => onRevoke(apiKey)} aria-label={`Revoke ${apiKey.name}`}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Settings() {
  const { data: apiKeys, isPending, isError, error, refetch, isFetching } = useApiKeys();
  const [showCreate, setShowCreate] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState(null);
  const hasKeys = apiKeys?.length > 0;

  let content;
  if (isPending) {
    content = (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  } else if (isError && !apiKeys) {
    content = (
      <div className="alert alert-danger d-flex flex-wrap justify-content-between align-items-center gap-2" role="alert">
        <span>{apiKeyErrorMessage(error, "Could not load your API keys.")}</span>
        <button className="btn btn-outline-danger btn-sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Retrying..." : "Retry"}
        </button>
      </div>
    );
  } else if (!hasKeys) {
    content = (
      <div className="card text-center">
        <div className="card-body p-4">
          <h6 className="card-title">No API keys yet</h6>
          <p className="card-text text-body-secondary">
            An API key lets an AI assistant such as Claude Code, Cursor or VS Code add topics to Reviser and check what's due, through Reviser's MCP server. Create one key for each client you use.
          </p>
          <button className="btn btn-success" onClick={() => setShowCreate(true)}>
            Create your first key
          </button>
        </div>
      </div>
    );
  } else {
    content = <ApiKeyTable apiKeys={apiKeys} onRevoke={setKeyToRevoke} />;
  }

  return (
    <div>
      <h4 className="mb-4">Settings</h4>
      <section aria-labelledby="api-keys-heading">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h5 id="api-keys-heading" className="mb-1">
              API keys
            </h5>
            <p className="small text-body-secondary mb-0">Keys connect AI assistants to your Reviser account through MCP. A key can add topics and read what's due. It can't sign in to the web app or delete anything.</p>
          </div>
          {hasKeys && (
            <button className="btn btn-success text-nowrap" onClick={() => setShowCreate(true)}>
              Create API key
            </button>
          )}
        </div>
        {content}
      </section>
      {showCreate && <CreateApiKeyModal onClose={() => setShowCreate(false)} />}
      {keyToRevoke && <RevokeApiKeyModal apiKey={keyToRevoke} onClose={() => setKeyToRevoke(null)} />}
    </div>
  );
}
