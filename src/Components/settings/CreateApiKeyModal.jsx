import { useEffect, useId, useRef, useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Tab, Tabs } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { apiKeyErrorMessage, useApiKeyCreate } from "../../hooks/useApiKeys";
import { getConfig } from "../../config.mjs";

const EXPIRY_OPTIONS = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "never", label: "Never" },
];

// KTD17: the MCP server sits next to the REST API, so swap the trailing /api for /mcp.
function mcpServerUrl() {
  const backendUrl = getConfig("FE_BACKEND_URL") ?? "";
  return `${backendUrl.replace(/\/api\/?$/, "")}/mcp`;
}

// Every snippet reads the key from an env var or a password prompt, never the literal key.
function clientSnippets(mcpUrl) {
  return [
    {
      id: "claude-code",
      client: "Claude Code",
      intro: (
        <>
          Run in a terminal where <code>REVISER_API_KEY</code> is set. In PowerShell, write <code>$env:REVISER_API_KEY</code> instead.
        </>
      ),
      code: `claude mcp add --transport http reviser ${mcpUrl} --header "Authorization: Bearer $REVISER_API_KEY"`,
    },
    {
      id: "cursor",
      client: "Cursor",
      intro: (
        <>
          Add to <code>~/.cursor/mcp.json</code>, or <code>.cursor/mcp.json</code> in a project.
        </>
      ),
      code: JSON.stringify({ mcpServers: { reviser: { url: mcpUrl, headers: { Authorization: "Bearer ${env:REVISER_API_KEY}" } } } }, null, 2),
    },
    {
      id: "vscode",
      client: "VS Code",
      intro: (
        <>
          Add to <code>.vscode/mcp.json</code>. VS Code asks for the key when it first starts the server.
        </>
      ),
      code: JSON.stringify(
        {
          inputs: [{ type: "promptString", id: "reviser-api-key", description: "Reviser API key", password: true }],
          servers: { reviser: { type: "http", url: mcpUrl, headers: { Authorization: "Bearer ${input:reviser-api-key}" } } },
        },
        null,
        2,
      ),
    },
  ];
}

const COPY_TEXT = { idle: "Copy", copied: "Copied", failed: "Copy failed" };

function CopyButton({ text, label, autoFocus = false }) {
  const [state, setState] = useState("idle");
  const timer = useRef(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button type="button" className="btn btn-outline-secondary btn-sm text-nowrap" onClick={copy} autoFocus={autoFocus} aria-label={`${COPY_TEXT[state]} ${label}`}>
      {COPY_TEXT[state]}
    </button>
  );
}

function RevealStep({ apiKey, onDone, titleId }) {
  const snippets = clientSnippets(mcpServerUrl());
  return (
    <>
      <ModalHeader>
        <ModalTitle id={titleId}>Save your API key</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="alert alert-warning mb-2">Copy this key now. It won't be shown again.</div>
        <div className="d-flex align-items-center gap-2 border rounded bg-body-tertiary p-2 mb-4">
          <code className="flex-grow-1 text-break user-select-all">{apiKey}</code>
          <CopyButton text={apiKey} label="API key" autoFocus />
        </div>

        <h6>Connect your client</h6>
        <ol className="ps-3">
          <li className="mb-3">
            Save the key as the <code>REVISER_API_KEY</code> environment variable, for example by adding <code>export REVISER_API_KEY=&lt;your key&gt;</code> to your shell profile (<code>~/.zshrc</code> or <code>~/.bashrc</code>). On Windows, run <code>setx REVISER_API_KEY &lt;your key&gt;</code> and open a new terminal.
          </li>
          <li>
            Add Reviser to your client:
            <Tabs id="mcp-client-snippets" defaultActiveKey="claude-code" className="mt-2 mb-2">
              {snippets.map(({ id, client, intro, code }) => (
                <Tab key={id} eventKey={id} title={client}>
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <p className="small mb-0">{intro}</p>
                    <CopyButton text={code} label={`${client} snippet`} />
                  </div>
                  <pre className="border rounded bg-body-tertiary p-3 small mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {code}
                  </pre>
                </Tab>
              ))}
            </Tabs>
          </li>
        </ol>
        <ul className="small text-body-secondary mb-0">
          <li>Never put the key in a URL or commit it in a config file. The snippets above read it from an environment variable or a prompt.</li>
          <li>If your client reports an authentication error, the key has expired or been revoked. Create a new one here.</li>
          <li>Resetting your Reviser password does not revoke keys. Revoke them here when you stop using them.</li>
        </ul>
      </ModalBody>
      <ModalFooter>
        <button className="btn btn-success" onClick={onDone}>
          Done
        </button>
      </ModalFooter>
    </>
  );
}

export default function CreateApiKeyModal({ onClose }) {
  const titleId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { name: "", expiry: "90d" } });

  // Read the key straight from the mutation result: copying it into state would outlive reset().
  const { mutate: createKey, reset, data, error, isPending } = useApiKeyCreate();
  const revealed = Boolean(data?.key);
  // While creating, closing would lose the key; once revealed, only Done may close.
  const locked = isPending || revealed;

  const onSubmit = ({ name, expiry }) => {
    createKey({ name: name.trim(), expiry });
  };

  const handleDone = () => {
    reset();
    onClose();
  };

  return (
    <Modal show onHide={locked ? undefined : onClose} backdrop={locked ? "static" : true} keyboard={!locked} size={revealed ? "lg" : undefined} centered aria-labelledby={titleId}>
      {revealed ? (
        <RevealStep apiKey={data.key} onDone={handleDone} titleId={titleId} />
      ) : (
        <>
          <ModalHeader closeButton={!isPending}>
            <ModalTitle id={titleId}>Create API key</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <form id="create-api-key-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-floating mb-3">
                <input
                  id="apiKeyName"
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  placeholder="Name"
                  maxLength={50}
                  autoComplete="off"
                  autoFocus
                  aria-describedby="apiKeyNameHelp"
                  {...register("name", { validate: (value) => value.trim().length > 0 && value.trim().length <= 50 })}
                />
                <label htmlFor="apiKeyName">Name</label>
                <div id="apiKeyNameHelp" className={errors.name ? "invalid-feedback" : "form-text"}>
                  {errors.name ? "Enter a name of up to 50 characters." : "Where you'll use it, like \"work laptop\"."}
                </div>
              </div>
              <div className="form-floating mb-3">
                <select id="apiKeyExpiry" className="form-select" {...register("expiry")}>
                  {EXPIRY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label htmlFor="apiKeyExpiry">Expires after</label>
              </div>
              {error && (
                <div className="alert alert-danger mb-0" role="alert">
                  {apiKeyErrorMessage(error, "Could not create the key. Try again.")}
                </div>
              )}
            </form>
          </ModalBody>
          <ModalFooter>
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" form="create-api-key-form" className="btn btn-success" disabled={isPending}>
              {isPending ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  <span role="status">Creating...</span>
                </>
              ) : (
                "Create"
              )}
            </button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
