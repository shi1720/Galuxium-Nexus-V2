import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock,
  Coins,
  FileText,
  History,
  LoaderCircle,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Badge, ErrorBox, Logo } from "../components/ui";
import { useApp } from "../context";
import { Pricing } from "../pages/settings";

export function Landing() {
  const { data, setData } = useApp(),
    nav = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function demo() {
    setBusy(true);
    try {
      setData(await api("/auth/demo", "POST", {}));
      nav("/app");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="landing">
      <nav className="marketing-nav">
        <Logo />
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <Link to="/privacy">Trust & privacy</Link>
        </div>
        <div className="nav-actions">
          <Link to={data ? "/app" : "/login"}>
            {data ? "Your workspace" : "Log in"}
          </Link>
          <Link className="btn primary small" to="/signup">
            Start for free <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="green-dot" /> A little flexibility. A better
              agreement.
            </div>
            <h1>
              Make room
              <br />
              for <span>“one more thing.”</span>
            </h1>
            <p>
              Keep the client happy. Keep the project healthy.
              <br />
              Turn extra requests into a clear choice: add budget, swap scope,
              or save it for later.
            </p>
            <div className="hero-buttons">
              <button className="btn primary" onClick={demo} disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <ArrowLeftRight size={18} />
                )}{" "}
                Explore the live demo <ArrowRight size={17} />
              </button>
              <Link className="btn secondary" to="/signup">
                Create your workspace
              </Link>
            </div>
            <div className="hero-note">
              <Check size={14} /> No card needed <span>·</span> Private,
              interactive sample workspace
            </div>
            <ErrorBox error={error} />
          </div>
          <div className="hero-visual">
            <div className="floating-message">
              <span className="avatar coral">JM</span>
              <div>
                <strong>
                  Jamie at Forma <span>Just now</span>
                </strong>
                <p>Could we add Spanish pages before launch?</p>
              </div>
            </div>
            <div className="hero-proposal">
              <div className="proposal-top">
                <div className="tiny-logo">
                  <ArrowLeftRight size={18} />
                </div>
                <span>LET’S MAKE IT WORK</span>
                <Badge tone="green">3 clear choices</Badge>
              </div>
              <h3>
                Same partnership.
                <br />A clearer next step.
              </h3>
              <div className="preview-choice">
                <Coins size={20} />
                <div>
                  <strong>Add to the project</strong>
                  <span>More scope, with an agreed fee.</span>
                </div>
                <ArrowUpRight size={18} />
              </div>
              <div className="preview-choice active">
                <ArrowLeftRight size={20} />
                <div>
                  <strong>Swap a lower priority</strong>
                  <span>New priority. Same budget.</span>
                </div>
                <span className="check-circle">
                  <Check size={15} />
                </span>
              </div>
              <div className="preview-choice">
                <Clock size={20} />
                <div>
                  <strong>Save for phase two</strong>
                  <span>Keep this launch on track.</span>
                </div>
                <ArrowUpRight size={18} />
              </div>
              <div className="proposal-bottom">
                <ShieldCheck size={16} /> One decision. One updated plan.
              </div>
            </div>
            <div className="visual-caption">
              An illustrative client decision, powered by real project state.
            </div>
            <div className="orbit-dot one" />
            <div className="orbit-dot two" />
          </div>
        </section>
        <div className="audience-strip">
          <span>BUILT FOR THE WORK BETWEEN THE WORK</span>
          <span>Independent studios</span>
          <span>Web & design agencies</span>
          <span>Fixed-fee projects</span>
        </div>
        <section id="how-it-works" className="how-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">A SMALL CHANGE, HANDLED WELL</div>
              <h2>
                The agreement changes.
                <br />
                Everyone stays on the same page.
              </h2>
            </div>
            <p>
              Good client relationships need flexibility.
              <br />
              Your project plan needs boundaries.
              <br />
              Pactshift gives you both.
            </p>
          </div>
          <div className="steps">
            <article>
              <span className="step-num">01</span>
              <FileText />
              <h3>Start with what you agreed</h3>
              <p>
                Capture the deliverables, hours, and budget. Keep essential or
                already-started work protected.
              </p>
            </article>
            <article>
              <span className="step-num">02</span>
              <ArrowLeftRight />
              <h3>Make the trade-off visible</h3>
              <p>
                Review a client request against the scope. Confirm your estimate
                and choose what could make room.
              </p>
            </article>
            <article>
              <span className="step-num">03</span>
              <CheckCheck />
              <h3>Agree once. Update together.</h3>
              <p>
                A private link gives your client a clear choice. Their decision
                creates a new project baseline and a traceable receipt.
              </p>
            </article>
          </div>
        </section>
        <section className="manifesto">
          <div className="eyebrow">THE PROJECT BEHIND THE PROMISE</div>
          <h2>
            “The problem isn’t that clients change their minds.
            <br />
            It’s that everyone keeps working from a different agreement.”
          </h2>
          <p>Made for the next conversation, by Shivam Gupta.</p>
          <div className="trust-row">
            <span>
              <Lock size={17} /> Private workspaces
            </span>
            <span>
              <History size={17} /> Versioned agreements
            </span>
            <span>
              <ShieldCheck size={17} /> Human-reviewed decisions
            </span>
          </div>
        </section>
        <Pricing landing />
        <section className="closing">
          <h2>
            A better way to say
            <br />
            “Yes, we can work with that.”
          </h2>
          <button className="btn primary" disabled={busy} onClick={demo}>
            Try a scope exchange <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <footer>
        <Logo />
        <span>Built by Shivam Gupta · Galuxium Nexus V2</span>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a
            href="https://github.com/shi1720/Galuxium-Nexus-V2"
            target="_blank"
            rel="noreferrer"
          >
            Source <ArrowUpRight size={13} />
          </a>
        </div>
      </footer>
    </div>
  );
}

