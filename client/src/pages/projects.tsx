import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ChevronRight,
  Download,
  Layers,
  LoaderCircle,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ChangeRequest, Project } from "../../../shared/types";
import { api, date, download, money, scopeExport } from "../api";
import {
  DeliverableControls,
  NewProjectButton,
  ProjectCard,
} from "../components/projects";
import {
  Badge,
  Empty,
  ErrorBox,
  Modal,
  PageHeading,
  Status,
} from "../components/ui";
import { useApp } from "../context";

export function Projects() {
  const { data } = useApp();
  const [q, setQ] = useState(""),
    [archived, setArchived] = useState(false);
  const items = data!.workspace.projects.filter(
    (p) =>
      p.archived === archived &&
      `${p.name} ${p.client}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="PROJECTS"
        title="One place for every promise."
        description="Set a clear baseline. Keep the next change in perspective."
        action={<NewProjectButton />}
      />
      <div className="list-toolbar">
        <div className="tabs">
          <button
            className={!archived ? "active" : ""}
            onClick={() => setArchived(false)}
          >
            Active projects
          </button>
          <button
            className={archived ? "active" : ""}
            onClick={() => setArchived(true)}
          >
            Archived
          </button>
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search projects"
            placeholder="Find a project or client…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      {items.length ? (
        <div className="projects-grid">
          {items.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            q ? "No matching projects" : "Your next great project starts here"
          }
          description={
            q
              ? "Try another client or project name."
              : "Add a few deliverables and an agreed budget to create your first baseline."
          }
          action={!q ? <NewProjectButton /> : null}
        />
      )}
    </>
  );
}

export function ProjectModal({ close }: { close: () => void }) {
  const { refresh } = useApp(),
    nav = useNavigate();
  const [rows, setRows] = useState([
      { title: "", description: "", hours: 8, locked: false },
    ]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const p = await api<Project>("/projects", "POST", {
        name: f.name,
        client: f.client,
        description: f.description,
        currency: f.currency,
        dueDate: f.dueDate,
        budgetCents: Math.round(Number(f.budget) * 100),
        rateCents: Math.round(Number(f.rate) * 100),
        costRateCents: Math.round(Number(f.cost) * 100),
        capacityHoursPerDay: Number(f.capacity),
        deliverables: rows,
      });
      await refresh();
      close();
      nav(`/app/projects/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Start with a clear agreement"
      subtitle="Add the scope you've already agreed with your client."
      close={close}
      wide
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Project name
            <input
              name="name"
              required
              maxLength={100}
              placeholder="The next website launch"
            />
          </label>
          <label>
            Client or company
            <input
              name="client"
              required
              maxLength={100}
              placeholder="Client name"
            />
          </label>
        </div>
        <label>
          Scope and boundaries
          <textarea
            name="description"
            required
            maxLength={3000}
            rows={3}
            placeholder="What's included? What is explicitly excluded? Add revision allowances and any assumptions."
          />
        </label>
        <div className="form-grid thirds">
          <label>
            Agreed project budget
            <input
              name="budget"
              type="number"
              min="1"
              max="10000000"
              step="0.01"
              required
              defaultValue="6000"
            />
          </label>
          <label>
            Currency
            <select name="currency">
              <option>USD</option>
              <option>INR</option>
              <option>GBP</option>
              <option>EUR</option>
            </select>
          </label>
          <label>
            Agreed delivery date
            <input
              name="dueDate"
              type="date"
              required
              defaultValue={new Date(Date.now() + 30 * 864e5)
                .toISOString()
                .slice(0, 10)}
            />
          </label>
        </div>
        <div className="form-grid thirds">
          <label>
            Client rate / hour
            <input
              name="rate"
              type="number"
              min="1"
              max="10000"
              step="0.01"
              required
              defaultValue="100"
            />
          </label>
          <label>
            Internal cost / hour
            <input
              name="cost"
              type="number"
              min="0"
              max="10000"
              step="0.01"
              required
              defaultValue="50"
            />
            <small>Private. Never shared with clients.</small>
          </label>
          <label>
            Delivery hours / day
            <input
              name="capacity"
              type="number"
              min="1"
              max="24"
              step="0.5"
              required
              defaultValue="6"
            />
          </label>
        </div>
        <div className="form-section-heading">
          <h3>Agreed deliverables</h3>
          <span>{rows.length} / 20</span>
        </div>
        <p className="muted small-text">
          Give each item a concrete boundary. Protect essential work from swaps.
        </p>
        {rows.map((row, i) => (
          <div className="deliverable-input" key={i}>
            <div className="deliverable-number">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <div className="form-grid">
                <label>
                  Deliverable
                  <input
                    required
                    maxLength={120}
                    value={row.title}
                    placeholder="e.g. Resource library"
                    onChange={(e) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, title: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Estimated hours
                  <input
                    type="number"
                    min="0.5"
                    max="1000"
                    step="0.5"
                    required
                    value={row.hours}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, j) =>
                          j === i ? { ...r, hours: Number(e.target.value) } : r,
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <label>
                Acceptance criteria
                <input
                  required
                  maxLength={800}
                  value={row.description}
                  placeholder="e.g. A searchable collection of up to 20 articles"
                  onChange={(e) =>
                    setRows(
                      rows.map((r, j) =>
                        j === i ? { ...r, description: e.target.value } : r,
                      ),
                    )
                  }
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={row.locked}
                  onChange={(e) =>
                    setRows(
                      rows.map((r, j) =>
                        j === i ? { ...r, locked: e.target.checked } : r,
                      ),
                    )
                  }
                />
                <Lock size={13} /> Essential work: protect from swaps
              </label>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove deliverable ${i + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn secondary small"
          disabled={rows.length >= 20}
          onClick={() =>
            setRows([
              ...rows,
              { title: "", description: "", hours: 8, locked: false },
            ])
          }
        >
          <Plus size={16} /> Add deliverable
        </button>
        <ErrorBox error={error} />
        <div className="modal-footer">
          <span>
            <ShieldCheck size={15} /> Saved as baseline version 1
          </span>
          <button className="btn primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : null}Create
            project <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ProjectPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, refresh, toast } = useApp();
  const p = data!.workspace.projects.find((p) => p.id === id);
  const [tab, setTab] = useState("scope"),
    [intake, setIntake] = useState(false),
    [version, setVersion] = useState<number | null>(null),
    [deleting, setDeleting] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState("");
  if (!p)
    return (
      <Empty
        title="Project not found"
        description="This project is not part of your workspace."
      />
    );
  const selected = version
    ? p.baselines.find((b) => b.version === version)
    : null;
  const ds = selected?.deliverables || p.deliverables;
  const active = ds.filter((d) => d.status !== "swapped");
  const hours = active.reduce((n, d) => n + d.hours, 0);
  return (
    <>
      <Link className="back-link" to="/app/projects">
        <ArrowLeft size={15} /> All projects
      </Link>
      <PageHeading
        eyebrow={p.client.toUpperCase()}
        title={p.name}
        description={p.description}
        action={
          <button
            className="btn primary"
            disabled={p.archived}
            onClick={() => setIntake(true)}
          >
            <Plus size={17} /> Capture request
          </button>
        }
      />
      <div className="project-summary">
        <div>
          <span>Agreed budget</span>
          <strong>
            {money(selected?.budgetCents ?? p.budgetCents, p.currency)}
          </strong>
        </div>
        <div>
          <span>Planned scope</span>
          <strong>
            {hours} <small>hours</small>
          </strong>
        </div>
        <div>
          <span>Delivery date</span>
          <strong>{date(selected?.dueDate || p.dueDate)}</strong>
        </div>
        <div>
          <span>{selected ? "Agreement displayed" : "Current agreement"}</span>
          <strong>
            Version {selected?.version ?? p.version}{" "}
            <Badge tone="green">Recorded</Badge>
          </strong>
        </div>
      </div>
      <div className="list-toolbar">
        <div className="tabs">
          <button
            className={tab === "scope" ? "active" : ""}
            onClick={() => setTab("scope")}
          >
            Agreed scope <span>{active.length}</span>
          </button>
          <button
            className={tab === "requests" ? "active" : ""}
            onClick={() => setTab("requests")}
          >
            Change requests <span>{p.requests.length}</span>
          </button>
          <button
            className={tab === "history" ? "active" : ""}
            onClick={() => setTab("history")}
          >
            Version history
          </button>
        </div>
        <button
          className="btn ghost small"
          onClick={() => {
            const record = scopeExport(p, selected);
            download(`${p.name}-baseline-v${record.version}.json`, record);
            toast(`Agreement version ${record.version} exported.`);
          }}
        >
          <Download size={15} /> Export scope
        </button>
      </div>
      {tab === "scope" && (
        <>
          <div className="scope-toolbar">
            <p>
              <ShieldCheck size={16} /> Essential and started work stays
              protected.
            </p>
            <label className="inline-label">
              Viewing{" "}
              <select
                value={version || ""}
                onChange={(e) =>
                  setVersion(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Current baseline (v{p.version})</option>
                {p.baselines.map((b) => (
                  <option key={b.version} value={b.version}>
                    Version {b.version}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="scope-table">
            <div className="scope-table-head">
              <span>DELIVERABLE & BOUNDARIES</span>
              <span>EFFORT</span>
              <span>STATUS</span>
            </div>
            {ds.map((d, i) => (
              <div
                className={
                  "scope-row " + (d.status === "swapped" ? "removed" : "")
                }
                key={d.id}
              >
                <div>
                  <span className="scope-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>
                      {d.title} {d.locked && <Lock size={13} />}
                    </h3>
                    <p>{d.description}</p>
                    {d.dependsOn.length > 0 && (
                      <small>
                        Depends on{" "}
                        {d.dependsOn
                          .map(
                            (id) =>
                              ds.find((a) => a.id === id)?.title ||
                              "another deliverable",
                          )
                          .join(", ")}
                      </small>
                    )}
                  </div>
                </div>
                <span>{d.hours} h</span>
                {!selected && !p.archived ? (
                  <DeliverableControls p={p} d={d} />
                ) : (
                  <Status value={d.status} />
                )}
              </div>
            ))}
          </div>
          <div className="scope-bottom">
            <p>
              <Lock size={15} /> Financial details stay private:{" "}
              {money(p.costRateCents, p.currency)}/h internal cost.
            </p>
            <button
              className="text-link"
              onClick={async () => {
                try {
                  await api(`/projects/${p.id}`, "PATCH", {
                    archived: !p.archived,
                  });
                  await refresh();
                  toast(p.archived ? "Project restored." : "Project archived.");
                } catch (e) {
                  toast((e as Error).message);
                }
              }}
            >
              {p.archived ? "Restore project" : "Archive project"}
            </button>
          </div>
          {
            <div className="notice">
              <Trash2 size={18} />
              <div>
                <strong>Finished with this project?</strong>
                <p>
                  Archiving preserves records and still uses a project slot.
                  Export before permanently removing it.
                </p>
              </div>
              <button
                className="btn danger small"
                onClick={() => setDeleting(true)}
              >
                Delete project
              </button>
            </div>
          }
        </>
      )}
      {tab === "requests" && (
        <div className="decision-list">
          {p.requests.length ? (
            p.requests.map((r) => (
              <Link
                className="decision-card"
                key={r.id}
                to={`/app/projects/${p.id}/requests/${r.id}`}
              >
                <div className="decision-icon gold">
                  <ArrowLeftRight size={18} />
                </div>
                <div>
                  <div className="card-topline">
                    <span>Baseline v{r.baselineVersion}</span>
                    <Status value={r.status} />
                  </div>
                  <h3>{r.title}</h3>
                  <p>
                    {r.hours} h estimated · {money(r.feeCents, p.currency)}{" "}
                    add-on option
                  </p>
                </div>
                <ChevronRight size={18} />
              </Link>
            ))
          ) : (
            <Empty
              title="The next change starts with a conversation"
              description="Capture your client's request, then turn it into a clear decision."
              action={
                <button className="btn primary" onClick={() => setIntake(true)}>
                  <Plus size={16} />
                  Capture a request
                </button>
              }
            />
          )}
        </div>
      )}
      {tab === "history" && (
        <div className="version-list">
          {[...p.baselines].reverse().map((b) => (
            <article key={b.version}>
              <div className="version-icon">
                <Layers size={19} />
              </div>
              <div>
                <h3>
                  Version {b.version}{" "}
                  {b.version === p.version && (
                    <Badge tone="green">Current</Badge>
                  )}
                </h3>
                <p>{b.reason}</p>
                <span>
                  {date(b.at)} · {money(b.budgetCents, p.currency)} ·{" "}
                  {b.deliverables
                    .filter((d) => d.status !== "swapped")
                    .reduce((n, d) => n + d.hours, 0)}{" "}
                  hours
                </span>
              </div>
              <button
                className="btn secondary small"
                onClick={() => {
                  setVersion(b.version);
                  setTab("scope");
                }}
              >
                View scope <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
      {intake && <RequestModal p={p} close={() => setIntake(false)} />}
      {deleting && (
        <Modal
          title="Delete this project?"
          subtitle="Its scope, requests, history and client links will be removed permanently."
          close={() => setDeleting(false)}
        >
          <p>
            Export your records first. Your other projects and account will stay
            available.
          </p>
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                const record = await api("/export");
                download("pactshift-workspace.json", record);
              } catch (e) {
                setDeleteError((e as Error).message);
              }
            }}
          >
            <Download size={16} /> Export workspace first
          </button>
          <label>
            Type {p.name} to confirm
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
            />
          </label>
          <ErrorBox error={deleteError} />
          <button
            className="btn danger full"
            disabled={confirmation !== p.name || deleteBusy}
            onClick={async () => {
              setDeleteBusy(true);
              setDeleteError("");
              try {
                await api(`/projects/${p.id}`, "DELETE", { confirmation });
                await refresh();
                nav("/app/projects");
                toast("Project removed. Your project slot is available again.");
              } catch (e) {
                setDeleteError((e as Error).message);
              } finally {
                setDeleteBusy(false);
              }
            }}
          >
            {deleteBusy ? "Removing project..." : "Permanently delete project"}
          </button>
        </Modal>
      )}
    </>
  );
}

export function RequestModal({ p, close }: { p: Project; close: () => void }) {
  const { refresh, data } = useApp(),
    nav = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [title, setTitle] = useState(""),
    [message, setMessage] = useState(""),
    [hours, setHours] = useState(12);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<ChangeRequest>(`/projects/${p.id}/requests`, "POST", {
        title,
        message,
        hours,
      });
      await refresh();
      close();
      nav(`/app/projects/${p.id}/requests/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="What would your client like to change?"
      subtitle={`We'll compare the request with ${p.name}, baseline v${p.version}.`}
      close={close}
    >
      <form onSubmit={submit}>
        <label>
          A short title
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Spanish pages for launch"
          />
        </label>
        <label>
          The client's words
          <textarea
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste the relevant request from an email, message, or meeting…"
          />
        </label>
        <label>
          Your initial estimate (hours)
          <input
            type="number"
            min="0.5"
            max="1000"
            step="0.5"
            required
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
          <small>
            You can refine this before sharing. You control the estimate.
          </small>
        </label>
        {data!.workspace.isDemo && (
          <button
            type="button"
            className="sample-fill"
            onClick={() => {
              setTitle("Spanish pages for launch");
              setMessage(
                "Could we add Spanish versions of the six core website pages before launch? We can supply all the translated copy. Keeping the same budget matters more to us than launching the resource library right now.",
              );
              setHours(12);
            }}
          >
            <Sparkles size={15} /> Fill with a sample client request
          </button>
        )}
        <div className="privacy-inline">
          <ShieldCheck size={17} />
          <p>
            {data!.capabilities.ai === "vertex"
              ? "Only this request and the project scope go to Google Vertex AI for analysis. Remove unrelated sensitive information."
              : "This workspace uses a local rules-based comparison. Your request is not sent to an AI provider."}{" "}
            Suggestions always need your review.
          </p>
        </div>
        <ErrorBox error={error} />
        <button className="btn primary full" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Sparkles size={17} />
          )}{" "}
          {busy ? "Comparing with the agreed scope…" : "Review this request"}
          <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
