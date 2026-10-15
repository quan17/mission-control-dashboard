import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  BriefcaseBusiness,
  BookOpen,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  Layers3,
  Radio,
  Inbox,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Command,
  Folder,
  CircleHelp,
  Check,
  Copy,
  FlaskConical,
  ChevronRight,
  PanelLeftClose,
} from "lucide-react";
import { projects, type Project } from "./data";
import "./styles.css";
import { Learning } from "./Learning";
import { Board } from "./Board";
type Page =
  | "overview"
  | "agents"
  | "inbox"
  | "workspaces"
  | "resources"
  | "learning"
  | "today"
  | "career";
function Badge({
  kind,
  children,
}: {
  kind: "Observed" | "Unknown" | "Demo" | "Inferred";
  children?: React.ReactNode;
}) {
  return (
    <span className={`badge ${kind.toLowerCase()}`}>{children || kind}</span>
  );
}
function App() {
  const [hash, setHash] = useState(location.hash || "#today");
  const [query, setQuery] = useState("");
  const demo = true;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const update = () => {
      setHash(location.hash || "#today");
      setCopied(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      document
        .querySelector(
          'nav[aria-label="Main navigation"] [aria-current="page"]',
        )
        ?.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [hash]);
  const project = projects.find((p) => hash === `#project/${p.id}`);
  const requestedPage = hash.slice(1);
  const page: Page = [
    "today",
    "career",
    "overview",
    "agents",
    "inbox",
    "workspaces",
    "resources",
    "learning",
  ].includes(requestedPage)
    ? (requestedPage as Page)
    : project
      ? "overview"
      : "today";
  const nav = [
    { id: "today", name: "每日看板", icon: CalendarDays },
    { id: "overview", name: "Command Center", icon: LayoutDashboard },
    { id: "agents", name: "Active Agents", icon: Radio },
    { id: "inbox", name: "Needs Me", icon: Inbox },
    { id: "workspaces", name: "Project Workspaces", icon: Layers3 },
    { id: "learning", name: "Learning Goals", icon: BookOpen },
    { id: "career", name: "求职跟进", icon: BriefcaseBusiness },
    { id: "resources", name: "Resources & sources", icon: SlidersHorizontal },
  ];
  const filtered = projects.filter((p) =>
    `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const copy = async (p: Project) => {
    try {
      await navigator.clipboard.writeText(p.path);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const heading = (eyebrow: string, title: string, sub: string) => (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <span className="local-label">
        <span /> Local workspace
      </span>
    </div>
  );
  const resources = (
    <section className="resource-strip" aria-label="Resources">
      <div>
        <ShieldCheck size={18} />
        <span>
          Project execution<strong>Read-only</strong>
        </span>
      </div>
      <div>
        <Radio size={18} />
        <span>
          Runtime connection
          <strong>
            Not connected <Badge kind="Unknown" />
          </strong>
        </span>
      </div>
      <div>
        <Layers3 size={18} />
        <span>
          Project inventory
          <strong>
            {projects.length} examples <Badge kind="Demo" />
          </strong>
        </span>
      </div>
      <div>
        <CircleHelp size={18} />
        <span>
          Account & quota<strong>Unknown · no adapter</strong>
        </span>
      </div>
    </section>
  );
  const active = (
    <section className="panel active-panel">
      <div className="section-title">
        <h2>
          <Radio size={18} /> Active Agents
        </h2>
        <Badge kind="Unknown" />
      </div>
      <div className="empty-orbit">
        <Radio size={26} />
      </div>
      <h3>Activity needs evidence.</h3>
      <p>
        No runtime adapter is connected. Running sessions and available slots
        are unknown.
      </p>
      <div className="quiet-box">Defined roles are not running workers.</div>
      <a className="text-link" href="#agents">
        Inspect agent visibility <ArrowRight size={15} />
      </a>
    </section>
  );
  const inbox = (
    <section className="panel needs-panel">
      <div className="section-title">
        <h2>
          <Inbox size={18} /> Needs Me
        </h2>
        <Badge kind={demo ? "Demo" : "Unknown"} />
      </div>
      {demo ? (
        <>
          <div className="attention">
            <span className="small-label">DEMO REVIEW · SAMPLE EDITOR</span>
            <h3>Review a synthetic prototype</h3>
            <p>Example only. This is not an actual pending request.</p>
            <a href="#project/sample-editor" className="text-link">
              Inspect project context <ArrowUpRight size={15} />
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="empty-orbit warm">
            <Inbox size={26} />
          </div>
          <h3>A single place for decisions.</h3>
          <p>
            Native review requests have not been imported. An empty queue does
            not mean nothing needs you.
          </p>
          <div className="quiet-box">
            Decision ingestion begins after MC-001.
          </div>
        </>
      )}
      <div className="panel-footer">
        No approvals or external actions enabled <ShieldCheck size={14} />
      </div>
    </section>
  );
  const fleet = (
    <section className="fleet">
      <div className="section-title">
        <div>
          <h2>
            Project Workspaces <span className="count">{projects.length}</span>
          </h2>
          <p>One portfolio. Each project keeps its own team.</p>
        </div>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search projects"
            placeholder="Find a project…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="project-grid">
        {filtered.map((p) => (
          <a className="project-card" href={`#project/${p.id}`} key={p.id}>
            <div className="card-top">
              <span className={`monogram ${p.color}`}>{p.short}</span>
              <Badge kind="Demo">Example workspace</Badge>
              <ArrowUpRight size={17} />
            </div>
            <h3>{p.name}</h3>
            <p>{p.category}</p>
            <div className="card-status">
              <span className="status-dot" />
              Runtime unknown
              <span>
                Open workspace <ArrowRight size={14} />
              </span>
            </div>
          </a>
        ))}
      </div>
      {!filtered.length && (
        <div className="panel no-results">
          No projects match “{query}”.{" "}
          <button onClick={() => setQuery("")}>Clear search</button>
        </div>
      )}
      <div className="source-note">
        <Folder size={14} /> Fictional example workspaces included with this
        public template. No runtime connection or automatic refresh.
      </div>
    </section>
  );
  return (
    <>
      <a
        href="#main"
        className="skip"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#today">
          <span className="brand-symbol">
            <Command size={22} />
          </span>
          <span>
            MISSION<span>CONTROL</span>
          </span>
          <span className="version">V1</span>
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              aria-current={!project && page === n.id ? "page" : undefined}
              className={!project && page === n.id ? "selected" : ""}
            >
              <n.icon size={18} />
              {n.name}
              {n.id === "overview" && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-projects">
          <div className="workspace-label">
            DEMO WORKSPACES <span>{projects.length}</span>
          </div>
          {projects.map((p) => (
            <a
              href={`#project/${p.id}`}
              key={p.id}
              aria-current={project?.id === p.id ? "page" : undefined}
              className={project?.id === p.id ? "selected" : ""}
            >
              <span className={`tiny-dot ${p.color}`} />
              {p.name}
            </a>
          ))}
        </div>
        <div className="sidebar-bottom">
          <ShieldCheck size={18} />
          <div>
            Private by design<small>Local · manual · evidence-led</small>
          </div>
          <PanelLeftClose size={16} />
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} />{" "}
            <strong>
              {project?.name ||
                nav.find((n) => n.id === page)?.name ||
                "Command Center"}
            </strong>
          </span>
          <span className="top-note">
            Local workspace <span> / </span> Projects & learning
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {page === "today" || page === "career" ? (
            <Board key={page} initialView={page} />
          ) : page === "learning" ? (
            <Learning />
          ) : project ? (
            <>
              {heading("PROJECT WORKSPACE", project.name, project.category)}
              <a href="#workspaces" className="text-link back">
                <ArrowLeft size={16} /> All workspaces
              </a>
              <div className="detail-grid">
                <section className="panel detail-main">
                  <div className="section-title">
                    <h2>Goal & ownership</h2>
                    <Badge kind="Demo">Example</Badge>
                  </div>
                  <h2 className="goal">{project.goal}</h2>
                  <p>
                    Fictional example context. No native task acceptance or
                    runtime state has been imported.
                  </p>
                  <div className="detail-block">
                    <span className="small-label">DECLARED PROJECT TEAM</span>
                    <h3>{project.team}</h3>
                    <p>Role definitions only. Running workers: unknown.</p>
                  </div>
                  <div className="detail-block">
                    <span className="small-label">PROJECT BOUNDARY</span>
                    <p>{project.guardrail}</p>
                  </div>
                  <div className="detail-block">
                    <span className="small-label">
                      SUGGESTED NEXT STEP <Badge kind="Inferred" />
                    </span>
                    <p>
                      {project.id === "mission-control"
                        ? "Inspect the MC-001 UI and its verification checkpoint."
                        : "After MC-001, connect the native source through a read-only adapter."}
                    </p>
                  </div>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <h2>Evidence & freshness</h2>
                    <Badge kind="Demo" />
                  </div>
                  <p>
                    This example directory is packaged with the public template.
                    It is not an observed personal project.
                  </p>
                  <label className="small-label">WORKSPACE PATH</label>
                  <code>{project.path}</code>
                  <button
                    className="secondary"
                    onClick={() => void copy(project)}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
                    {copied ? "Path copied" : "Copy workspace path"}
                  </button>
                  <label className="small-label source-label">
                    EXAMPLE SOURCE REFERENCE
                  </label>
                  <code>
                    {project.path}/{project.source}
                  </code>
                  <p className="muted">
                    Sample path only; file content is not served to the browser.
                  </p>
                  <div className="quiet-box">
                    Milestone, blockers, current session and latest checkpoint:{" "}
                    <strong>Unknown</strong>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              {heading(
                "YOUR PORTFOLIO, IN VIEW",
                page === "overview"
                  ? "Make the next move count."
                  : nav.find((n) => n.id === page)?.name || "Command Center",
                page === "overview"
                  ? "Less context switching. More progress you can verify."
                  : "Clear ownership, bounded work, and source-backed decisions.",
              )}
              <div className="evidence-banner demo-on">
                <div>
                  <FlaskConical size={18} />
                  <span>
                    <strong>Public demo template</strong> Project cards and
                    decisions are fictional examples. Nothing is dispatched.
                  </span>
                </div>
                <Badge kind="Demo">Example data</Badge>
              </div>
              {page === "overview" ? (
                <>
                  <div className="command-grid">
                    <section className="panel focus-panel">
                      <div className="section-title">
                        <h2>
                          <span className="focus-icon">◎</span> Focus Now
                        </h2>
                        <span className="focus-count">1 priority</span>
                      </div>
                      <div className="focus-content">
                        <span className="small-label">
                          MISSION CONTROL{" "}
                          <Badge kind="Demo">Example focus</Badge>
                        </span>
                        <h2>
                          Build the place
                          <br />
                          where work comes together.
                        </h2>
                        <p>
                          MC-001 · A usable, polished portfolio UI is the first
                          milestone.
                        </p>
                        <div className="focus-meta">
                          <span>
                            OWNER<strong>Portfolio Orchestrator</strong>
                          </span>
                          <span>
                            SCOPE<strong>One frontend slice</strong>
                          </span>
                        </div>
                        <div className="done-when">
                          <Check size={16} />
                          <span>
                            Done when the UI renders, keyboard navigation works,
                            checks pass, and a checkpoint is recorded.
                          </span>
                        </div>
                        <a className="primary" href="#project/mission-control">
                          Inspect mission <ArrowUpRight size={16} />
                        </a>
                      </div>
                      <div className="focus-bottom">
                        WHY THIS FIRST{" "}
                        <span>A shared view before integrations.</span>
                      </div>
                    </section>
                    {active}
                    {inbox}
                  </div>
                  {resources}
                  {fleet}
                </>
              ) : page === "workspaces" ? (
                fleet
              ) : page === "agents" ? (
                <div className="detail-grid">
                  {active}
                  <section className="panel">
                    <h2>Every agent needs a bounded mission.</h2>
                    <p>
                      These are declared dashboard roles, not live execution.
                    </p>
                    {[
                      [
                        "Portfolio Orchestrator",
                        "Integrate MC-001, verify acceptance, record the checkpoint.",
                      ],
                      [
                        "Observer",
                        "Verify selected directory names and source existence; read-only.",
                      ],
                      [
                        "Delivery Reviewer",
                        "Independently inspect MC-001 code and evidence; read-only.",
                      ],
                    ].map(([name, goal]) => (
                      <div className="detail-block" key={name}>
                        <h3>
                          {name} <Badge kind="Demo">Example role</Badge>
                        </h3>
                        <p>{goal}</p>
                      </div>
                    ))}
                    <div className="quiet-box">
                      Native project teams and worker limits remain
                      authoritative.
                    </div>
                  </section>
                </div>
              ) : page === "inbox" ? (
                <div className="narrow">{inbox}</div>
              ) : (
                <>
                  {resources}
                  <section className="panel source-panel">
                    <h2>Understand what you’re seeing</h2>
                    {[
                      [
                        "Observed",
                        "Reserved for verified source inventory. This public demo has no connected source inventory.",
                      ],
                      [
                        "Unknown",
                        "No verified adapter or runtime evidence. Unknown never means zero.",
                      ],
                      [
                        "Inferred",
                        "A suggested next step based on the current scope.",
                      ],
                      [
                        "Demo",
                        "Illustrative UI content. Never an actual request, run or approval.",
                      ],
                    ].map(([kind, description]) => (
                      <div className="legend-row" key={kind}>
                        <Badge
                          kind={
                            kind as "Observed" | "Unknown" | "Inferred" | "Demo"
                          }
                        />
                        <p>{description}</p>
                      </div>
                    ))}
                    <p>
                      These are fictional example workspaces. No private project
                      inventory or runtime adapter is included.
                    </p>
                  </section>
                </>
              )}
            </>
          )}
          <footer>
            <span>
              <ShieldCheck size={13} /> Example projects. Their teams. One clear
              view.
            </span>
            <span>Local workspace · Projects & learning</span>
          </footer>
        </main>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