export function Policy({ terms = false }: { terms?: boolean }) {
  return (
    <div className="policy-page">
      <nav>
        <Logo />
        <Link className="btn secondary small" to="/">
          Back to home <ArrowLeft size={15} />
        </Link>
      </nav>
      <article>
        <div className="eyebrow">CLEAR FROM THE START</div>
        <h1>{terms ? "Terms of use" : "Your work deserves privacy."}</h1>
        <p className="policy-date">
          Effective 22 September 2026 · Pactshift by Shivam Gupta
        </p>
        {terms ? (
          <>
            <h2>Using Pactshift</h2>
            <p>
              Pactshift helps you record scope decisions. You remain responsible
              for the accuracy of scope, estimates, fees, authority to approve,
              and any agreement with your client. Client links record the
              decision of the person holding the link, not a verified legal
              identity. The service does not process client project payments.
            </p>
            <h2>Your workspace and content</h2>
            <p>
              Use your own account details, protect your password and recovery
              code, and only upload information you have permission to use. You
              retain ownership of your content. Do not use the service for
              unlawful activity, to compromise other accounts, or to submit
              sensitive data unrelated to a project.
            </p>
            <h2>Human review</h2>
            <p>
              Automated suggestions may be inaccurate. Review them before
              sharing a proposal. An automated analysis never approves scope,
              guarantees an estimate, or makes a legal determination. Export
              important records and keep independent backups.
            </p>
            <h2>Pricing and availability</h2>
            <p>
              The free plan includes the limits shown on the pricing page. Paid
              plans require an active merchant checkout and show terms before
              purchase. No client project amount displayed in Pactshift
              represents a payment collected. This is an early release offered
              as available, without a guaranteed service-level agreement.
              Liability is limited to the extent permitted by applicable law.
            </p>
            <h2>Closing your account</h2>
            <p>
              You can export records and delete your workspace from Settings. An
              owner deletion removes the workspace for all its private client
              links. Misuse may result in access suspension. Mandatory consumer
              rights remain unaffected.
            </p>
          </>
        ) : (
          <>
            <h2>What we store</h2>
            <p>
              We store your account name, email, a password hash, a hashed
              recovery code, session records, and the project data you enter.
              Project records include deliverables, request text, estimates,
              client decision names, timestamps, and version history. We do not
              store payment card details.
            </p>
            <h2>How processing works</h2>
            <p>
              The hosted service uses Google Cloud Run and Firestore. When AI
              analysis is enabled, the relevant scope and client request are
              sent to Google Vertex AI. Rules-based analysis runs within the
              application. The interface identifies which engine produced each
              analysis. No third-party AI decides what your client agrees to.
            </p>
            <h2>What clients can see</h2>
            <p>
              A client decision link exposes that proposal, its project and
              studio names, agreed price, delivery impact, and any deliverables
              offered for exchange. Internal cost rates, other projects, account
              email addresses, and the workspace audit trail are excluded.
              Anyone with the private link can view and act on it until it
              expires or is revoked. Share it only with the intended client.
            </p>
            <h2>Cookies and technical logs</h2>
            <p>
              We use a necessary, HttpOnly session cookie for account access. We
              do not use advertising trackers. Rate-limit records use hashed
              network identifiers. Hosting providers may retain operational
              request logs, including IP addresses and request paths. Private
              link access is sensitive, so avoid forwarding these URLs to
              unrelated parties.
            </p>
            <h2>Retention and your control</h2>
            <p>
              Your records remain until you delete the workspace. You can export
              them from Settings. Deletion removes active account and project
              records and invalidates access, while provider logs and backups
              may age out under the provider's retention policy. Demo workspaces
              contain fictional data; do not use them for confidential work.
              Save the recovery code shown at signup to regain account access.
            </p>
            <h2>Contact and changes</h2>
            <p>
              Pactshift is an independent project by Shivam Gupta. For privacy
              requests, contact the maintainer through the{" "}
              <a
                href="https://github.com/shi1720/Galuxium-Nexus-V2"
                target="_blank"
                rel="noreferrer"
              >
                project repository
              </a>
              . Do not post private project information or credentials in a
              public issue. We will update this notice when processing
              materially changes.
            </p>
          </>
        )}
      </article>
      <footer>
        <span>© 2026 Pactshift · Shivam Gupta</span>
        <Link to={terms ? "/privacy" : "/terms"}>
          {terms ? "Privacy notice" : "Terms of use"}
        </Link>
      </footer>
    </div>
  );
}
