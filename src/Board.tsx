import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Folder,
  Layers3,
  Link2,
  ListChecks,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Target,
  X,
} from "lucide-react";
import {
  areaNames,
  todayNY,
  type Area,
  type BoardTask,
  type BoardPayload,
  type BoardState,
  type DailyPlan,
} from "./board-model";
import "./board.css";
const when = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const labels = {
  confirmed_intent: "已确认意图",
  source_record: "原生记录",
  inferred: "建议",
  manual: "手动录入",
};
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
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
      className="board-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="board-dialog-title"
    >
      <div className="board-dialog-head">
        <h2 id="board-dialog-title">{title}</h2>
        <button className="secondary" aria-label="关闭窗口" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Board({
  initialView = "today",
}: {
  initialView?: "today" | "career";
}) {
  const [payload, setPayload] = useState<BoardPayload | null>(null);
  const [day, setDay] = useState(todayNY());
  const [view, setView] = useState<string>(initialView);
  const [area, setArea] = useState<Area | "all">("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState<BoardTask | null>(null);
  const [note, setNote] = useState("");
  const [manual, setManual] = useState(false);
  const [fields, setFields] = useState({
    title: "",
    area: "learning" as Area,
    workspace: "个人",
    doneWhen: "",
  });
  const [connection, setConnection] = useState<{
    urls: string[];
    ready: boolean;
    phoneVerified: boolean;
    firewallStatus: "admin_required" | "configured" | "unknown";
  } | null>(null);
  const [code, setCode] = useState("");
  const load = async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/board", { cache: "no-store", signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPayload(body);
      setError("");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    }
  };
  const connect = async () => {
    try {
      const response = await fetch("/api/connection");
      if (response.ok) setConnection(await response.json());
    } catch {
      setConnection(null);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    void connect();
    return () => controller.abort();
  }, []);
  const tasks = payload
    ? [...payload.evidence.tasks, ...payload.state.customTasks]
    : [];
  const plans = payload?.state.plans.filter((p) => p.day === day) ?? [];
  const planFor = (id: string) => plans.find((p) => p.taskId === id);
  const done = plans.filter((p) => p.status === "done").length;
  const todayTasks = tasks.filter((t) =>
    plans.some((p) => p.taskId === t.id && p.status !== "deferred"),
  );
  const activeFocus = todayTasks.filter(
    (t) => !["deferred", "done"].includes(planFor(t.id)?.status ?? ""),
  );
  const suggestionsMode = activeFocus.length === 0;
  const focusTasks = (
    suggestionsMode
      ? tasks.filter((t) => t.area === "learning" && !planFor(t.id))
      : activeFocus
  ).slice(0, 3);
  const stale =
    payload?.evidence.sources.filter(
      (s) => s.freshness === "changed" || s.freshness === "missing",
    ) ?? [];
  const save = async (state: BoardState, message: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/board-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "保存失败。");
      setPayload((previous) =>
        previous ? { ...previous, state: body } : previous,
      );
      setNotice(body.exportWarning || message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const change = async (
    task: BoardTask,
    status: DailyPlan["status"],
    completionNote?: string,
  ) => {
    if (!payload) return false;
    const id = `${task.id}:${day}`;
    const record: DailyPlan = {
      id,
      taskId: task.id,
      day,
      status,
      completionNote: completionNote ?? planFor(task.id)?.completionNote ?? "",
      updatedAt: new Date().toISOString(),
    };
    return save(
      {
        ...payload.state,
        plans: [...payload.state.plans.filter((p) => p.id !== id), record],
      },
      status === "done"
        ? "结果已记录为个人自述，项目原生状态没有改变。"
        : "已保存到所选日期的个人计划。",
    );
  };
  const shift = (offset: number) => {
    const value = new Date(day + "T12:00:00Z");
    value.setUTCDate(value.getUTCDate() + offset);
    setDay(value.toISOString().slice(0, 10));
  };
  const exportContext = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setNotice("ChatGPT 本地快照已更新。Page 仍保留其标示时间的快照。");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const taskCard = (task: BoardTask) => {
    const plan = planFor(task.id);
    const sources =
      payload?.evidence.sources.filter((s) => task.sourceIds.includes(s.id)) ??
      [];
    const sourceChanged = sources.some(
      (s) => s.freshness === "changed" || s.freshness === "missing",
    );
    return (
      <article
        className={`board-task ${plan?.status === "done" ? "task-complete" : ""}`}
        key={task.id}
        data-task-id={task.id}
      >
        <div className="task-kicker">
          <span className={`area-tag area-${task.area}`}>
            {areaNames[task.area]}
          </span>
          <span>{task.workspace}</span>
          <span
            className={`badge ${task.confidence === "inferred" ? "inferred" : "observed"}`}
          >
            {labels[task.confidence]}
          </span>
        </div>
        <h3>{task.title}</h3>
        <p>{task.description}</p>
        {sourceChanged && (
          <p className="source-changed">
            来源文件已有变化或不可读；摘要需复核。
          </p>
        )}
        <details className="task-evidence">
          <summary>
            完成标准与来源 <ChevronRight size={13} />
          </summary>
          <div>
            <span className="small-label">DONE WHEN</span>
            <p>{task.doneWhen}</p>
            <ul>
              {sources.map((source) => (
                <li key={source.id}>
                  {source.ref.startsWith("https://") ? (
                    <a href={source.ref} target="_blank" rel="noreferrer">
                      {source.title}
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span>{source.title}</span>
                  )}
                  <small>
                    来源更新 {when(source.updatedAt)} · 读取{" "}
                    {when(source.observedAt)}
                  </small>
                  <code>{source.ref}</code>
                </li>
              ))}
            </ul>
            {!sources.length && <p>来源：用户在本地手动录入。</p>}
          </div>
        </details>
        {plan?.completionNote && (
          <div className="task-result">
            <Check size={14} />
            <span>
              <strong>
                {plan.status === "done" ? "已记录结果" : "此前记录"}
              </strong>
              {plan.completionNote}
            </span>
          </div>
        )}
        <div className="task-actions">
          {!plan || plan.status === "deferred" ? (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void change(task, "planned")}
            >
              <Plus size={14} /> 加入这一天
            </button>
          ) : plan.status === "done" ? (
            <>
              <span className="personal-done">
                <Check size={14} /> 完成 · 自述
              </span>
              <button
                disabled={busy}
                onClick={() => void change(task, "planned")}
              >
                重新打开
              </button>
            </>
          ) : (
            <>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setNote("");
                  setComplete(task);
                }}
              >
                <Check size={14} /> 记录完成
              </button>
              {plan.status === "planned" ? (
                <button
                  disabled={busy}
                  onClick={() => void change(task, "doing")}
                >
                  开始个人跟进
                </button>
              ) : (
                <span className="personal-doing">个人跟进中</span>
              )}
              <button
                disabled={busy}
                onClick={() => void change(task, "deferred")}
              >
                移回候选
              </button>
            </>
          )}
          {task.needsMe && <span className="needs-tag">需你参与</span>}
        </div>
      </article>
    );
  };
  let shown = tasks;
  if (view === "today") shown = todayTasks;
  else if (view === "career") shown = tasks.filter((t) => t.area === "career");
  else if (view === "needs") shown = tasks.filter((t) => t.needsMe);
  if (area !== "all" && view !== "career")
    shown = shown.filter((t) => t.area === area);
  return (
    <div className="daily-board">
      <div className="page-heading board-heading">
        <div>
          <div className="eyebrow">
            YOUR DAY · LEARNING / BUILDING / NEXT OPPORTUNITY
          </div>
          <h1>把今天，向前推进一点。</h1>
          <p>从真实会话接续下一步，让学习、项目和找工作都有落点。</p>
        </div>
        <button
          className="primary"
          disabled={busy || !payload}
          onClick={() => {
            setFields({
              title: "",
              area: "learning",
              workspace: "个人",
              doneWhen: "",
            });
            setManual(true);
          }}
        >
          <Plus size={16} /> 添加每日任务
        </button>
      </div>
      <div className="board-trust">
        <ShieldCheck size={17} />
        <span>
          <strong>证据在前，进度随后。</strong>{" "}
          会话意图、项目原生记录、建议与个人完成记录分别标注。
        </span>
        <span className="badge observed">本地保存</span>
      </div>
      {error && (
        <div className="learning-error" role="alert">
          {error}
          <button onClick={() => void load()}>刷新最新数据</button>
        </div>
      )}
      <div className="board-notice" aria-live="polite" role="status">
        {notice}
      </div>
      {payload ? (
        <>
          <section className="board-hero">
            <div className="today-focus">
              <div className="section-title">
                <span className="small-label">FOCUS · 一次关注至多三件</span>
                <Target size={20} />
              </div>
              <h2>
                {todayTasks.filter((t) => planFor(t.id)?.status !== "deferred")
                  .length
                  ? "接住已经选定的下一步。"
                  : "先选一件值得推进的事。"}
              </h2>
              <p>
                只记录你选定的个人计划。任务来自真实线索；加入今天不会启动
                Agent、投递申请或批准任何外部动作。
              </p>
              <div className="focus-task-lines">
                {focusTasks.map((task, index) => (
                  <div key={task.id}>
                    <span>0{index + 1}</span>
                    <strong>{task.title}</strong>
                    {!planFor(task.id) && (
                      <button
                        disabled={busy}
                        onClick={() => void change(task, "planned")}
                        aria-label={`加入计划：${task.title}`}
                      >
                        <Plus size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="focus-foot">
                {suggestionsMode
                  ? "当前无未完成焦点 · 上方为未排期建议"
                  : `${day} · 个人计划`}
                <a href="#learning">
                  打开学习目标 <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
            <div className="board-hero-side">
              <div className="daily-metrics">
                <div>
                  <span>这一天的个人计划</span>
                  <strong>
                    {plans.filter((p) => p.status !== "deferred").length}
                    <small>项</small>
                  </strong>
                </div>
                <div>
                  <span>
                    已记录完成 <span className="badge unknown">自述</span>
                  </span>
                  <strong>
                    {done}
                    <small>项</small>
                  </strong>
                </div>
              </div>
              <section className="board-connection">
                <div className="section-title">
                  <h2>
                    <Link2 size={16} /> Page 与 ChatGPT
                  </h2>
                  <span className="badge unknown">快照</span>
                </div>
                <p>
                  本地数据留在 AI 文件夹；Page
                  提供可读入口，每份快照保留自己的时间。
                </p>
                {payload.page ? (
                  <a
                    className="board-page-link"
                    href={payload.page.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {payload.page.title}
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="learning-caption">Page 尚未建立</span>
                )}
                {payload.page && (
                  <small>
                    Page 快照 {when(payload.page.snapshotAt)} · rev{" "}
                    {payload.page.boardRevision}
                  </small>
                )}
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => void exportContext()}
                >
                  <RefreshCw size={14} /> 更新 ChatGPT 本地快照
                </button>
                <div className="bridge-location">{payload.bridge.path}</div>
              </section>
            </div>
          </section>
          <section className="board-workbench">
            <div className="board-toolbar">
              <div className="board-view-tabs" aria-label="看板视图">
                {[
                  { id: "today", label: "每日计划", icon: ListChecks },
                  { id: "candidates", label: "候选任务", icon: ClipboardList },
                  { id: "workspaces", label: "项目 / App", icon: Layers3 },
                  { id: "career", label: "找工作", icon: BriefcaseBusiness },
                  { id: "needs", label: "需要我", icon: Target },
                  { id: "sources", label: "来源", icon: FileText },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    aria-pressed={view === tab.id}
                    onClick={() => {
                      setView(tab.id);
                      setArea("all");
                    }}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {tab.id === "needs" && (
                      <span>{tasks.filter((t) => t.needsMe).length}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="board-date">
                <button aria-label="前一天" onClick={() => shift(-1)}>
                  <ChevronLeft size={16} />
                </button>
                <input
                  aria-label="计划日期"
                  type="date"
                  value={day}
                  onChange={(e) => {
                    if (e.target.value) setDay(e.target.value);
                  }}
                />
                <button aria-label="后一天" onClick={() => shift(1)}>
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setDay(todayNY())}>今天</button>
              </div>
            </div>
            {!["sources", "workspaces", "career"].includes(view) && (
              <div className="board-area-filters" aria-label="任务类别">
                {(["all", "learning", "projects", "career"] as const).map(
                  (a) => (
                    <button
                      key={a}
                      aria-pressed={area === a}
                      onClick={() => setArea(a)}
                    >
                      {a === "all" ? "全部" : areaNames[a]}
                    </button>
                  ),
                )}
                <span>
                  America/New_York · 日期代表个人计划，不是推测的截止日
                </span>
              </div>
            )}
            {view === "workspaces" ? (
              <div className="workspace-evidence-grid">
                {payload.evidence.workspaces.map((w) => (
                  <article key={w.id} className="panel evidence-workspace">
                    <div className="section-title">
                      <span className="area-tag area-projects">
                        {w.kind === "app"
                          ? "App / 产物"
                          : w.kind === "career"
                            ? "求职"
                            : "项目"}
                      </span>
                      <span className="badge unknown">运行状态未知</span>
                    </div>
                    <h3>{w.name}</h3>
                    <p>{w.summary}</p>
                    <div className="workspace-next">
                      <span className="small-label">下一步建议</span>
                      <p>{w.nextAction}</p>
                    </div>
                    <details>
                      <summary>团队边界与来源</summary>
                      <p>{w.boundary}</p>
                      {payload.evidence.sources
                        .filter((s) => w.sourceIds.includes(s.id))
                        .map((s) => (
                          <div className="workspace-source" key={s.id}>
                            <span>{s.title}</span>
                            <small>
                              读取 {when(s.observedAt)} ·{" "}
                              {s.freshness === "changed"
                                ? "文件有变化，需复核"
                                : s.freshness === "missing"
                                  ? "不可读"
                                  : "来源快照"}
                            </small>
                            <code>{s.ref}</code>
                          </div>
                        ))}
                    </details>
                  </article>
                ))}
              </div>
            ) : view === "sources" ? (
              <section className="panel board-sources">
                <div className="section-title">
                  <h2>知道这些数字从哪里来</h2>
                  <button
                    className="secondary"
                    onClick={() => void load()}
                    disabled={busy}
                  >
                    <RefreshCw size={14} /> 复核文件是否变化
                  </button>
                </div>
                <div className="coverage-numbers">
                  <span>
                    <strong>{payload.evidence.coverage.conversations}</strong>{" "}
                    相关会话
                  </span>
                  <span>
                    <strong>{payload.evidence.coverage.nativeFiles}</strong>{" "}
                    本地来源
                  </span>
                  <span>
                    <strong>{tasks.length}</strong> 候选任务
                  </span>
                </div>
                <p>
                  会话导入时间 {when(payload.evidence.importedAt)}
                  （纽约时间）。本地文件哈希可重新核对；刷新不读取新的 ChatGPT
                  消息。
                </p>
                {stale.length > 0 && (
                  <p className="source-changed">
                    {stale.length}{" "}
                    个来源已变化或不可读。相关摘要需要重新导入核对。
                  </p>
                )}
                <ul className="coverage-limits">
                  {payload.evidence.coverage.limitations.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className="board-source-list">
                  {payload.evidence.sources.map((s) => (
                    <div key={s.id}>
                      <span className="badge unknown">
                        {s.kind === "chat" ? "会话" : "文件"}
                      </span>
                      <div>
                        <strong>{s.title}</strong>
                        <small>
                          更新 {when(s.updatedAt)} · 读取 {when(s.observedAt)} ·{" "}
                          {s.freshness === "changed"
                            ? "内容已变化"
                            : s.freshness === "missing"
                              ? "不可读"
                              : s.freshness === "unchanged"
                                ? "哈希与导入时一致"
                                : "会话快照"}
                        </small>
                        <code>{s.ref}</code>
                        {s.limitations && <p>{s.limitations}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <>
                {view === "career" && (
                  <div className="career-context">
                    <BriefcaseBusiness size={20} />
                    <div>
                      <h3>把机会、材料和实际投递分清楚。</h3>
                      <p>
                        近期会话提到的岗位是线索；开放状态待核实。原生流水线记录与个人计划分别保存。面试结果仅以本人记录为准。
                      </p>
                    </div>
                    <span className="badge unknown">不自动发送</span>
                  </div>
                )}
                {view === "needs" && (
                  <p className="view-intro">
                    审稿、补充事实、产品反馈与验收集中在这里。完成个人任务不会授予投递、发布或录音权限。
                  </p>
                )}
                {shown.length ? (
                  <div className="board-task-grid">{shown.map(taskCard)}</div>
                ) : (
                  <div className="panel board-empty">
                    <ClipboardList size={30} />
                    <h2>
                      {view === "today"
                        ? "这一天，留一点明确的空间。"
                        : "当前筛选下没有任务。"}
                    </h2>
                    <p>
                      {view === "today"
                        ? "从候选任务中挑一件加入，或自己写下一个可验证的小任务。未选定的建议不会自动变成日程。"
                        : "可以切换类别，或添加一个个人任务。"}
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        setView("candidates");
                        setArea("all");
                      }}
                    >
                      挑选候选任务 <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
          <section className="board-bottom">
            <div className="panel board-phone">
              <div className="section-title">
                <h2>
                  <Smartphone size={17} /> 手机内网访问
                </h2>
                <span
                  className={`badge ${connection?.ready ? "observed" : "unknown"}`}
                >
                  {connection?.ready ? "本机服务已响应" : "入口待确认"}
                </span>
              </div>
              <p>
                手机和电脑连接同一可信
                Wi-Fi。电脑保持开机，在手机输入地址并使用访问码配对。
              </p>
              {connection?.firewallStatus === "admin_required" && (
                <p className="source-changed">
                  Windows 尚未允许内网入站连接。请在电脑的管理员 PowerShell 运行
                  <code>scripts/enable-lan.ps1</code>
                  ，然后用手机验证。
                </p>
              )}
              {connection?.urls.map((url) => (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="lan-url"
                  key={url}
                >
                  {url}
                  <ArrowUpRight size={14} />
                </a>
              ))}
              <div className="phone-controls">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/pairing-code");
                      const body = await response.json();
                      if (!response.ok) throw new Error(body.error);
                      setCode(body.code);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <ShieldCheck size={14} /> 在电脑查看访问码
                </button>
                <button className="text-link" onClick={() => void connect()}>
                  检查入口
                </button>
              </div>
              {code && (
                <div className="pair-code">
                  <code>{code}</code>
                  <button onClick={() => setCode("")}>隐藏</button>
                </div>
              )}
              <small>
                手机实际连接尚需你在设备上验证；本机内网地址可达不等于手机已连接。访问码不会写入
                Page 或上下文快照。
              </small>
            </div>
            <div className="panel board-provenance">
              <div className="section-title">
                <h2>
                  <BookOpen size={17} /> 每一次进步，都有下一步
                </h2>
              </div>
              <p>
                四个学习方向独立保存：React / JavaScript、System Design、AI /
                FDE 和 Interview practice。
              </p>
              <a className="text-link" href="#learning">
                记录独立回答、代码与追问证据 <ArrowUpRight size={14} />
              </a>
              <div className="quiet-box">
                题目收集 ≠ 已会作答
                <br />
                任务已记录完成 ≠ 项目里程碑已验收
                <br />
                定义了 Agent 角色 ≠ Agent 正在运行
              </div>
            </div>
          </section>
          <div className="board-storage">
            <Folder size={13} /> 本地：personal-os/ · 看板 revision{" "}
            {payload.state.revision} ·{" "}
            <button onClick={() => void load()} disabled={busy}>
              刷新保存状态
            </button>
          </div>
        </>
      ) : (
        !error && (
          <div className="panel" role="status">
            正在读取你的本地看板…
          </div>
        )
      )}
      {complete && (
        <Dialog
          title="记录这次完成的结果"
          onClose={() => {
            if (!busy) setComplete(null);
          }}
        >
          <form
            className="learning-form"
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              if (await change(complete, "done", note.trim()))
                setComplete(null);
            }}
          >
            <p>{complete.title}</p>
            <label>
              结果或证据
              <textarea
                autoFocus
                required
                maxLength={4000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="做了什么？保存在哪？还有什么没验证？"
              />
            </label>
            <p className="form-help">
              这是一条个人自述记录，不会替代独立验收或改变项目原生状态。
            </p>
            {error && (
              <div className="learning-error" role="alert">
                {error}
                <button type="button" onClick={() => void load()}>
                  刷新最新数据
                </button>
              </div>
            )}
            <button className="primary" disabled={busy}>
              保存结果 <Check size={15} />
            </button>
          </form>
        </Dialog>
      )}
      {manual && (
        <Dialog
          title="添加一个每日任务"
          onClose={() => {
            if (!busy) setManual(false);
          }}
        >
          <form
            className="learning-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!payload) return;
              const task: BoardTask = {
                id: "manual-" + crypto.randomUUID(),
                title: fields.title.trim(),
                area: fields.area,
                workspace: fields.workspace.trim(),
                description: "用户手动创建的个人跟进任务。",
                doneWhen: fields.doneWhen.trim(),
                sourceIds: [],
                confidence: "manual",
                needsMe: false,
              };
              const record: DailyPlan = {
                id: `${task.id}:${day}`,
                taskId: task.id,
                day,
                status: "planned",
                completionNote: "",
                updatedAt: new Date().toISOString(),
              };
              if (
                await save(
                  {
                    ...payload.state,
                    customTasks: [...payload.state.customTasks, task],
                    plans: [...payload.state.plans, record],
                  },
                  "个人任务已添加到 " + day + "。",
                )
              )
                setManual(false);
            }}
          >
            <label>
              任务标题
              <input
                autoFocus
                required
                maxLength={160}
                value={fields.title}
                onChange={(e) =>
                  setFields({ ...fields, title: e.target.value })
                }
              />
            </label>
            <label>
              类别
              <select
                aria-label="每日任务类别"
                value={fields.area}
                onChange={(e) =>
                  setFields({ ...fields, area: e.target.value as Area })
                }
              >
                {Object.entries(areaNames).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              关联方向或项目
              <input
                required
                maxLength={120}
                value={fields.workspace}
                onChange={(e) =>
                  setFields({ ...fields, workspace: e.target.value })
                }
              />
            </label>
            <label>
              怎样算完成？
              <textarea
                required
                maxLength={2000}
                value={fields.doneWhen}
                onChange={(e) =>
                  setFields({ ...fields, doneWhen: e.target.value })
                }
              />
            </label>
            <p>保存到 {day} 的个人计划。</p>
            {error && (
              <div className="learning-error" role="alert">
                {error}
                <button type="button" onClick={() => void load()}>
                  刷新最新数据
                </button>
              </div>
            )}
            <button className="primary" disabled={busy}>
              添加到这一天 <Plus size={15} />
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
