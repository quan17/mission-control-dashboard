import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Plus,
  ArrowUpRight,
  Pencil,
  Pause,
  Play,
  Check,
  Target,
  NotebookPen,
  RefreshCw,
  Folder,
  Sparkles,
} from "lucide-react";
import {
  assessmentFor,
  dimensions,
  dimensionNames,
  levels,
  type LearningGoal,
  type LearningState,
  type Dimension,
  type Level,
  type Practice,
} from "./learning-model";
import "./learning.css";
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
const suggestions = [
  {
    track: "React / JavaScript",
    title: "Explain and fix stale closures",
    outcome: "Predict two examples independently and implement a working fix.",
    nextPractice:
      "Write a delayed state update example, predict the output, then test it.",
  },
  {
    track: "System Design",
    title: "Design a real-time frontend",
    outcome:
      "Explain event flow, reconnects and consistency tradeoffs without prompts.",
    nextPractice:
      "Sketch a dashboard event stream and describe recovery after a disconnect.",
  },
  {
    track: "AI / FDE",
    title: "Build an evidence-led AI workflow",
    outcome:
      "Implement a bounded workflow and explain how its outputs are evaluated.",
    nextPractice: "Define an evaluation rubric for one small agent task.",
  },
  {
    track: "Interview practice",
    title: "Tell a clear engineering story",
    outcome:
      "Explain the problem, your decisions and measured outcome in three minutes.",
    nextPractice:
      "Practice one project story aloud and record the weak follow-up questions.",
  },
];
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="learning-dialog"
      aria-labelledby="learning-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="learning-modal-title">{title}</h2>
        <button
          type="button"
          className="secondary"
          onClick={onClose}
          aria-label="Close dialog"
        >
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
function GoalForm({
  goal,
  initial,
  onSave,
  busy,
  error,
  onReload,
}: {
  goal?: LearningGoal;
  initial?: (typeof suggestions)[number];
  onSave: (
    fields: Pick<LearningGoal, "title" | "track" | "outcome" | "nextPractice">,
  ) => Promise<void>;
  busy: boolean;
  error: string;
  onReload: () => void;
}) {
  const [fields, setFields] = useState({
    title: goal?.title ?? initial?.title ?? "",
    track: goal?.track ?? initial?.track ?? "",
    outcome: goal?.outcome ?? initial?.outcome ?? "",
    nextPractice: goal?.nextPractice ?? initial?.nextPractice ?? "",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave({
      title: fields.title.trim(),
      track: fields.track.trim(),
      outcome: fields.outcome.trim(),
      nextPractice: fields.nextPractice.trim(),
    });
  };
  return (
    <form className="learning-form" onSubmit={submit}>
      <p>
        Choose a clear outcome you can demonstrate. All new skill assessments
        start as unknown.
      </p>
      <label>
        Goal title
        <input
          autoFocus
          required
          maxLength={120}
          value={fields.title}
          onChange={(e) => setFields({ ...fields, title: e.target.value })}
          placeholder="What would you like to be able to do?"
        />
      </label>
      <label>
        Learning track
        <input
          required
          maxLength={80}
          list="learning-tracks"
          value={fields.track}
          onChange={(e) => setFields({ ...fields, track: e.target.value })}
          placeholder="e.g. React / JavaScript"
        />
        <datalist id="learning-tracks">
          {suggestions.map((s) => (
            <option value={s.track} key={s.track} />
          ))}
        </datalist>
      </label>
      <label>
        Success criteria
        <textarea
          required
          maxLength={2000}
          value={fields.outcome}
          onChange={(e) => setFields({ ...fields, outcome: e.target.value })}
          placeholder="How will you know you can do it independently?"
        />
      </label>
      <label>
        Next practice <span className="optional">(optional)</span>
        <textarea
          maxLength={2000}
          value={fields.nextPractice}
          onChange={(e) =>
            setFields({ ...fields, nextPractice: e.target.value })
          }
          placeholder="A small, concrete exercise"
        />
      </label>
      {error && (
        <div className="learning-error" role="alert">
          {error}
          <button type="button" onClick={onReload}>
            Reload latest goals
          </button>
        </div>
      )}
      <div className="form-end">
        <span>Saved in your local workspace</span>
        <button className="primary" disabled={busy} type="submit">
          {busy ? "Saving…" : goal ? "Save changes" : "Create goal"}{" "}
          <Check size={15} />
        </button>
      </div>
    </form>
  );
}
function PracticeForm({
  onSave,
  busy,
  error,
  onReload,
}: {
  onSave: (practice: Practice) => Promise<void>;
  busy: boolean;
  error: string;
  onReload: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState("");
  const [assessments, setAssessments] = useState<
    Partial<Record<Dimension, Level>>
  >({});
  return (
    <form
      className="learning-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          id: crypto.randomUUID(),
          occurredAt: new Date().toISOString(),
          summary: summary.trim(),
          evidence: evidence.trim(),
          assessments,
          provenance: "self_reported",
        });
      }}
    >
      <p>
        Record what you actually practiced. Only the dimensions you select will
        change.
      </p>
      <label>
        What did you practice?
        <textarea
          autoFocus
          required
          maxLength={2000}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Describe your independent answer, explanation or code."
        />
      </label>
      <label>
        Evidence / result
        <textarea
          required
          maxLength={4000}
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="A source link, file path, test result, or honest notes on what worked and what needed help."
        />
      </label>
      <fieldset>
        <legend>
          Dimension assessments{" "}
          <span className="optional">(self-reported)</span>
        </legend>
        <div className="assessment-inputs">
          {dimensions.map((d) => (
            <label key={d}>
              {dimensionNames[d]}
              <select
                aria-label={dimensionNames[d]}
                value={assessments[d] ?? ""}
                onChange={(e) => {
                  const next = { ...assessments };
                  if (e.target.value) next[d] = e.target.value as Level;
                  else delete next[d];
                  setAssessments(next);
                }}
              >
                <option value="">Keep current assessment</option>
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level[0].toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="form-help">
          Introduced: encountered it · Developing: can do parts · Strong:
          independent performance. A source you collected is not a practice
          result.
        </p>
      </fieldset>
      {error && (
        <div className="learning-error" role="alert">
          {error}
          <button type="button" onClick={onReload}>
            Reload latest goals
          </button>
        </div>
      )}
      <div className="form-end">
        <span>Timestamped · Self-reported evidence</span>
        <button className="primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save practice note"} <Check size={15} />
        </button>
      </div>
    </form>
  );
}
export function Learning() {
  const [state, setState] = useState<LearningState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"goal" | "practice" | null>(null);
  const [editing, setEditing] = useState(false);
  const [modalGoalId, setModalGoalId] = useState<string | null>(null);
  const [starter, setStarter] = useState<
    (typeof suggestions)[number] | undefined
  >();
  const load = async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/learning-goals", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Unable to load learning goals.");
      }
      const data: LearningState = await response.json();
      if (data.schemaVersion !== 1 || !Array.isArray(data.goals))
        throw new Error(
          "Learning service unavailable. Start the local app with npm run dev.",
        );
      setState(data);
      setError("");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);
  const goals = state?.goals ?? [];
  const visible = goals.filter((g) => filter === "all" || g.status === filter);
  const current = visible.find((g) => g.id === selected) ?? visible[0];
  const modalGoal = goals.find((g) => g.id === modalGoalId);
  const persist = async (next: LearningGoal[], success: string) => {
    if (!state) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/learning-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state, goals: next }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Could not save learning goals.");
      setState(body);
      setMessage(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const saveGoal = async (
    fields: Pick<LearningGoal, "title" | "track" | "outcome" | "nextPractice">,
  ) => {
    if (editing && !modalGoal) {
      setError(
        "This goal is no longer in the saved file. Close the draft and choose a goal again.",
      );
      return;
    }
    const now = new Date().toISOString();
    const goal: LearningGoal =
      editing && modalGoal
        ? { ...modalGoal, ...fields, updatedAt: now }
        : {
            ...fields,
            id: crypto.randomUUID(),
            status: "active",
            createdAt: now,
            updatedAt: now,
            practices: [],
          };
    if (
      await persist(
        editing
          ? goals.map((g) => (g.id === goal.id ? goal : g))
          : [...goals, goal],
        "Goal saved to your workspace.",
      )
    ) {
      setSelected(goal.id);
      setFilter("all");
      setModal(null);
    }
  };
  const status = async (value: LearningGoal["status"]) => {
    if (current)
      await persist(
        goals.map((g) =>
          g.id === current.id
            ? { ...g, status: value, updatedAt: new Date().toISOString() }
            : g,
        ),
        "Goal status saved.",
      );
  };
  const add = () => {
    setEditing(false);
    setStarter(undefined);
    setError("");
    setModal("goal");
  };
  return (
    <div className="learning-page">
      <div className="page-heading learning-page-heading">
        <div>
          <div className="eyebrow">YOUR LEARNING, IN ITS OWN SPACE</div>
          <h1>Turn practice into progress.</h1>
          <p>
            Personal goals, deliberate practice, and evidence of what you can
            do.
          </p>
        </div>
        <button className="primary" onClick={add} disabled={!state || busy}>
          <Plus size={16} /> New learning goal
        </button>
      </div>
      <div className="learning-banner">
        <BookOpen size={18} />
        <span>
          <strong>A separate space to grow.</strong> Learning goals stay
          independent of project delivery. Assessments come from your practice
          notes.
        </span>
        <span className="badge inferred">Manual tracking</span>
      </div>
      {error && !modal && (
        <div className="learning-error" role="alert">
          {error}
          <button onClick={() => void load()}>
            <RefreshCw size={14} /> Reload latest goals
          </button>
        </div>
      )}
      <div className="save-message" role="status" aria-live="polite">
        {message}
      </div>
      {state ? (
        <>
          <section className="learning-metrics" aria-label="Learning summary">
            <div>
              <Target size={19} />
              <span>
                <strong>
                  {goals.filter((g) => g.status === "active").length}
                </strong>{" "}
                Active goals
              </span>
            </div>
            <div>
              <NotebookPen size={19} />
              <span>
                <strong>
                  {goals.reduce((count, g) => count + g.practices.length, 0)}
                </strong>{" "}
                Practice notes <small>Self-reported</small>
              </span>
            </div>
            <div>
              <Check size={19} />
              <span>
                <strong>
                  {goals.filter((g) => g.status === "achieved").length}
                </strong>{" "}
                Goals marked achieved <small>Self-reported</small>
              </span>
            </div>
            <div>
              <Folder size={19} />
              <span>
                <strong>Saved locally</strong>personal-os/
              </span>
            </div>
          </section>
          {goals.length > 0 ? (
            <div className="learning-layout">
              <section className="panel learning-goal-list">
                <div className="section-title">
                  <h2>
                    Your goals <span className="count">{goals.length}</span>
                  </h2>
                  <button
                    aria-label="Add learning goal"
                    onClick={add}
                    disabled={busy}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div
                  className="goal-filters"
                  aria-label="Filter learning goals"
                >
                  {["all", "active", "paused", "achieved"].map((f) => (
                    <button
                      key={f}
                      aria-pressed={filter === f}
                      onClick={() => setFilter(f)}
                    >
                      {f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="learning-goal-items">
                  {visible.map((goal) => (
                    <button
                      className={`learning-goal-item ${current?.id === goal.id ? "current" : ""}`}
                      key={goal.id}
                      aria-pressed={current?.id === goal.id}
                      onClick={() => {
                        setSelected(goal.id);
                        setMessage("");
                      }}
                    >
                      <span className="goal-track">{goal.track}</span>
                      <strong>{goal.title}</strong>
                      <span className="goal-item-bottom">
                        <span>{goal.status}</span>
                        <span>
                          {goal.practices.length} practice{" "}
                          {goal.practices.length === 1 ? "note" : "notes"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {!visible.length && (
                  <p className="filter-empty">
                    No {filter} goals. Choose another filter or create a goal.
                  </p>
                )}
              </section>
              {current ? (
                <section
                  className="learning-detail"
                  aria-label="Selected learning goal"
                >
                  <div className="panel learning-goal-head">
                    <div className="section-title">
                      <span className="small-label">{current.track}</span>
                      <span className="badge self-reported">
                        {current.status} · self-reported
                      </span>
                    </div>
                    <div className="goal-heading">
                      <h2>{current.title}</h2>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => {
                          setEditing(true);
                          setModalGoalId(current.id);
                          setError("");
                          setModal("goal");
                        }}
                      >
                        <Pencil size={14} /> Edit goal
                      </button>
                    </div>
                    <div className="learning-outcome">
                      <span className="small-label">SUCCESS CRITERIA</span>
                      <p>{current.outcome}</p>
                    </div>
                    <div className="learning-next">
                      <span>
                        <span className="small-label">NEXT PRACTICE</span>
                        <p>
                          {current.nextPractice ||
                            "Choose a small exercise with Edit goal."}
                        </p>
                      </span>
                      <ArrowUpRight size={18} />
                    </div>
                    <div className="goal-actions">
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setModal("practice");
                          setModalGoalId(current.id);
                        }}
                      >
                        <NotebookPen size={15} /> Log practice
                      </button>
                      {current.status === "active" ? (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => void status("paused")}
                        >
                          <Pause size={14} /> Pause goal
                        </button>
                      ) : (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => void status("active")}
                        >
                          <Play size={14} /> Reactivate goal
                        </button>
                      )}
                      {current.status !== "achieved" && (
                        <button
                          className="text-link"
                          disabled={busy}
                          onClick={() => void status("achieved")}
                        >
                          <Check size={15} /> Mark achieved
                        </button>
                      )}
                    </div>
                  </div>
                  <section className="panel learning-skills">
                    <div className="section-title">
                      <h2>Evidence by dimension</h2>
                      <span className="badge self-reported">Self-reported</span>
                    </div>
                    <p className="learning-caption">
                      Each dimension stands on its own. Unassessed means
                      unknown.
                    </p>
                    <div className="skill-grid">
                      {dimensions.map((d) => {
                        const value = assessmentFor(current, d);
                        return (
                          <div className="skill-cell" key={d}>
                            <span>{dimensionNames[d]}</span>
                            <strong className={`level level-${value.level}`}>
                              {value.level}
                            </strong>
                            <small>
                              {value.at
                                ? dateLabel(value.at)
                                : "No assessment yet"}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section className="panel practice-history">
                    <div className="section-title">
                      <h2>
                        Practice history{" "}
                        <span className="count">
                          {current.practices.length}
                        </span>
                      </h2>
                      <NotebookPen size={17} />
                    </div>
                    {current.practices.length ? (
                      <ol>
                        {[...current.practices]
                          .sort(
                            (a, b) =>
                              Date.parse(b.occurredAt) -
                              Date.parse(a.occurredAt),
                          )
                          .map((p) => (
                            <li key={p.id}>
                              <div className="practice-time">
                                <time dateTime={p.occurredAt}>
                                  {dateLabel(p.occurredAt)}
                                </time>
                                <span className="badge self-reported">
                                  Self-reported
                                </span>
                              </div>
                              <h3>{p.summary}</h3>
                              <p>{p.evidence}</p>
                              <div className="practice-assessments">
                                {dimensions
                                  .filter((d) => p.assessments[d] !== undefined)
                                  .map((d) => (
                                    <span className="badge unknown" key={d}>
                                      {dimensionNames[d]}: {p.assessments[d]}
                                    </span>
                                  ))}
                                {!Object.keys(p.assessments).length && (
                                  <span className="learning-caption">
                                    Practice recorded · assessments unchanged
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                      </ol>
                    ) : (
                      <div className="practice-empty">
                        <NotebookPen size={25} />
                        <h3>Your first practice note starts here.</h3>
                        <p>
                          Capture an answer, a code result, or a useful weak
                          spot. Your evidence will build a clearer picture over
                          time.
                        </p>
                      </div>
                    )}
                  </section>
                </section>
              ) : (
                <section className="panel">
                  <h2>No goal in this view</h2>
                  <p>Choose another filter to see your goals.</p>
                </section>
              )}
            </div>
          ) : (
            <section className="panel learning-empty">
              <span className="learning-empty-icon">
                <Target size={30} />
              </span>
              <span className="small-label">
                A GOAL IS A DIRECTION, NOT A SCORE
              </span>
              <h2>What do you want to get better at?</h2>
              <p>
                Add a goal, describe what success looks like, and pick the next
                small practice. Your assessments start unknown.
              </p>
              <button className="primary" onClick={add}>
                <Plus size={16} /> Create your first goal
              </button>
            </section>
          )}
          <section className="learning-suggestions">
            <div className="section-title">
              <div>
                <h2>A starting point, if you need one</h2>
                <p>
                  Suggested exercises from the project’s learning tracks. Add
                  only what fits your goals.
                </p>
              </div>
              <Sparkles size={18} />
            </div>
            <div className="learning-suggestion-grid">
              {suggestions.map((s) => (
                <button
                  className="learning-suggestion"
                  key={s.track}
                  disabled={busy}
                  onClick={() => {
                    setStarter(s);
                    setEditing(false);
                    setError("");
                    setModal("goal");
                  }}
                >
                  <span className="badge inferred">Suggested · not added</span>
                  <h3>{s.track}</h3>
                  <p>{s.title}</p>
                  <span className="text-link">
                    Customize goal <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          </section>
          <div className="learning-storage-note">
            <Folder size={14} />
            <span>
              Saved in personal-os/state/learning-goals.json ·{" "}
              {state.updatedAt
                ? `Last saved ${dateLabel(state.updatedAt)} · revision ${state.revision}`
                : "No goals saved yet"}{" "}
              ·{" "}
              <button onClick={() => void load()} disabled={busy}>
                Refresh saved goals
              </button>
            </span>
          </div>
        </>
      ) : (
        !error && (
          <div className="panel" role="status">
            Loading your learning workspace…
          </div>
        )
      )}
      {modal === "goal" && (
        <Modal
          title={editing ? "Edit learning goal" : "New learning goal"}
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <GoalForm
            goal={editing ? modalGoal : undefined}
            initial={starter}
            onSave={saveGoal}
            busy={busy}
            error={error}
            onReload={() => void load()}
          />
        </Modal>
      )}
      {modal === "practice" && (
        <Modal
          title="Log a practice note"
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <PracticeForm
            busy={busy}
            error={error}
            onReload={() => void load()}
            onSave={async (practice) => {
              if (!modalGoal) {
                setError(
                  "This goal is no longer in the saved file. Close the draft and choose a goal again.",
                );
                return;
              }
              if (
                await persist(
                  goals.map((g) =>
                    g.id === modalGoal.id
                      ? {
                          ...g,
                          updatedAt: practice.occurredAt,
                          practices: [...g.practices, practice],
                        }
                      : g,
                  ),
                  "Practice note saved. Only assessed dimensions changed.",
                )
              )
                setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
