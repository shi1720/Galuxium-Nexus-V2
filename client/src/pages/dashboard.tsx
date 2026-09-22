import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Coins,
  Download,
  FolderOpen,
  History,
  Leaf,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { date, download, money } from "../api";
import { NewProjectButton, ProjectCard, totals } from "../components/projects";
import {
  Badge,
  Empty,
  PageHeading,
  Stat,
  Status,
  humanize,
} from "../components/ui";
import { useApp } from "../context";

export function Dashboard() {
  const { data } = useApp();
  const projects = data!.workspace.projects.filter((p) => !p.archived);
  const t = totals(projects);
  const currencies = [...new Set(projects.map((p) => p.currency))];
  return (
    <>
      <PageHeading
        eyebrow="THE BIG PICTURE"
        title="Good work starts with clarity."
        description="Your projects, their promises, and a little room for change."
        action={<NewProjectButton />}
      />
      <div className="stats-grid">
        <Stat
          label="Active projects"
          value={String(projects.length)}
          detail="One shared plan for each"
          icon={<FolderOpen />}
        />
        <Stat
          label="Decisions to make"
          value={String(t.pending.length).padStart(2, "0")}
          detail={`${t.pending.filter((r) => r.status === "shared").length} waiting for a client`}
          icon={<ArrowLeftRight />}
          tone="amber"
        />
        <Stat
          label="Approved additions"
          value={
            currencies.length > 1
              ? "Multiple currencies"
              : money(
                  t.added.reduce((n, r) => n + r.feeCents, 0),
                  currencies[0] || "USD",
                )
          }
          detail="Agreed fees, not collected revenue"
          icon={<Coins />}
        />
        <Stat
          label="Scope exchanged"
          value={`${t.swapped.reduce((n, r) => n + r.hours, 0)} h`}
          detail="New priorities within existing budgets"
          icon={<Leaf />}
          tone="green"
        />
      </div>
      <section className="attention-panel">
        <div className="attention-art">
          <ArrowLeftRight size={31} />
          <span className="art-spark">✳</span>
        </div>
        <div>
          <Badge tone="green">A BETTER WAY TO SAY YES</Badge>
          <h2>
            More possibilities.
            <br />
            Fewer surprises.
          </h2>
          <p>Put the trade-off on the table before the work begins.</p>
        </div>
        <Link
          to={projects[0] ? `/app/projects/${projects[0].id}` : "/app/projects"}
          className="btn secondary"
        >
          {projects[0]
            ? "Open your latest project"
            : "Set up your first project"}
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <div className="dashboard-columns">
        <section>
          <div className="section-title">
            <h2>
              On your radar <span>{t.pending.length}</span>
            </h2>
            <Link to="/app/decisions">
              All decisions <ArrowRight size={15} />
            </Link>
          </div>
          {t.pending.length ? (
            <div className="decision-list">
              {t.pending.slice(0, 4).map((r) => (
                <Link
                  className="decision-card"
                  key={r.id}
                  to={`/app/projects/${r.p.id}/requests/${r.id}`}
                >
                  <div
                    className={
                      "decision-icon " +
                      (r.status === "shared" ? "purple" : "gold")
                    }
                  >
                    <ArrowLeftRight size={19} />
                  </div>
                  <div>
                    <div className="card-topline">
                      <span>{r.p.client}</span>
                      <Status value={r.status} />
                    </div>
                    <h3>{r.title}</h3>
                    <p>
                      {r.hours} hours to make room for <span>·</span>{" "}
                      {money(r.feeCents, r.p.currency)} add-on option
                    </p>
                  </div>
                  <ChevronRight size={18} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="A little breathing room"
              description="No open decisions. Capture a client request from a project when the next change comes in."
            />
          )}
          <div className="section-title project-heading">
            <h2>Active projects</h2>
            <Link to="/app/projects">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="compact-projects">
            {projects.slice(0, 3).map((p) => (
              <ProjectCard key={p.id} p={p} compact />
            ))}
          </div>
        </section>
        <section className="recent-panel">
          <div className="section-title">
            <h2>The latest chapter</h2>
            <History size={17} />
          </div>
          <div className="timeline">
            {projects
              .flatMap((p) => p.audit.map((a) => ({ ...a, project: p.name })))
              .sort((a, b) => b.at.localeCompare(a.at))
              .slice(0, 5)
              .map((a) => (
                <div className="timeline-item" key={a.id}>
                  <span className="timeline-dot">
                    <Check size={12} />
                  </span>
                  <div>
                    <strong>{humanize(a.action)}</strong>
                    <p>{a.detail}</p>
                    <span>
                      {a.project} · {date(a.at)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div className="integrity-note">
            <ShieldCheck size={18} />
            <p>
              Every agreement has a history.
              <br />
              <Link to="/app/activity">
                Explore your audit trail <ArrowRight size={13} />
              </Link>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export function DecisionLog() {
  const { data } = useApp();
  const [filter, setFilter] = useState("all");
  const t = totals(data!.workspace.projects);
  const items = t.requests
    .filter(
      (r) =>
        filter === "all" ||
        (filter === "open"
          ? ["draft", "shared"].includes(r.status)
          : r.status === filter),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeading
        eyebrow="DECISION LOG"
        title="Every change has a chapter."
        description="See what was requested, what was agreed, and what can wait."
      />
      <div className="tabs standalone">
        {[
          ["all", "All decisions"],
          ["open", "In progress"],
          ["accepted", "Agreed"],
          ["deferred", "For later"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={filter === v ? "active" : ""}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="decision-list">
        {items.length ? (
          items.map((r) => (
            <Link
              className="decision-card"
              key={r.id}
              to={`/app/projects/${r.p.id}/requests/${r.id}`}
            >
              <div className="decision-icon green">
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <div className="card-topline">
                  <span>
                    {r.p.client} · {r.p.name}
                  </span>
                  <Status value={r.status} />
                </div>
                <h3>{r.title}</h3>
                <p>
                  {r.choice
                    ? `Client chose: ${r.choice === "add" ? "add budget" : r.choice === "swap" ? "exchange scope" : "defer"}`
                    : `${r.hours} h · ${money(r.feeCents, r.p.currency)} add-on option`}{" "}
                  <span>·</span> {date(r.createdAt)}
                </p>
              </div>
              <ChevronRight size={17} />
            </Link>
          ))
        ) : (
          <Empty
            title="No decisions here yet"
            description="Capture a request from a project to start a clear conversation."
          />
        )}
      </div>
    </>
  );
}

export function Activity() {
  const { data, toast } = useApp();
  const [q, setQ] = useState("");
  const events = data!.workspace.projects
    .flatMap((p) =>
      p.audit.map((a) => ({ ...a, project: p.name, projectId: p.id })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((a) =>
      `${a.detail} ${a.project} ${a.action}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  return (
    <>
      <PageHeading
        eyebrow="AUDIT TRAIL"
        title="A record everyone can rely on."
        description="Project changes form a SHA-256 hash chain. Export a copy to independently check its integrity."
        action={
          <button
            className="btn secondary"
            onClick={() => {
              download(
                "pactshift-audit.json",
                data!.workspace.projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  audit: p.audit,
                })),
              );
              toast("Audit record exported.");
            }}
          >
            <Download size={16} />
            Export audit
          </button>
        }
      />
      <div className="notice">
        <ShieldCheck size={23} />
        <div>
          <strong>Accountable decisions, with explicit limits.</strong>
          <p>
            Each event includes its actor, timestamp, and the previous event’s
            hash. This detects changes to exported history; it is not a
            third-party timestamp or identity-verified signature.
          </p>
        </div>
      </div>
      <div className="search-field audit-search">
        <Search size={17} />
        <input
          aria-label="Search audit events"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a project or event…"
        />
      </div>
      <section className="audit-list">
        {events.length ? (
          events.map((a) => (
            <article key={a.id}>
              <div className="audit-event-icon">
                <ShieldCheck size={17} />
              </div>
              <div className="audit-content">
                <div>
                  <h3>{humanize(a.action)}</h3>
                  <span>{new Date(a.at).toLocaleString()}</span>
                </div>
                <p>{a.detail}</p>
                <div className="audit-meta">
                  <Link to={`/app/projects/${a.projectId}`}>{a.project}</Link>
                  <span>Actor: {a.actor}</span>
                </div>
                <details>
                  <summary>View record fingerprint</summary>
                  <code>{a.hash}</code>
                  <small>Previous: {a.previousHash || "Genesis event"}</small>
                </details>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Your record starts with your first project"
            description="Create a project to record a baseline and begin your audit trail."
          />
        )}
      </section>
    </>
  );
}
