import { Calendar, ChevronRight, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Deliverable, Project } from "../../../shared/types";
import { api, date, money } from "../api";
import { Badge, Status } from "../components/ui";
import { useApp } from "../context";
import { ProjectModal } from "../pages/projects";

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}>
        <Plus size={17} /> New project
      </button>
      {open && <ProjectModal close={() => setOpen(false)} />}
    </>
  );
}

export function totals(projects: Project[]) {
  const requests = projects.flatMap((p) =>
    p.requests.map((r) => ({ ...r, p })),
  );
  return {
    requests,
    pending: requests.filter(
      (r) => r.status === "draft" || r.status === "shared",
    ),
    accepted: requests.filter((r) => r.status === "accepted"),
    swapped: requests.filter((r) => r.choice === "swap"),
    added: requests.filter((r) => r.choice === "add"),
  };
}

export function ProjectCard({
  p,
  compact = false,
}: {
  p: Project;
  compact?: boolean;
}) {
  const complete = p.deliverables.filter((d) => d.status === "done").length,
    all = p.deliverables.filter((d) => d.status !== "swapped").length;
  return (
    <Link
      to={`/app/projects/${p.id}`}
      className={"project-card " + (compact ? "compact" : "")}
    >
      <span className="project-avatar">{p.client.slice(0, 1)}</span>
      <div className="project-card-body">
        <div className="card-topline">
          <span>{p.client}</span>
          <Badge>v{p.version}</Badge>
        </div>
        <h3>{p.name}</h3>
        {!compact && <p>{p.description}</p>}
        <div className="project-meta">
          <span>{money(p.budgetCents, p.currency)} budget</span>
          <span>
            <Calendar size={13} />
            {date(p.dueDate)}
          </span>
        </div>
        {!compact && (
          <>
            <div className="progress-track">
              <div style={{ width: `${all ? (complete / all) * 100 : 0}%` }} />
            </div>
            <div className="project-progress">
              <span>
                {complete} of {all} deliverables complete
              </span>
              <span>
                {
                  p.requests.filter(
                    (r) => r.status === "draft" || r.status === "shared",
                  ).length
                }{" "}
                open decisions
              </span>
            </div>
          </>
        )}
      </div>
      {compact && <ChevronRight size={17} />}
    </Link>
  );
}

export function DeliverableControls({ p, d }: { p: Project; d: Deliverable }) {
  const { refresh, toast } = useApp();
  const [busy, setBusy] = useState(false);
  async function update(value: unknown) {
    setBusy(true);
    try {
      await api(`/projects/${p.id}/deliverables/${d.id}`, "PATCH", value);
      await refresh();
      toast("Scope updated. Outstanding proposals need review.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (d.status === "swapped") return <Status value={d.status} />;
  return (
    <div className="scope-status-controls">
      <select
        aria-label={`Status of ${d.title}`}
        value={d.status}
        disabled={busy || d.status === "done"}
        onChange={(e) => update({ status: e.target.value })}
      >
        <option value="planned" disabled={d.status !== "planned"}>
          Planned
        </option>
        <option value="in_progress">In progress</option>
        <option value="done">Complete</option>
      </select>
      <button
        aria-label={`${d.locked ? "Unprotect" : "Protect"} ${d.title}`}
        disabled={busy}
        onClick={() => update({ locked: !d.locked })}
      >
        <Lock size={11} />
        {d.locked ? "Protected" : "Allow exchange"}
      </button>
    </div>
  );
}
