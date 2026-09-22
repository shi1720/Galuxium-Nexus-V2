import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ChangeRequest, Deliverable } from "../../../shared/types";
import { api, date, money } from "../api";
import {
  Badge,
  Empty,
  ErrorBox,
  PageHeading,
  Status,
  humanize,
} from "../components/ui";
import { useApp } from "../context";

export function RequestPage() {
  const { id, rid } = useParams();
  const nav = useNavigate();
  const { data, refresh, toast } = useApp();
  const p = data!.workspace.projects.find((p) => p.id === id),
    r = p?.requests.find((r) => r.id === rid);
  const [hours, setHours] = useState(r?.hours || 12),
    [swapIds, setSwapIds] = useState<string[]>(r?.swapIds || []),
    [note, setNote] = useState(r?.note || ""),
    [days, setDays] = useState(r?.scheduleDays || 0),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (r) {
      setHours(r.hours);
      setSwapIds(r.swapIds);
      setNote(r.note);
      setDays(r.scheduleDays);
      setReviewed(false);
    }
  }, [r?.id, r?.status]);
  if (!p || !r)
    return (
      <Empty
        title="Request not found"
        description="Return to your project to find the current requests."
      />
    );
  const editable = r.status === "draft" || r.status === "revoked";
  const selected = p.deliverables.filter((d) => swapIds.includes(d.id));
  const eligible = (d: Deliverable) =>
    d.status === "planned" &&
    !d.locked &&
    !p.deliverables.some(
      (x) => x.status !== "swapped" && x.dependsOn.includes(d.id),
    );
  const unavailableIds = swapIds.filter((id) => {
    const deliverable = p.deliverables.find((d) => d.id === id);
    return !deliverable || !eligible(deliverable);
  });
  const swapHours = selected
    .filter((deliverable) => !editable || eligible(deliverable))
    .reduce((n, d) => n + d.hours, 0);
  const fee = Math.round(hours * p.rateCents);
  const shareUrl = r.shareToken
    ? `${window.location.origin}/offer/${r.shareToken}`
    : "";
  async function save(share = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/projects/${p!.id}/requests/${r!.id}`, "PATCH", {
        hours,
        swapIds,
        note,
        scheduleDays: days,
      });
      if (share)
        await api(`/projects/${p!.id}/requests/${r!.id}/share`, "POST", {});
      await refresh();
      toast(share ? "Client decision link is ready." : "Draft saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to={`/app/projects/${p.id}`}>
        <ArrowLeft size={15} />
        {p.name}
      </Link>
      <PageHeading
        eyebrow="THE DECISION WORKSPACE"
        title={r.title}
        description={`${p.client} · Based on agreement version ${r.baselineVersion}`}
        action={<Status value={r.status} />}
      />
      {r.baselineVersion !== p.version &&
        r.status !== "accepted" &&
        r.status !== "deferred" && (
          <div className="notice warning">
            <AlertCircle size={19} />
            <div>
              <strong>The project has moved on to version {p.version}.</strong>
              <p>
                This proposal is out of date. Revoke a shared link, then review
                and save the draft against the current agreement before sharing
                again.
              </p>
            </div>
          </div>
        )}
      {r.status === "deferred" && (
        <div className="notice">
          <Clock size={21} />
          <div>
            <strong>Saved for a later conversation.</strong>
            <p>
              This decision keeps the original agreement unchanged. When the
              timing is right, create a fresh proposal against today's scope.
            </p>
          </div>
          <button
            className="btn secondary small"
            disabled={busy || p.archived}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const draft = await api<ChangeRequest>(
                  `/projects/${p.id}/requests`,
                  "POST",
                  { title: r.title, message: r.message, hours: r.hours },
                );
                await refresh();
                nav(`/app/projects/${p.id}/requests/${draft.id}`);
                toast(
                  "Fresh draft created. The earlier decision is preserved.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Reviewing current scope..." : "Revisit as new request"}
          </button>
        </div>
      )}
      {r.status === "accepted" && (
        <div className="notice success">
          <CheckCircle2 size={21} />
          <div>
            <strong>
              {r.choice === "swap"
                ? "A new priority. The same budget."
                : "Extra scope, agreed together."}
            </strong>
            <p>
              {r.clientName} chose to{" "}
              {r.choice === "swap" ? "exchange scope" : "add budget"} on{" "}
              {r.decidedAt ? date(r.decidedAt) : "the recorded date"}. Agreement
              v{r.acceptedVersion} is now in the project history.
            </p>
          </div>
          <Link className="btn secondary small" to={`/app/projects/${p.id}`}>
            View updated scope <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="workbench">
        <div className="workbench-main">
          <section className="panel">
            <div className="panel-heading">
              <div className="section-icon">
                <Mail size={19} />
              </div>
              <h2>The request, in their words</h2>
              <span>{date(r.createdAt)}</span>
            </div>
            <blockquote>{r.message}</blockquote>
            <div className="source-caption">
              <span className="avatar small">{p.client[0]}</span> {p.client}{" "}
              <span>·</span> Manually captured request
            </div>
          </section>
          <section className="panel analysis-panel">
            <div className="panel-heading">
              <div className="section-icon green">
                <Sparkles size={19} />
              </div>
              <h2>Against the agreed scope</h2>
              <Badge
                tone={
                  r.analysis.classification === "addition" ? "amber" : "gray"
                }
              >
                {r.analysis.classification === "addition"
                  ? "Likely additional scope"
                  : r.analysis.classification === "included"
                    ? "May be included"
                    : "Needs clarification"}
              </Badge>
            </div>
            <p className="analysis-summary">{r.analysis.summary}</p>
            {r.analysis.evidence.map((e, i) => (
              <div className="evidence" key={i}>
                <div>
                  <FileText size={14} />
                  <strong>
                    {p.deliverables.find((d) => d.id === e.deliverableId)
                      ?.title || "Project scope"}
                  </strong>
                  <Badge>v{r.baselineVersion}</Badge>
                </div>
                <blockquote>“{e.quote}”</blockquote>
                <p>{e.explanation}</p>
              </div>
            ))}
            {r.analysis.assumptions.length > 0 && (
              <details className="assumptions" open>
                <summary>
                  Assumptions to check <ChevronDown size={14} />
                </summary>
                <ul>
                  {r.analysis.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="analysis-footer">
              <ShieldCheck size={14} />
              {r.analysis.engine === "vertex"
                ? `AI-assisted · ${r.analysis.model || "Vertex AI"}`
                : "Rules-based comparison"}
              <span>Advisory. You make the call.</span>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <span className="section-icon">
                <ArrowLeftRight size={19} />
              </span>
              <h2>Make room for the new priority</h2>
            </div>
            <p className="panel-description">
              Choose unfinished work you could exchange. The client keeps the
              same budget and delivery date.
            </p>
            {editable && unavailableIds.length > 0 && (
              <div className="notice warning">
                <AlertCircle size={20} />
                <div>
                  <strong>
                    Some selected work can no longer be exchanged.
                  </strong>
                  <p>
                    Started, protected, removed, or dependent work is
                    unavailable. Remove these selections, then review the
                    remaining choices.
                  </p>
                </div>
                <button
                  className="btn secondary small"
                  disabled={busy}
                  onClick={() => {
                    setSwapIds((ids) =>
                      ids.filter((id) => !unavailableIds.includes(id)),
                    );
                    setReviewed(false);
                  }}
                >
                  Remove unavailable items
                </button>
              </div>
            )}
            <div className="swap-options">
              {p.deliverables
                .filter((d) => d.status !== "swapped")
                .map((d) => {
                  const can = eligible(d);
                  return (
                    <label
                      key={d.id}
                      className={
                        "swap-option " +
                        (swapIds.includes(d.id) ? "selected" : "") +
                        (!can ? " protected" : "")
                      }
                    >
                      <input
                        type="checkbox"
                        disabled={
                          !editable || busy || (!can && !swapIds.includes(d.id))
                        }
                        checked={swapIds.includes(d.id)}
                        onChange={(e) => {
                          setSwapIds(
                            e.target.checked
                              ? [...swapIds, d.id]
                              : swapIds.filter((id) => id !== d.id),
                          );
                          setReviewed(false);
                        }}
                      />
                      <div>
                        <strong>
                          {d.title} {!can && <Lock size={13} />}
                        </strong>
                        <span>
                          {!can
                            ? d.locked
                              ? "Essential work"
                              : d.status !== "planned"
                                ? humanize(d.status)
                                : "Needed by other work"
                            : d.description}
                        </span>
                      </div>
                      <span>{d.hours} h</span>
                    </label>
                  );
                })}
            </div>
            <div
              className={
                "capacity-balance " + (swapHours >= hours ? "balanced" : "")
              }
            >
              <ArrowLeftRight size={16} />
              <span>
                {swapHours} h available to exchange{" "}
                <span className="muted">/ {hours} h new work</span>
              </span>
              {swapHours >= hours ? (
                <strong>
                  <Check size={14} /> {swapHours - hours} h breathing room
                </strong>
              ) : (
                <span>
                  {swapIds.length
                    ? "Select more capacity for a valid swap"
                    : "No swap option selected"}
                </span>
              )}
            </div>
          </section>
        </div>
        <aside className="decision-config">
          <section className="panel sticky-panel">
            <div className="panel-heading">
              <h2>A fair way forward</h2>
              <ArrowUpRight size={18} />
            </div>
            <p className="panel-description">Your estimate. Their choice.</p>
            <label>
              Confirmed effort (hours)
              <input
                type="number"
                min="0.5"
                max="1000"
                step="0.5"
                disabled={!editable || busy}
                value={hours}
                onChange={(e) => {
                  setHours(Number(e.target.value));
                  setReviewed(false);
                }}
              />
            </label>
            <label>
              Extra calendar days if added
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                disabled={!editable || busy}
                value={days}
                onChange={(e) => {
                  setDays(Number(e.target.value));
                  setReviewed(false);
                }}
              />
              <small>A swap keeps the current date.</small>
            </label>
            <div className="outcome-card">
              <div>
                <span className="outcome-icon">
                  <Coins size={16} />
                </span>
                <strong>Add budget</strong>
                <span>{money(fee, p.currency)}</span>
              </div>
              <p>
                {hours} h × {money(p.rateCents, p.currency)}/h ·{" "}
                {days ? `+${days} calendar days` : "Same delivery date"}
              </p>
            </div>
            <div
              className={
                "outcome-card " +
                (swapHours >= hours ? "highlight" : "disabled")
              }
            >
              <div>
                <span className="outcome-icon">
                  <ArrowLeftRight size={16} />
                </span>
                <strong>Exchange scope</strong>
                <span>+{money(0, p.currency)}</span>
              </div>
              <p>
                {swapHours >= hours
                  ? `Replace ${selected.map((d) => d.title).join(", ")}`
                  : "Select enough eligible work to offer a swap."}
              </p>
            </div>
            <div className="outcome-card">
              <div>
                <span className="outcome-icon">
                  <Clock size={16} />
                </span>
                <strong>Decide later</strong>
                <span>Unchanged</span>
              </div>
              <p>Keep the current plan. Revisit this request later.</p>
            </div>
            <label>
              A note for your client
              <textarea
                rows={3}
                disabled={!editable || busy}
                maxLength={1500}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setReviewed(false);
                }}
                placeholder="We can make this work. Here's how each option affects our plan…"
              />
            </label>
            <ErrorBox error={error} />
            {editable ? (
              <>
                <label className="checkbox-row review-check">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    disabled={busy}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  <span>I reviewed the scope, estimate, and choices.</span>
                </label>
                <button
                  className="btn primary full"
                  disabled={
                    busy ||
                    !reviewed ||
                    unavailableIds.length > 0 ||
                    (swapIds.length > 0 && swapHours < hours) ||
                    !hours
                  }
                  onClick={() => save(true)}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Link2 size={16} />
                  )}
                  Create client decision link
                </button>
                <button
                  className="btn ghost full"
                  disabled={busy || unavailableIds.length > 0}
                  onClick={() => save()}
                >
                  Save draft
                </button>
                <p className="fine-print center">
                  You decide when and where to share the link.
                </p>
              </>
            ) : shareUrl ? (
              <>
                <Link
                  className="btn primary full"
                  to={`/offer/${r.shareToken}`}
                  target="_blank"
                >
                  Open client view <ExternalLink size={16} />
                </Link>
                <button
                  className="btn secondary full"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      toast("Private client link copied.");
                    } catch {
                      toast("Copy the link from the client view address bar.");
                    }
                  }}
                >
                  <Copy size={16} />
                  Copy decision link
                </button>
                <p className="fine-print">
                  Anyone with this link can view this proposal and record a
                  decision.{" "}
                  {r.shareExpiresAt ? `Expires ${date(r.shareExpiresAt)}.` : ""}
                </p>
                {r.status === "shared" && (
                  <button
                    className="btn ghost full"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(
                          `/projects/${p.id}/requests/${r.id}/revoke`,
                          "POST",
                          {},
                        );
                        await refresh();
                        toast("Decision link revoked.");
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Revoke this link
                  </button>
                )}
              </>
            ) : null}
          </section>
          <div className="private-note">
            <Lock size={15} />
            <p>
              Internal cost:{" "}
              {money(Math.round(hours * p.costRateCents), p.currency)}
              <br />
              Only visible in your workspace.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
