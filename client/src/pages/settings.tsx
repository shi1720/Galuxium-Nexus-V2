import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Badge, ErrorBox, Modal, PageHeading } from "../components/ui";
import { useApp } from "../context";

export function Pricing({ landing = false }: { landing?: boolean }) {
  const { data } = useApp();
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      description: "A clear start for your next project.",
      projects: 3,
      analyses: 30,
      features: [
        "3 stored projects",
        "30 analyses / month",
        "Client decision links",
        "Scope history & exports",
      ],
    },
    {
      id: "studio",
      name: "Studio",
      price: 29,
      description: "Room for a growing book of work.",
      projects: 15,
      analyses: 300,
      features: [
        "15 stored projects",
        "300 analyses / month",
        "Client approvals included",
        "Complete scope exchange workflow",
      ],
    },
    {
      id: "agency",
      name: "Agency",
      price: 79,
      description: "More projects, the same clarity.",
      projects: 60,
      analyses: 1500,
      features: [
        "60 stored projects",
        "1,500 analyses / month",
        "Client approvals included",
        "Versioned history & exports",
      ],
    },
  ];
  async function checkout(plan: string) {
    setBusy(plan);
    setError("");
    try {
      const r = await api("/billing/checkout", "POST", { plan });
      window.location.assign(r.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <section
      id="pricing"
      className={landing ? "pricing-section" : "billing-page"}
    >
      {landing ? (
        <div className="pricing-heading">
          <div className="eyebrow">SIMPLE PLANS. NO SHARE OF YOUR FEES.</div>
          <h2>Good agreements earn their keep.</h2>
          <p>Start free. Upgrade when you have more work to keep in sync.</p>
        </div>
      ) : (
        <PageHeading
          eyebrow="PLANS & USAGE"
          title="A little structure. A fair price."
          description="Choose the capacity your studio needs. Client approvals are included within published project limits."
        />
      )}
      {!landing && data && (
        <div className="usage-panel">
          <div>
            <Badge tone="green">
              {data.workspace.plan.toUpperCase()} WORKSPACE
            </Badge>
            <h3>Your workspace this month</h3>
          </div>
          <div>
            <strong>
              {data.workspace.projects.length} /{" "}
              {plans.find((p) => p.id === data.workspace.plan)?.projects}
            </strong>
            <span>stored projects, including archived</span>
          </div>
          <div>
            <strong>
              {data.workspace.usage.analyses} /{" "}
              {plans.find((p) => p.id === data.workspace.plan)?.analyses}
            </strong>
            <span>analyses used</span>
          </div>
          <span>{data.workspace.usage.month}</span>
        </div>
      )}
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={
              "price-card " + (plan.id === "studio" ? "recommended" : "")
            }
          >
            {plan.id === "studio" && (
              <span className="plan-label">FOR INDEPENDENT STUDIOS</span>
            )}
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <div className="plan-price">
              ${plan.price}
              <span>/ month</span>
            </div>
            <span className="price-currency">USD · per workspace</span>
            {landing ? (
              <Link
                className={
                  "btn full " + (plan.id === "studio" ? "primary" : "secondary")
                }
                to="/signup"
              >
                {plan.id === "free"
                  ? "Start for free"
                  : "Start with a free workspace"}
                <ArrowRight size={15} />
              </Link>
            ) : (
              <button
                className={
                  "btn full " + (plan.id === "studio" ? "primary" : "secondary")
                }
                disabled={
                  busy !== "" ||
                  data?.workspace.plan === plan.id ||
                  plan.id === "free" ||
                  !data?.capabilities.billing
                }
                onClick={() => checkout(plan.id)}
              >
                {busy === plan.id ? (
                  <LoaderCircle className="spin" size={16} />
                ) : null}
                {data?.workspace.plan === plan.id
                  ? "Current plan"
                  : !data?.capabilities.billing
                    ? "Paid plans coming soon"
                    : `Choose ${plan.name}`}
              </button>
            )}
            <ul>
              {plan.features.map((f) => (
                <li key={f}>
                  <Check size={16} />
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="pricing-fine">
        <ShieldCheck size={17} />
        <p>
          No transaction fee. No percentage of your change orders.
          <br />
          <span>
            Each project supports 30 requests, 50 baselines, and 100 audit
            events. Workspace storage is capped at 720 KB.
          </span>
          <br />
          <span>
            Paid plans are launch pricing.{" "}
            {data?.capabilities.billing
              ? "Checkout is handled securely by Stripe."
              : "Paid checkout opens after merchant activation. The free workflow is available now."}
          </span>
        </p>
      </div>
      <ErrorBox error={error} />
      {!landing &&
        data?.capabilities.billing &&
        data.workspace.plan !== "free" && (
          <button
            className="btn secondary"
            onClick={async () => {
              try {
                const r = await api("/billing/portal", "POST", {});
                window.location.assign(r.url);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Manage subscription <ExternalLink size={16} />
          </button>
        )}
    </section>
  );
}

export function SettingsPage() {
  const { data, refresh, setData, toast } = useApp(),
    nav = useNavigate();
  const [name, setName] = useState(data!.workspace.name),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false),
    [confirm, setConfirm] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="SETTINGS"
        title="Your workspace, your control."
        description="Manage the essentials, take your records with you, or close your workspace."
      />
      <div className="settings-grid">
        <section className="panel">
          <h2>Workspace details</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/workspace", "PATCH", { name });
                await refresh();
                toast("Workspace name updated.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Workspace name
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Account owner
              <input disabled value={data!.user.name} />
            </label>
            <label>
              Email
              <input disabled value={data!.user.email} />
            </label>
            <ErrorBox error={error} />
            <button className="btn primary" disabled={busy}>
              Save changes <Check size={16} />
            </button>
          </form>
        </section>
        <div>
          <section className="panel">
            <h2>Your data belongs to you</h2>
            <p className="muted">
              Download your projects, version history, and audit records as
              JSON. Private link tokens and account credentials are excluded.
            </p>
            <a className="btn secondary" href="/api/export" download>
              <Download size={16} /> Export workspace
            </a>
          </section>
          <section className="panel">
            <h2>Privacy & processing</h2>
            <dl className="settings-facts">
              <div>
                <dt>Storage</dt>
                <dd>
                  {data!.capabilities.persistence === "firestore"
                    ? "Google Cloud Firestore"
                    : "Local development storage"}
                </dd>
              </div>
              <div>
                <dt>Scope analysis</dt>
                <dd>
                  {data!.capabilities.ai === "vertex"
                    ? "Google Vertex AI"
                    : "Local rules engine"}
                </dd>
              </div>
              <div>
                <dt>Approval authority</dt>
                <dd>Human decision only</dd>
              </div>
              <div>
                <dt>Client access</dt>
                <dd>Private, expiring capability link</dd>
              </div>
            </dl>
            <Link className="text-link" to="/privacy">
              Read privacy notice <ArrowUpRight size={14} />
            </Link>
          </section>
          <section className="panel danger-panel">
            <h2>Close this workspace</h2>
            <p>
              Delete this workspace, its projects, and your account. Export your
              records first. This cannot be undone.
            </p>
            <button className="btn danger" onClick={() => setDeleting(true)}>
              <Trash2 size={16} /> Delete workspace
            </button>
          </section>
        </div>
      </div>
      {deleting && (
        <Modal
          title="Delete your workspace?"
          subtitle="Your account and all project records will be removed."
          close={() => setDeleting(false)}
        >
          <p>
            Type <strong>{data!.workspace.name}</strong> to confirm.
          </p>
          <label>
            Workspace name
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </label>
          <ErrorBox error={error} />
          <button
            className="btn danger full"
            disabled={confirm !== data!.workspace.name || busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api("/workspace", "DELETE", { confirmation: confirm });
                setData(null);
                nav("/");
                toast("Workspace and account deleted.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Permanently delete workspace
          </button>
        </Modal>
      )}
    </>
  );
}
