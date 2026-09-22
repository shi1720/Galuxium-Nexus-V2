import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCheck,
  Clock,
  Coins,
  Download,
  LoaderCircle,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { PublicOffer } from "../../../shared/types";
import { api, date, download, money } from "../api";
import { Badge, ErrorBox, Logo, Spinner } from "../components/ui";

export function Offer() {
  const { token } = useParams();
  const [offer, setOffer] = useState<PublicOffer | null>(null),
    [error, setError] = useState(""),
    [choice, setChoice] = useState<"add" | "swap" | "defer">("swap"),
    [name, setName] = useState(""),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    api<PublicOffer>(`/offers/${token}`)
      .then((o) => {
        setOffer(o);
        setChoice(o.removed.length ? "swap" : "add");
        setDone(
          o.request.status === "accepted" || o.request.status === "deferred",
        );
      })
      .catch((e) => setError(e.message));
  }, [token]);
  async function decide(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/offers/${token}/decide`, "POST", {
        choice,
        clientName: name,
        acknowledged: ack,
      });
      const o = await api<PublicOffer>(`/offers/${token}`);
      setOffer(o);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!offer)
    return (
      <div className="offer-page">
        <div className="offer-nav">
          <Logo />
          <span>
            <Lock size={14} /> Private decision
          </span>
        </div>
        {error ? (
          <div className="offer-error">
            <AlertCircle size={32} />
            <h1>This decision link is unavailable.</h1>
            <p>{error}</p>
            <p>Ask your studio for a current link.</p>
            <Link className="btn secondary" to="/">
              About Pactshift
            </Link>
          </div>
        ) : (
          <Spinner />
        )}
      </div>
    );
  const o = offer,
    r = o.request;
  const swappedHours = o.removed.reduce((n, d) => n + d.hours, 0);
  const remainingHours = swappedHours - r.hours;
  const currency = o.currency;
  const nextBudget = o.budgetCents + (choice === "add" ? r.feeCents : 0);
  const shiftedDate = (days: number) => {
    const dt = new Date(o.dueDate + "T12:00:00Z");
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  };
  const nextDate = choice === "add" ? shiftedDate(r.scheduleDays) : o.dueDate;
  const agreedBudget = o.budgetCents + (r.choice === "add" ? r.feeCents : 0);
  const agreedDate =
    r.choice === "add" ? shiftedDate(r.scheduleDays) : o.dueDate;
  const isStale = r.baselineVersion !== o.version && !done;
  return (
    <div className="offer-page">
      <nav className="offer-nav">
        <Logo />
        <span>
          <Lock size={14} /> A private decision for {o.client}
        </span>
        <span className="offer-studio">From {o.workspaceName}</span>
      </nav>
      {o.isDemo && (
        <div className="offer-demo">
          Interactive sample · Fictional project and amounts. Decisions update
          your private demo workspace.
        </div>
      )}
      <main className="offer-content">
        {done ? (
          <>
            <div className="offer-success">
              <div className="success-icon">
                <CheckCheck size={38} />
              </div>
              <div className="eyebrow">ON THE SAME PAGE</div>
              <h1>
                {r.choice === "defer"
                  ? "Saved for another chapter."
                  : "A clear next step, agreed."}
              </h1>
              <p>
                {r.choice === "swap"
                  ? "Your new priority is in. The selected work has moved out. Your budget stays the same."
                  : r.choice === "add"
                    ? "The additional work and fee are now part of the project agreement."
                    : "The current project stays as agreed. Your studio can revisit this request with you later."}
              </p>
              <Badge tone="green">
                {r.choice === "defer"
                  ? "Current agreement preserved"
                  : `Agreement version ${r.acceptedVersion || o.version}`}
              </Badge>
            </div>
            <section className="receipt panel">
              <div className="panel-heading">
                <h2>Your decision receipt</h2>
                <ShieldCheck size={21} />
              </div>
              <dl>
                <div>
                  <dt>Project</dt>
                  <dd>{o.projectName}</dd>
                </div>
                <div>
                  <dt>Request</dt>
                  <dd>{r.title}</dd>
                </div>
                <div>
                  <dt>Decision</dt>
                  <dd>
                    {r.choice === "swap"
                      ? "Exchange scope"
                      : r.choice === "add"
                        ? "Add budget"
                        : "Defer for later"}
                  </dd>
                </div>
                <div>
                  <dt>Recorded by</dt>
                  <dd>{r.clientName}</dd>
                </div>
                <div>
                  <dt>Recorded on</dt>
                  <dd>
                    {r.decidedAt
                      ? new Date(r.decidedAt).toLocaleString()
                      : "Recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Additional fee</dt>
                  <dd>
                    {money(r.choice === "add" ? r.feeCents : 0, currency)}
                  </dd>
                </div>
                <div>
                  <dt>Agreed project total</dt>
                  <dd>{money(agreedBudget, currency)}</dd>
                </div>
                <div>
                  <dt>Agreed delivery date</dt>
                  <dd>{date(agreedDate)}</dd>
                </div>
              </dl>
              {r.choice === "swap" && (
                <div className="receipt-change">
                  <span>OUT</span>
                  <p>{o.removed.map((d) => d.title).join(", ")}</p>
                  <span>IN</span>
                  <p>{r.title}</p>
                </div>
              )}
              <p className="fine-print">
                This is a record of a choice made by the holder of this private
                link. It is not identity-verified e-signature or proof of
                payment.
              </p>
              <div className="receipt-actions">
                <button
                  className="btn secondary"
                  onClick={() => window.print()}
                >
                  <Download size={16} /> Print / save PDF
                </button>
                <button
                  className="btn secondary"
                  onClick={() =>
                    download(`pactshift-decision-${r.id}.json`, {
                      project: o.projectName,
                      client: o.client,
                      request: r.title,
                      choice: r.choice,
                      clientName: r.clientName,
                      decidedAt: r.decidedAt,
                      feeCents: r.choice === "add" ? r.feeCents : 0,
                      currency,
                      baselineVersion: r.baselineVersion,
                      acceptedVersion: r.acceptedVersion,
                      previousBudgetCents: o.budgetCents,
                      agreedBudgetCents: agreedBudget,
                      previousDueDate: o.dueDate,
                      agreedDueDate: agreedDate,
                      removed: o.removed.map((d) => ({
                        title: d.title,
                        hours: d.hours,
                      })),
                    })
                  }
                >
                  Download record
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="offer-heading">
              <div className="eyebrow">{o.projectName.toUpperCase()}</div>
              <h1>
                Let’s make room
                <br />
                for your next idea.
              </h1>
              <p>
                A little clarity before we begin. Choose the option that works
                best for you.
              </p>
            </div>
            <section className="client-request">
              <span className="request-caption">YOUR REQUEST</span>
              <h2>{r.title}</h2>
              <p>{r.message}</p>
              {r.note && (
                <div className="studio-note">
                  <span className="avatar">{o.workspaceName[0]}</span>
                  <div>
                    <strong>A note from {o.workspaceName}</strong>
                    <p>{r.note}</p>
                  </div>
                </div>
              )}
            </section>
            {isStale ? (
              <div className="notice warning">
                <AlertCircle size={23} />
                <div>
                  <strong>This proposal needs a fresh look.</strong>
                  <p>
                    The project agreement has changed since this link was
                    created. Please ask your studio for an updated proposal. No
                    decision has been applied.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={decide}>
                <div className="offer-options">
                  <label
                    className={
                      "offer-option " + (choice === "add" ? "chosen" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="choice"
                      value="add"
                      checked={choice === "add"}
                      onChange={() => setChoice("add")}
                    />
                    <div className="offer-option-icon">
                      <Coins />
                    </div>
                    <h3>Add to the project</h3>
                    <p>Keep everything already planned and add the new work.</p>
                    <div className="choice-value">
                      +{money(r.feeCents, currency)}
                      <span>
                        {r.scheduleDays
                          ? `+${r.scheduleDays} calendar ${r.scheduleDays === 1 ? "day" : "days"}`
                          : "Same delivery date"}
                      </span>
                    </div>
                    <div className="choice-details">
                      <Check size={15} />
                      {r.hours} {r.hours === 1 ? "hour" : "hours"} of additional
                      work
                    </div>
                    <div className="choice-details">
                      <Check size={15} />
                      Existing scope stays included
                    </div>
                  </label>
                  {o.removed.length > 0 && (
                    <label
                      className={
                        "offer-option featured " +
                        (choice === "swap" ? "chosen" : "")
                      }
                    >
                      <span className="choice-ribbon">
                        SAME BUDGET, NEW PRIORITY
                      </span>
                      <input
                        type="radio"
                        name="choice"
                        value="swap"
                        checked={choice === "swap"}
                        onChange={() => setChoice("swap")}
                      />
                      <div className="offer-option-icon">
                        <ArrowLeftRight />
                      </div>
                      <h3>Exchange scope</h3>
                      <p>Make room by replacing lower-priority work.</p>
                      <div className="choice-value">
                        No extra fee<span>Same delivery date</span>
                      </div>
                      <div className="exchange-detail">
                        <span>REPLACE</span>
                        <strong>
                          {o.removed.map((d) => d.title).join(", ")}
                        </strong>
                        <span>WITH</span>
                        <strong>{r.title}</strong>
                      </div>
                      <div className="choice-details">
                        <Check size={15} />
                        {remainingHours}{" "}
                        {remainingHours === 1 ? "hour" : "hours"} of capacity{" "}
                        {remainingHours === 1 ? "remains" : "remain"}
                      </div>
                    </label>
                  )}
                  <label
                    className={
                      "offer-option " + (choice === "defer" ? "chosen" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="choice"
                      value="defer"
                      checked={choice === "defer"}
                      onChange={() => setChoice("defer")}
                    />
                    <div className="offer-option-icon">
                      <Clock />
                    </div>
                    <h3>Save for later</h3>
                    <p>
                      Stay with the current plan. Return to this idea in a
                      future phase.
                    </p>
                    <div className="choice-value">
                      No change<span>Current scope & date stay</span>
                    </div>
                    <div className="choice-details">
                      <Check size={15} />
                      No new work added
                    </div>
                    <div className="choice-details">
                      <Check size={15} />
                      Request kept for reference
                    </div>
                  </label>
                </div>
                <div className="offer-impact">
                  <div>
                    <span>PROJECT BUDGET</span>
                    <strong>
                      <span>{money(o.budgetCents, currency)}</span>
                      <ArrowRight size={16} aria-label="changes to" />
                      <span>{money(nextBudget, currency)}</span>
                    </strong>
                  </div>
                  <div>
                    <span>DELIVERY DATE</span>
                    <strong>
                      <span>{date(o.dueDate)}</span>
                      <ArrowRight size={16} aria-label="changes to" />
                      <span>{date(nextDate)}</span>
                    </strong>
                  </div>
                </div>
                <section className="confirmation panel">
                  <div>
                    <div className="eyebrow">YOUR CHOICE, MADE CLEAR</div>
                    <h2>
                      {choice === "swap"
                        ? "New priority. Same budget."
                        : choice === "add"
                          ? "A little more scope, agreed."
                          : "Keep this chapter focused."}
                    </h2>
                    <p>
                      {choice === "swap"
                        ? `${r.title} replaces ${o.removed.map((d) => d.title).join(", ")}. The project budget remains ${money(o.budgetCents, currency)}.`
                        : choice === "add"
                          ? `${money(r.feeCents, currency)} is added to the project budget. ${r.scheduleDays ? `${r.scheduleDays} additional calendar ${r.scheduleDays === 1 ? "day is" : "days are"} agreed.` : "The delivery date stays the same."}`
                          : "The original plan stays unchanged. This request is deferred, with no new fee."}
                    </p>
                    <p className="fine-print">
                      We record your name, choice, and time with the agreement.
                      Your studio gets the same updated plan.
                    </p>
                  </div>
                  <div>
                    <label>
                      Your full name
                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                      />
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        required
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                      />
                      <span>
                        I’m authorized to make this decision and understand the
                        scope, price, and timeline above.
                      </span>
                    </label>
                    <ErrorBox error={error} />
                    <button
                      className="btn primary full"
                      disabled={busy || !ack || name.trim().length < 2}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Check size={18} />
                      )}
                      Confirm{" "}
                      {choice === "swap"
                        ? "scope exchange"
                        : choice === "add"
                          ? "additional scope"
                          : "deferral"}
                    </button>
                  </div>
                </section>
              </form>
            )}
          </>
        )}
        <div className="offer-footer">
          <ShieldCheck size={16} />
          <p>
            A clear record, for both sides.
            <br />
            <span>
              Powered by Pactshift · <Link to="/privacy">Privacy</Link>
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
