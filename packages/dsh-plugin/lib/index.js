// dsh-ai-teaching v0.1.0 — Host half. Built for DeepSeek Harness 0.2.1-rc.5.

// packages/dsh-plugin/src/host/index.ts
import { homedir } from "node:os";
import { join as join3 } from "node:path";

// packages/teaching-core/src/contracts/ids.ts
var RANDOM_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
function randomToken(length) {
  const cryptoApi = globalThis.crypto;
  const bytes = new Uint8Array(length);
  if (cryptoApi?.getRandomValues !== void 0) cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let out = "";
  for (const byte of bytes) out += RANDOM_ALPHABET[byte % 36];
  return out;
}
var counter = 0;
function newId(prefix) {
  counter = (counter + 1) % 1296;
  const stamp = Date.now().toString(36).slice(-6);
  return `${prefix}-${stamp}${counter.toString(36)}${randomToken(4)}`;
}
var courseId = () => newId("course");
var courseRevisionId = () => newId("crev");
var conceptId = () => newId("concept");
var sourceId = () => newId("src");
var sourceRevisionId = () => newId("srev");
var unitId = () => newId("unit");
var sessionId = () => newId("sess");
var messageId = () => newId("msg");
var activityId = () => newId("act");
var taskId = () => newId("task");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// packages/teaching-core/src/contracts/api.ts
var API_PREFIX = "/api/teaching";
function apiPath(operation) {
  return `${API_PREFIX}/${operation}`;
}

// packages/teaching-core/src/storage/layout.ts
import { join } from "node:path";
var SCHEMA_VERSION = 1;
var META_FILE = "meta.json";
function layout(dataDir) {
  const root = dataDir;
  const dirs = {
    root,
    courses: join(root, "courses"),
    sources: join(root, "sources"),
    sessions: join(root, "sessions"),
    activities: join(root, "activities"),
    learning: join(root, "learning"),
    environments: join(root, "environments"),
    runs: join(root, "runs"),
    tasks: join(root, "tasks"),
    exports: join(root, "exports"),
    backups: join(root, "backups"),
    usage: join(root, "usage"),
    cache: join(root, "cache")
  };
  const files = {
    meta: join(root, META_FILE),
    profile: join(root, "student-profile.json"),
    settings: join(root, "settings.json"),
    usageLog: join(root, "usage", "model-usage.jsonl")
  };
  return { ...dirs, files };
}
function dataDirs(dataDir) {
  const l = layout(dataDir);
  return [
    l.courses,
    l.sources,
    l.sessions,
    l.activities,
    l.learning,
    l.environments,
    l.runs,
    l.tasks,
    l.exports,
    l.backups,
    l.usage,
    l.cache
  ];
}
function courseFile(dataDir, courseId2) {
  return join(layout(dataDir).courses, `${courseId2}.json`);
}
function courseRevisionFile(dataDir, courseId2, revisionId) {
  return join(layout(dataDir).courses, `${courseId2}.revisions`, `${revisionId}.json`);
}
function courseRevisionDir(dataDir, courseId2) {
  return join(layout(dataDir).courses, `${courseId2}.revisions`);
}
function sourceFile(dataDir, sourceId2) {
  return join(layout(dataDir).sources, `${sourceId2}.json`);
}
function sourceRevisionFile(dataDir, sourceId2, revisionId) {
  return join(layout(dataDir).sources, sourceId2, "revisions", `${revisionId}.meta.json`);
}
function sourceUnitsFile(dataDir, sourceId2, revisionId) {
  return join(layout(dataDir).sources, sourceId2, "revisions", `${revisionId}.units.json`);
}
function sessionFile(dataDir, sessionId2) {
  return join(layout(dataDir).sessions, `${sessionId2}.json`);
}
function sessionMessagesFile(dataDir, sessionId2) {
  return join(layout(dataDir).sessions, `${sessionId2}.messages.jsonl`);
}
function activityFile(dataDir, activityId2) {
  return join(layout(dataDir).activities, `${activityId2}.json`);
}
function activityStateFile(dataDir, activityId2) {
  return join(layout(dataDir).activities, `${activityId2}.state.json`);
}
function learningFile(dataDir, courseId2) {
  return join(layout(dataDir).learning, `${courseId2}.json`);
}
function environmentFile(dataDir, environmentId) {
  return join(layout(dataDir).environments, `${environmentId}.json`);
}
function runFile(dataDir, runId) {
  return join(layout(dataDir).runs, `${runId}.json`);
}
function taskFile(dataDir, taskId2) {
  return join(layout(dataDir).tasks, `${taskId2}.json`);
}

// packages/teaching-core/src/storage/local-state.ts
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { dirname, isAbsolute, join as join2, normalize } from "node:path";
var StoreError = class extends Error {
  appError;
  constructor(appError2) {
    super(appError2.message);
    this.name = "StoreError";
    this.appError = appError2;
  }
};
var PathMutex = class {
  tails = /* @__PURE__ */ new Map();
  async run(key, fn) {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    const tracked = next.catch(() => void 0);
    this.tails.set(key, tracked);
    try {
      return await next;
    } finally {
      if (this.tails.get(key) === tracked) this.tails.delete(key);
    }
  }
};
function safePath(dataDir, relative) {
  const root = normalize(dataDir);
  const full = isAbsolute(relative) ? normalize(relative) : normalize(join2(root, relative));
  if (full !== root && !full.startsWith(`${root}/`)) {
    throw new StoreError({ code: "invalid-input", message: `\u62D2\u7EDD\u8D8A\u754C\u8DEF\u5F84\u5199\u5165: ${relative}` });
  }
  return full;
}
var LocalState = class {
  dataDir;
  paths;
  mutex = new PathMutex();
  options;
  metaCache;
  constructor(options) {
    this.options = options;
    this.dataDir = options.dataDir;
    this.paths = layout(options.dataDir);
  }
  /** Create directories and meta.json; validates schema version. */
  async open() {
    if (this.metaCache !== void 0) return this.metaCache;
    await mkdir(this.dataDir, { recursive: true });
    for (const dir of dataDirs(this.dataDir)) await mkdir(dir, { recursive: true });
    const metaPath = this.paths.files.meta;
    try {
      const raw = await readFile(metaPath, "utf8");
      const meta = JSON.parse(raw);
      this.validateMeta(meta);
      this.metaCache = meta;
      return meta;
    } catch (cause) {
      if (isMissing(cause)) {
        const meta = {
          schemaVersion: SCHEMA_VERSION,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          installationId: `inst-${Math.random().toString(36).slice(2, 10)}`,
          pluginVersion: this.options.pluginVersion
        };
        await this.writeAbsolute(metaPath, meta);
        this.metaCache = meta;
        return meta;
      }
      throw cause;
    }
  }
  /** Update meta (e.g. after migration). */
  async updateMeta(patch) {
    const meta = { ...await this.open(), ...patch, updatedAt: nowIso() };
    if (patch.schemaVersion !== void 0 && patch.schemaVersion !== SCHEMA_VERSION) {
      throw new StoreError({ code: "invalid-input", message: "schemaVersion \u53EA\u80FD\u5347\u7EA7\u5230\u5F53\u524D\u7248\u672C" });
    }
    this.validateMeta(meta);
    this.metaCache = meta;
    await this.writeAbsolute(this.paths.files.meta, meta);
    return meta;
  }
  /** Read one JSON record by relative path; returns undefined when absent. */
  async readJson(relative) {
    const path = safePath(this.dataDir, relative);
    try {
      const raw = await readFile(path, "utf8");
      if (raw.trim() === "") return void 0;
      return JSON.parse(raw);
    } catch (cause) {
      if (isMissing(cause)) return void 0;
      if (cause instanceof SyntaxError) {
        throw new StoreError({
          code: "storage",
          message: `\u672C\u5730\u8BB0\u5F55\u635F\u574F\uFF0C\u5DF2\u4FDD\u7559\u539F\u6587\u4EF6\u4EE5\u4FBF\u6062\u590D: ${relative}`,
          details: { path: relative, reason: cause.message }
        });
      }
      throw cause;
    }
  }
  /** Read multiple records, skipping absent ones. */
  async readMany(relativePaths) {
    const out = [];
    for (const relative of relativePaths) {
      const value = await this.readJson(relative);
      if (value !== void 0) out.push(value);
    }
    return out;
  }
  /** Atomically write one JSON record. */
  async writeJson(relative, value) {
    const path = safePath(this.dataDir, relative);
    await this.mutex.run(path, async () => {
      await mkdir(dirname(path), { recursive: true });
      await this.writeAbsolute(path, value);
    });
  }
  /** Delete one file or directory (idempotent). */
  async remove(relative) {
    const path = safePath(this.dataDir, relative);
    return this.mutex.run(path, async () => {
      try {
        await rm(path, { recursive: true, force: true });
        return true;
      } catch (cause) {
        if (isMissing(cause)) return false;
        throw cause;
      }
    });
  }
  /** List file names in one relative directory (no recursion, sorted). */
  async list(relativeDir) {
    const path = safePath(this.dataDir, relativeDir);
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    } catch (cause) {
      if (isMissing(cause)) return [];
      throw cause;
    }
  }
  /** List subdirectory names in one relative directory. */
  async listDirs(relativeDir) {
    const path = safePath(this.dataDir, relativeDir);
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch (cause) {
      if (isMissing(cause)) return [];
      throw cause;
    }
  }
  /** Whether a relative file exists. */
  async exists(relative) {
    try {
      await stat(safePath(this.dataDir, relative));
      return true;
    } catch (cause) {
      if (isMissing(cause)) return false;
      throw cause;
    }
  }
  /** Append one JSON line (usage logs, append-only message streams). */
  async appendJsonl(relative, value) {
    const path = safePath(this.dataDir, relative);
    await this.mutex.run(path, async () => {
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, `${JSON.stringify(value)}
`, "utf8");
    });
  }
  /** Read a JSONL file, skipping a trailing partial line after a crash. */
  async readJsonl(relative) {
    const path = safePath(this.dataDir, relative);
    let raw;
    try {
      raw = await readFile(path, "utf8");
    } catch (cause) {
      if (isMissing(cause)) return [];
      throw cause;
    }
    const lines = raw.split("\n").filter((line) => line.trim() !== "");
    const out = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line));
      } catch {
        continue;
      }
    }
    return out;
  }
  /** Absolute path of the data directory (for display only). */
  get root() {
    return this.dataDir;
  }
  async writeAbsolute(path, value) {
    const tmp = join2(dirname(path), `.${META_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`);
    await writeFile(tmp, `${JSON.stringify(value, null, 2)}
`, "utf8");
    await rename(tmp, path);
  }
  validateMeta(meta) {
    if (typeof meta.schemaVersion !== "number" || !Number.isInteger(meta.schemaVersion)) {
      throw new StoreError({ code: "storage", message: "\u672C\u5730\u6570\u636E\u76EE\u5F55\u7F3A\u5C11\u6709\u6548 schemaVersion" });
    }
    if (meta.schemaVersion > SCHEMA_VERSION) {
      throw new StoreError({
        code: "storage",
        message: `\u672C\u5730\u6570\u636E\u7531\u66F4\u65B0\u7248\u672C\u521B\u5EFA\uFF08schema ${meta.schemaVersion} > ${SCHEMA_VERSION}\uFF09\uFF0C\u8BF7\u5347\u7EA7\u63D2\u4EF6\u6216\u4F7F\u7528\u5907\u4EFD\u6062\u590D`,
        details: { schemaVersion: meta.schemaVersion, supported: SCHEMA_VERSION }
      });
    }
    if (meta.schemaVersion < SCHEMA_VERSION && this.options.allowOldSchema !== true) {
      throw new StoreError({
        code: "storage",
        message: `\u672C\u5730\u6570\u636E schema ${meta.schemaVersion} \u9700\u8981\u8FC1\u79FB\u5230 ${SCHEMA_VERSION}`,
        details: { schemaVersion: meta.schemaVersion, supported: SCHEMA_VERSION }
      });
    }
  }
};
function isMissing(cause) {
  return typeof cause === "object" && cause !== null && cause.code === "ENOENT";
}

// packages/teaching-core/src/storage/repositories.ts
function emptyProfile() {
  return {
    language: "zh",
    preferences: { showSources: true, keepOriginalTerms: true, confirmSystemChanges: true },
    updatedAt: nowIso()
  };
}
var ProfileRepository = class {
  state;
  constructor(state) {
    this.state = state;
  }
  /** Read the profile, creating defaults on first use. */
  async get() {
    const stored = await this.state.readJson(this.state.paths.files.profile);
    if (stored !== void 0) return stored;
    const profile = emptyProfile();
    await this.state.writeJson(this.state.paths.files.profile, profile);
    return profile;
  }
  /** Merge a patch into the profile and persist it. */
  async patch(patch) {
    const current = await this.get();
    const next = {
      ...current,
      ...patch,
      preferences: { ...current.preferences, ...patch.preferences ?? {} },
      updatedAt: nowIso()
    };
    await this.state.writeJson(this.state.paths.files.profile, next);
    return next;
  }
};
var CourseRepository = class {
  state;
  constructor(state) {
    this.state = state;
  }
  /** All courses, newest first. */
  async list() {
    const files = (await this.state.list("courses")).filter((name2) => name2.endsWith(".json"));
    const courses = [];
    for (const name2 of files) {
      const course = await this.state.readJson(`courses/${name2}`);
      if (course !== void 0) courses.push(course);
    }
    return courses.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  /** Read one course or undefined. */
  async get(courseId2) {
    return this.state.readJson(courseFile(this.state.dataDir, courseId2));
  }
  /** Create or replace a course record. */
  async save(course) {
    const next = { ...course, updatedAt: nowIso() };
    await this.state.writeJson(courseFile(this.state.dataDir, course.id), next);
    return next;
  }
  /** Persist one course revision. */
  async saveRevision(revision) {
    await this.state.writeJson(courseRevisionFile(this.state.dataDir, revision.courseId, revision.id), revision);
  }
  /** Read one course revision. */
  async getRevision(courseId2, revisionId) {
    return this.state.readJson(courseRevisionFile(this.state.dataDir, courseId2, revisionId));
  }
  /** Read the confirmed revision a session should use. */
  async getActiveRevision(course) {
    if (course.activeRevisionId === void 0) return void 0;
    return this.getRevision(course.id, course.activeRevisionId);
  }
  /** Read the newest proposed revision, if any. */
  async getDraftRevision(course) {
    if (course.draftRevisionId === void 0) return void 0;
    return this.getRevision(course.id, course.draftRevisionId);
  }
  /** All revisions of one course, oldest first. */
  async listRevisions(courseId2) {
    const dir = courseRevisionDir(this.state.dataDir, courseId2);
    const rel = dir.slice(this.state.dataDir.length + 1);
    const files = (await this.state.list(rel)).filter((name2) => name2.endsWith(".json"));
    const revisions = [];
    for (const name2 of files) {
      const revision = await this.state.readJson(`${rel}/${name2}`);
      if (revision !== void 0) revisions.push(revision);
    }
    return revisions.sort((a, b) => a.version - b.version);
  }
  /**
   * Compare-and-set update of the course header. Expected revision guards
   * against two windows overwriting each other's structural state.
   */
  async updateHeader(courseId2, patch) {
    const course = await this.get(courseId2);
    if (course === void 0) throw new StoreError(notFound("\u8BFE\u7A0B"));
    return this.save({ ...course, ...patch });
  }
  /** Delete a course, its revisions and source links. */
  async delete(courseId2) {
    await this.state.remove(`courses/${courseId2}.json`);
    await this.state.remove(`courses/${courseId2}.revisions`);
  }
  /** Read the course sources (whole documents; units stay in the source store). */
  async listSources(courseId2) {
    const files = (await this.state.list("sources")).filter((name2) => name2.endsWith(".json"));
    const docs = [];
    for (const name2 of files) {
      const doc = await this.state.readJson(`sources/${name2}`);
      if (doc !== void 0 && doc.courseIds.includes(courseId2)) docs.push(doc);
    }
    return docs;
  }
  /** Attach/unattach an existing source document to a course. */
  async setSourceCourse(documentId, courseId2, attach) {
    const path = sourceFile(this.state.dataDir, documentId);
    const doc = await this.state.readJson(path);
    if (doc === void 0) throw new StoreError(notFound("\u8D44\u6599"));
    const courseIds = attach ? Array.from(/* @__PURE__ */ new Set([...doc.courseIds, courseId2])) : doc.courseIds.filter((id) => id !== courseId2);
    const next = { ...doc, courseIds, updatedAt: nowIso() };
    await this.state.writeJson(path, next);
    return next;
  }
  /** Store one source document record. */
  async saveSource(document) {
    const next = { ...document, updatedAt: nowIso() };
    await this.state.writeJson(sourceFile(this.state.dataDir, document.id), next);
    return next;
  }
  /** Read one source document record. */
  async getSource(documentId) {
    return this.state.readJson(sourceFile(this.state.dataDir, documentId));
  }
  /** Roles attached to a course's sources are stored on the course revision; unused helper kept for T02. */
  static roleOf(revision, sourceId2) {
    return revision.sources.find((source) => source.sourceId === sourceId2)?.role;
  }
};
var SessionRepository = class {
  state;
  constructor(state) {
    this.state = state;
  }
  /** Sessions for one course (or all), newest first. */
  async list(courseId2) {
    const files = (await this.state.list("sessions")).filter((name2) => name2.endsWith(".json") && !name2.includes(".messages."));
    const sessions = [];
    for (const name2 of files) {
      const session = await this.state.readJson(`sessions/${name2}`);
      if (session !== void 0 && (courseId2 === void 0 || session.courseId === courseId2)) sessions.push(session);
    }
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  /** Read one session. */
  async get(sessionId2) {
    return this.state.readJson(sessionFile(this.state.dataDir, sessionId2));
  }
  /** Persist one session record. */
  async save(session) {
    const next = { ...session, updatedAt: nowIso() };
    await this.state.writeJson(sessionFile(this.state.dataDir, session.id), next);
    return next;
  }
  /** Read all messages of one session, oldest first. */
  async messages(sessionId2) {
    return this.state.readJsonl(sessionMessagesFile(this.state.dataDir, sessionId2));
  }
  /** Append one message to the durable stream. */
  async appendMessage(message) {
    await this.state.appendJsonl(sessionMessagesFile(this.state.dataDir, message.sessionId), message);
  }
  /** Persist an activity record. */
  async saveActivity(activity) {
    const next = { ...activity, updatedAt: nowIso() };
    await this.state.writeJson(activityFile(this.state.dataDir, activity.id), next);
    return next;
  }
  /** Read one activity. */
  async getActivity(activityId2) {
    return this.state.readJson(activityFile(this.state.dataDir, activityId2));
  }
  /** All activities of one session. */
  async listActivities(sessionId2) {
    const files = (await this.state.list("activities")).filter((name2) => name2.endsWith(".json") && !name2.endsWith(".state.json"));
    const activities = [];
    for (const name2 of files) {
      const activity = await this.state.readJson(`activities/${name2}`);
      if (activity !== void 0 && activity.sessionId === sessionId2) activities.push(activity);
    }
    return activities.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  /** Persist student-editable activity state. */
  async saveActivityState(stateRecord) {
    const next = { ...stateRecord, updatedAt: nowIso() };
    await this.state.writeJson(activityStateFile(this.state.dataDir, stateRecord.activityId), next);
    return next;
  }
  /** Read student-editable activity state. */
  async getActivityState(activityId2) {
    return this.state.readJson(activityStateFile(this.state.dataDir, activityId2));
  }
  /** Delete a session and its messages (student data control). */
  async delete(sessionId2) {
    await this.state.remove(`sessions/${sessionId2}.json`);
    await this.state.remove(`sessions/${sessionId2}.messages.jsonl`);
  }
};
var LearningRepository = class {
  state;
  constructor(state) {
    this.state = state;
  }
  /** Read one course learning record. */
  async get(courseId2) {
    return this.state.readJson(learningFile(this.state.dataDir, courseId2));
  }
  /** Persist one course learning record. */
  async save(record) {
    const next = { ...record, updatedAt: nowIso() };
    await this.state.writeJson(learningFile(this.state.dataDir, record.courseId), next);
    return next;
  }
  /** List every course learning record (for backup/export). */
  async listAll() {
    const files = (await this.state.list("learning")).filter((name2) => name2.endsWith(".json"));
    const records = [];
    for (const name2 of files) {
      const record = await this.state.readJson(`learning/${name2}`);
      if (record !== void 0) records.push(record);
    }
    return records;
  }
};
function notFound(what) {
  return { code: "not-found", message: `${what}\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664` };
}

// packages/teaching-core/src/model/fake.ts
function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1] ?? text;
  const first = Math.min(...["{", "["].map((char) => {
    const index = candidate.indexOf(char);
    return index === -1 ? Number.POSITIVE_INFINITY : index;
  }));
  if (!Number.isFinite(first)) return candidate.trim();
  const lastObject = candidate.lastIndexOf("}");
  const lastArray = candidate.lastIndexOf("]");
  const last = Math.max(lastObject, lastArray);
  return candidate.slice(first, last === -1 ? void 0 : last + 1);
}

// packages/dsh-plugin/src/host/model-adapter.ts
var DEFAULT_TIMEOUT_MS = 18e4;
var MAX_ATTEMPTS = 2;
function toGenerateOptions(request, selection, routingSessionId) {
  const messages = request.messages.map((message, index) => message.role === "assistant" ? {
    id: `teaching-assistant-${index}`,
    role: "assistant",
    content: [{ type: "text", text: message.text }],
    source: { kind: "model", provider: selection.provider, model: selection.model }
  } : {
    role: message.role,
    content: [{ type: "text", text: message.text }]
  });
  const options = {
    provider: selection.provider,
    model: selection.model,
    messages,
    sessionId: routingSessionId
  };
  if (request.system !== void 0) options.system = request.system;
  if (request.maxTokens !== void 0) options.maxTokens = request.maxTokens;
  if (request.temperature !== void 0) options.temperature = request.temperature;
  if (selection.reasoningEffort !== void 0) options.reasoningEffort = selection.reasoningEffort;
  return options;
}
function withJsonInstruction(request) {
  if (request.json === void 0) return request;
  const fields = Object.entries(request.json.fields).map(([key, description]) => `- ${key}: ${description}`).join("\n");
  const instruction = `

\u8BF7\u53EA\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF08\u4E0D\u8981\u989D\u5916\u6587\u5B57\u6216 Markdown \u56F4\u680F\uFF09\uFF0C\u5B57\u6BB5\u5982\u4E0B\uFF1A
${fields}`;
  return { ...request, messages: [...request.messages, { role: "user", text: instruction }] };
}
var HarnessModelAdapter = class {
  options;
  host;
  cachedInfo;
  constructor(host, options) {
    this.host = host;
    this.options = options;
  }
  /** Read the deployment default selection; falls back to an explicit error state. */
  async info() {
    if (this.cachedInfo !== void 0) return this.cachedInfo;
    const selection = this.host.agentDefaultModel.currentSelection();
    let imageInput = "unknown";
    let contextWindow;
    try {
      const model = await this.host.llm.resolveModel?.(selection.provider, selection.model);
      const modalities = model?.inputModalities;
      if (Array.isArray(modalities)) imageInput = modalities.includes("image") ? "yes" : "no";
      const window = model?.contextWindow;
      if (typeof window === "number") contextWindow = window;
    } catch {
    }
    this.cachedInfo = {
      provider: selection.provider,
      model: selection.model,
      reasoningEffort: selection.reasoningEffort,
      imageInput,
      contextWindow
    };
    return this.cachedInfo;
  }
  /** Stream one completion with timeout, at most one transient retry, and usage accounting. */
  async *stream(request, signal) {
    const info = await this.info();
    const effective = withJsonInstruction(request);
    let attempt = 0;
    let lastError;
    while (attempt < MAX_ATTEMPTS) {
      attempt += 1;
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort, { once: true });
      let text = "";
      let usage;
      let terminal;
      try {
        const selection = this.host.agentDefaultModel.currentSelection();
        const options = toGenerateOptions(effective, selection, this.options.routingSessionId);
        options.signal = controller.signal;
        for await (const chunk of this.host.llm.stream(options)) {
          const type = chunk.type;
          if (type === "text-delta") {
            const delta = typeof chunk.text === "string" ? chunk.text : "";
            if (delta.length > 0) {
              text += delta;
              yield { type: "text", text: delta };
            }
            continue;
          }
          if (type === "usage") {
            const raw = chunk.usage;
            usage = {
              at: nowIso(),
              purpose: request.purpose,
              provider: info.provider,
              model: info.model,
              durationMs: Date.now() - startedAt,
              inputTokens: numberOrUndefined(raw?.inputTokens),
              outputTokens: numberOrUndefined(raw?.outputTokens),
              totalTokens: numberOrUndefined(raw?.totalTokens),
              costUsd: numberOrUndefined(raw?.costUsd),
              usageUnknown: raw === void 0,
              ok: true
            };
            continue;
          }
          if (type === "finish") {
            const reason = chunk.reason;
            terminal = {
              ok: reason?.kind === "stop" || reason?.kind === "tool-calls" || reason?.kind === "max-tokens",
              failure: reason?.failure
            };
            break;
          }
        }
      } catch (cause) {
        terminal = { ok: false, failure: { message: cause instanceof Error ? cause.message : String(cause) } };
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
      }
      const cancelled = signal?.aborted === true;
      const durationMs = Date.now() - startedAt;
      const usageEntry = usage ?? {
        at: nowIso(),
        purpose: request.purpose,
        provider: info.provider,
        model: info.model,
        durationMs,
        usageUnknown: true,
        ok: terminal?.ok === true
      };
      this.options.onUsage?.(usageEntry);
      if (terminal?.ok === true) {
        yield {
          type: "done",
          text,
          usage: {
            provider: info.provider,
            model: info.model,
            durationMs,
            inputTokens: usageEntry.inputTokens,
            outputTokens: usageEntry.outputTokens,
            totalTokens: usageEntry.totalTokens,
            costUsd: usageEntry.costUsd,
            usageUnknown: usageEntry.usageUnknown,
            retried: attempt - 1
          }
        };
        return;
      }
      if (cancelled) {
        yield { type: "error", error: { code: "cancelled", message: "\u6A21\u578B\u8C03\u7528\u5DF2\u53D6\u6D88" } };
        return;
      }
      const failure2 = {
        code: terminal?.failure?.code ?? "failed",
        message: terminal?.failure?.message ?? "\u6A21\u578B\u8C03\u7528\u5931\u8D25"
      };
      lastError = failure2;
      const retryable = /rate|timeout|network|503|502|429|overloaded/i.test(failure2.message);
      this.options.log?.("model call failed", { attempt, code: failure2.code, retryable });
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        yield { type: "error", error: failure2 };
        return;
      }
    }
    yield { type: "error", error: lastError ?? { code: "failed", message: "\u6A21\u578B\u8C03\u7528\u5931\u8D25" } };
  }
  /** Collect a streaming call; structured requests parse the JSON tail. */
  async complete(request, signal) {
    let text = "";
    let usage = {
      provider: "",
      model: "",
      durationMs: 0,
      usageUnknown: true
    };
    let failure2;
    for await (const event of this.stream(request, signal)) {
      if (event.type === "text") text += event.text;
      else if (event.type === "usage") usage = event.usage;
      else if (event.type === "done") usage = event.usage;
      else failure2 = event.error;
    }
    if (failure2 !== void 0) {
      throw Object.assign(new Error(failure2.message), { code: failure2.code });
    }
    if (request.json === void 0) return { text, usage };
    try {
      return { text, usage, json: JSON.parse(extractJson(text)) };
    } catch (cause) {
      return { text, usage, rawText: text, parseError: cause instanceof Error ? cause.message : String(cause) };
    }
  }
};
function numberOrUndefined(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}

// packages/dsh-plugin/src/host/web.ts
function createWebBridge(ctx) {
  return {
    available: () => ctx.get("web") !== void 0,
    async search(query, options) {
      const service = ctx.get("web");
      if (service === void 0) {
        return fail("capability-missing", "\u5F53\u524D Harness \u914D\u7F6E\u6CA1\u6709\u542F\u7528\u8054\u7F51\u80FD\u529B\uFF0C\u65E0\u6CD5\u67E5\u8BC1\u5916\u90E8\u8D44\u6599");
      }
      const trimmed = query.trim();
      if (trimmed === "") return fail("invalid-input", "\u8054\u7F51\u67E5\u8BE2\u5185\u5BB9\u4E3A\u7A7A");
      try {
        const result = await service.search({ query: trimmed, maxResults: options?.maxResults ?? 5 }, options?.signal);
        const sources = result.sources.filter((source) => typeof source.url === "string" && source.url.length > 0).slice(0, options?.maxResults ?? 5).map((source) => ({
          title: source.title ?? new URL(source.url).hostname,
          url: source.url,
          snippet: (source.snippet ?? "").slice(0, 600)
        }));
        return { ok: true, value: sources };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        const code = typeof cause === "object" && cause !== null && typeof cause.code === "string" ? String(cause.code) : "";
        if (/cancel|abort/i.test(message) || /CANCEL|ABORT/i.test(code)) {
          return fail("cancelled", "\u8054\u7F51\u67E5\u8BE2\u5DF2\u53D6\u6D88");
        }
        if (/unavailable|no provider|not configured/i.test(message) || /UNAVAILABLE|MISSING/i.test(code)) {
          return fail("capability-missing", "\u8054\u7F51\u80FD\u529B\u4E0D\u53EF\u7528\uFF1A\u6CA1\u6709\u53EF\u7528\u7684\u641C\u7D22\u63D0\u4F9B\u65B9");
        }
        return fail("network", "\u8054\u7F51\u67E5\u8BE2\u5931\u8D25\uFF0C\u672C\u5730\u8D44\u6599\u5185\u5BB9\u4E0D\u53D7\u5F71\u54CD", { message: message.slice(0, 300) });
      }
    }
  };
}
function fail(code, message, details) {
  return { ok: false, error: { code, message, ...details === void 0 ? {} : { details } } };
}
function wantsWebLookup(text) {
  return /联网|上网|网上|搜索一下|查一下|查证|核实|最新(的)?(资料|进展|消息)|外部资料|网页|official docs|search the web|look up online/i.test(text);
}
function toSearchQuery(text) {
  return text.replace(/请?你?(帮我)?(联网|上网|搜索一下|查一下|查证|核实|在网上找|帮我找)/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

// packages/dsh-plugin/src/host/minimal.ts
import "node:crypto";
import { createHash } from "node:crypto";
import { readFile as readFile2, stat as stat2 } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, extname } from "node:path";
function detectFormat(path) {
  const ext = extname(path).toLowerCase();
  if ([".md", ".markdown", ".mdx"].includes(ext)) return "markdown";
  if ([".txt", ".text", ".log"].includes(ext)) return "text";
  if (ext === ".pdf") return "pdf";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"].includes(ext)) return "image";
  if ([".docx"].includes(ext)) return "docx";
  if ([".pptx"].includes(ext)) return "pptx";
  if ([".ipynb"].includes(ext)) return "notebook";
  if ([".html", ".htm"].includes(ext)) return "html";
  if ([".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".scm", ".ss", ".rkt", ".c", ".h", ".cpp", ".java", ".rs", ".go", ".rb", ".sh", ".sql", ".json", ".yaml", ".yml"].includes(ext)) return "code";
  return "text";
}
function parseTextContent(text, format) {
  const lines = text.split(/\r?\n/);
  const units = [];
  const warnings = [];
  const revisionId = sourceRevisionId();
  let buffer = [];
  let bufferStart = 1;
  let sectionPath = [];
  let inFence = false;
  const flush = (endLine, kind = "paragraph") => {
    const body = buffer.join("\n").trim();
    buffer = [];
    if (body === "") return;
    units.push({
      id: unitId(),
      revisionId,
      kind,
      locator: { lines: [bufferStart, Math.max(bufferStart, endLine)], sectionPath: [...sectionPath] },
      text: body,
      markdown: format === "markdown" ? body : void 0,
      confidence: "high"
    });
  };
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (line.startsWith("```")) {
      if (inFence) {
        buffer.push(line);
        flush(lineNo, "code");
        inFence = false;
      } else {
        flush(lineNo - 1);
        buffer.push(line);
        bufferStart = lineNo;
        inFence = true;
      }
      return;
    }
    if (inFence) {
      buffer.push(line);
      return;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading !== null) {
      flush(lineNo - 1);
      const level = heading[1]?.length ?? 1;
      sectionPath = [...sectionPath.slice(0, level - 1), heading[2]?.trim() ?? ""];
      units.push({
        id: unitId(),
        revisionId,
        kind: "heading",
        locator: { lines: [lineNo, lineNo], sectionPath: [...sectionPath] },
        text: heading[2]?.trim() ?? "",
        markdown: line,
        confidence: "high"
      });
      bufferStart = lineNo + 1;
      return;
    }
    if (line.trim() === "") {
      flush(lineNo - 1);
      bufferStart = lineNo + 1;
      return;
    }
    if (buffer.length === 0) bufferStart = lineNo;
    if (/^\s*\$\$/.test(line) || buffer.length === 0 && /^\s*\\\[/.test(line)) {
      flush(lineNo - 1);
      units.push({
        id: unitId(),
        revisionId,
        kind: "formula",
        locator: { lines: [lineNo, lineNo], sectionPath: [...sectionPath] },
        text: line.trim(),
        confidence: "high"
      });
      bufferStart = lineNo + 1;
      return;
    }
    buffer.push(line);
  });
  flush(lines.length);
  if (units.length === 0) warnings.push("\u6587\u4EF6\u6CA1\u6709\u53EF\u63D0\u53D6\u7684\u6B63\u6587\u5185\u5BB9");
  return { units, warnings };
}
var MinimalCorpus = class {
  state;
  constructor(state) {
    this.state = state;
  }
  /** Import one file; unsupported formats return a clear capability error. */
  async importFile(path, courseId2) {
    const info = await stat2(path);
    const format = detectFormat(path);
    if (!["markdown", "text", "code", "notebook", "html"].includes(format)) {
      throw appError("capability-missing", `T01 \u6700\u5C0F\u6D41\u7A0B\u6682\u53EA\u652F\u6301\u6587\u672C\u7C7B\u8D44\u6599\uFF08${format} \u7531 T02 \u63A5\u5165\uFF09\uFF1A${basename(path)}`);
    }
    const bytes = await readFile2(path);
    const fingerprint = createHash("sha256").update(bytes).digest("hex");
    const revisionId = sourceRevisionId();
    let text;
    if (format === "notebook") {
      text = notebookToText(bytes.toString("utf8"));
    } else if (format === "html") {
      text = bytes.toString("utf8").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    } else {
      text = bytes.toString("utf8");
    }
    const parsed = parseTextContent(text, format);
    const units = parsed.units.map((unit) => ({ ...unit, revisionId }));
    const id = sourceId();
    const document = {
      id,
      originalPath: path,
      title: basename(path),
      format,
      sizeBytes: info.size,
      mtimeMs: info.mtimeMs,
      courseIds: courseId2 === void 0 ? [] : [courseId2],
      addedAt: nowIso(),
      updatedAt: nowIso(),
      status: parsed.warnings.length > 0 ? "partial" : "ready",
      currentRevisionId: revisionId,
      revisions: [{ id: revisionId, fingerprint, createdAt: nowIso(), status: "ready", unitCount: units.length }]
    };
    await this.state.writeJson(sourceFile(this.state.dataDir, id), document);
    await this.state.writeJson(sourceUnitsFile(this.state.dataDir, id, revisionId), units);
    await this.state.writeJson(sourceRevisionFile(this.state.dataDir, id, revisionId), {
      id: revisionId,
      documentId: id,
      fingerprint,
      createdAt: nowIso(),
      extractor: { name: "text-v1", version: "0.1.0" },
      unitCount: units.length,
      issueCount: parsed.warnings.length,
      status: parsed.warnings.length > 0 ? "partial" : "ready",
      extent: { kind: "lines", count: text.split("\n").length },
      textChars: text.length
    });
    return { document, units, warnings: parsed.warnings, fingerprint };
  }
  /** Load one stored source (document + current revision units). */
  async load(sourceId2) {
    const document = await this.state.readJson(sourceFile(this.state.dataDir, sourceId2));
    if (document === void 0) throw appError("not-found", "\u8D44\u6599\u4E0D\u5B58\u5728");
    const revision = document.revisions.at(-1) ?? void 0;
    if (revision === void 0) throw appError("not-found", "\u8D44\u6599\u8FD8\u6CA1\u6709\u53EF\u8BFB\u53D6\u7684\u89E3\u6790\u7248\u672C");
    const units = await this.state.readJson(sourceUnitsFile(this.state.dataDir, sourceId2, revision.id)) ?? [];
    return { document, units, warnings: [], fingerprint: revision.fingerprint };
  }
  /** List documents attached to a course. */
  async listForCourse(courseId2) {
    const files = (await this.state.list("sources")).filter((name2) => name2.endsWith(".json"));
    const out = [];
    for (const name2 of files) {
      const doc = await this.state.readJson(`sources/${name2}`);
      if (doc !== void 0 && Array.isArray(doc.courseIds) && doc.courseIds.includes(courseId2)) out.push(doc);
    }
    return out;
  }
  /** Attach a source to a course. */
  async attach(sourceId2, courseId2, attach) {
    const stored = await this.load(sourceId2);
    const courseIds = attach ? Array.from(/* @__PURE__ */ new Set([...stored.document.courseIds, courseId2])) : stored.document.courseIds.filter((id) => id !== courseId2);
    const document = { ...stored.document, courseIds, updatedAt: nowIso() };
    await this.state.writeJson(sourceFile(this.state.dataDir, sourceId2), document);
    return document;
  }
  /** Naive-but-honest retrieval: term overlap over extracted units. */
  async search(query, courseIds, limit = 6) {
    const terms = tokenize(query);
    if (terms.length === 0) return [];
    const files = (await this.state.list("sources")).filter((name2) => name2.endsWith(".json"));
    const hits = [];
    for (const name2 of files) {
      const document = await this.state.readJson(`sources/${name2}`);
      if (document === void 0 || !Array.isArray(document.courseIds)) continue;
      if (courseIds.length > 0 && !document.courseIds.some((id) => courseIds.includes(id))) continue;
      const loaded = await this.load(document.id);
      const stored = loaded;
      for (const unit of stored.units) {
        const lower = unit.text.toLowerCase();
        let score = 0;
        const matched = [];
        for (const term of terms) {
          if (lower.includes(term)) {
            score += term.length >= 2 ? 2 : 1;
            matched.push(term);
          }
        }
        if (matched.length === 0) continue;
        score += Math.min(2, matched.length) + (unit.kind === "heading" ? 1 : 0);
        hits.push({
          anchor: {
            documentId: stored.document.id,
            revisionId: unit.revisionId,
            unitId: unit.id,
            locator: unit.locator,
            excerpt: unit.text.slice(0, 400),
            confidence: unit.confidence,
            label: `${stored.document.title}${unit.locator.sectionPath?.length ? ` \xB7 ${unit.locator.sectionPath.join(" / ")}` : ""}`
          },
          score,
          matchedTerms: matched
        });
      }
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
};
function notebookToText(raw) {
  try {
    const notebook = JSON.parse(raw);
    const cells = notebook.cells ?? [];
    return cells.map((cell, index) => {
      const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source ?? "";
      return `## cell ${index} (${cell.cell_type ?? "unknown"})
${source}`;
    }).join("\n\n");
  } catch {
    return raw;
  }
}
function tokenize(text) {
  const out = [];
  const latin = text.toLowerCase().match(/[a-z0-9_.+#-]{2,}/g) ?? [];
  out.push(...latin);
  const cjk = text.match(/[\u4e00-\u9fff]+/g) ?? [];
  for (const run of cjk) {
    if (run.length === 1) out.push(run);
    for (let i = 0; i + 1 < run.length; i += 1) out.push(run.slice(i, i + 2));
  }
  return Array.from(new Set(out)).slice(0, 24);
}
function draftConceptsFromSources(sources) {
  const concepts = [];
  const coverage = [];
  const warnings = [];
  const seen = /* @__PURE__ */ new Set();
  for (const source of sources) {
    let used = 0;
    for (const unit of source.units) {
      if (unit.kind !== "heading") continue;
      const title = unit.text.trim();
      if (title === "" || seen.has(title)) continue;
      seen.add(title);
      used += 1;
      concepts.push({
        id: conceptId(),
        title,
        summary: `\u6765\u81EA\u300A${source.document.title}\u300B\u7684\u300C${title}\u300D\u90E8\u5206`,
        prerequisites: [],
        sourceAnchors: [{
          documentId: source.document.id,
          revisionId: unit.revisionId,
          unitId: unit.id,
          locator: unit.locator,
          excerpt: title,
          confidence: unit.confidence,
          label: source.document.title
        }],
        difficulty: concepts.length < 3 ? "intro" : "core"
      });
    }
    coverage.push({
      sourceId: source.document.id,
      title: source.document.title,
      status: source.document.status,
      usedUnits: used,
      issues: 0
    });
    if (used === 0) warnings.push(`\u300A${source.document.title}\u300B\u6CA1\u6709\u53EF\u8BC6\u522B\u7684\u7AE0\u8282\u6807\u9898\uFF0C\u8BF7\u68C0\u67E5\u8D44\u6599\u6216\u6539\u7528 AI \u5206\u6790`);
  }
  if (concepts.length === 0) {
    for (const source of sources.slice(0, 1)) {
      for (const unit of source.units.slice(0, 4)) {
        concepts.push({
          id: conceptId(),
          title: unit.text.slice(0, 24) || "\u8D44\u6599\u5185\u5BB9",
          summary: unit.text.slice(0, 160),
          prerequisites: [],
          sourceAnchors: [{
            documentId: source.document.id,
            revisionId: unit.revisionId,
            unitId: unit.id,
            locator: unit.locator,
            excerpt: unit.text.slice(0, 240),
            confidence: unit.confidence,
            label: source.document.title
          }],
          difficulty: "intro"
        });
      }
    }
    warnings.push("\u8D44\u6599\u4E2D\u6CA1\u6709\u6807\u9898\u7ED3\u6784\uFF0C\u8BFE\u7A0B\u8349\u6848\u6309\u6BB5\u843D\u751F\u6210\uFF0C\u5EFA\u8BAE\u786E\u8BA4\u540E\u624B\u52A8\u8C03\u6574");
  }
  return { concepts, coverage, warnings };
}
function buildTeachingMessages(input) {
  const languageRule = input.profile.language === "en" ? "\u56DE\u7B54\u4F7F\u7528\u82F1\u6587\u3002" : input.profile.language === "bilingual" ? "\u56DE\u7B54\u4F7F\u7528\u4E2D\u6587\uFF0C\u5E76\u5728\u5173\u952E\u672F\u8BED\u540E\u4FDD\u7559\u82F1\u6587\u539F\u6587\uFF08\u5982\u201C\u8FC7\u62DF\u5408 (overfitting)\u201D\uFF09\u3002" : "\u56DE\u7B54\u4F7F\u7528\u4E2D\u6587\uFF0C\u4E13\u4E1A\u672F\u8BED\u9996\u6B21\u51FA\u73B0\u65F6\u4FDD\u7559\u82F1\u6587\u539F\u6587\u3002";
  const system = [
    "\u4F60\u662F\u4E00\u4F4D\u4E25\u8C28\u3001\u8010\u5FC3\u7684\u79C1\u4EBA\u6559\u5E08\uFF0C\u6B63\u5728\u4F7F\u7528\u5B66\u751F\u81EA\u5DF1\u7684\u672C\u5730\u8BFE\u7A0B\u8D44\u6599\u8FDB\u884C\u6559\u5B66\u3002",
    languageRule,
    "\u6559\u5B66\u8981\u6C42\uFF1A",
    "1. \u5148\u56DE\u7B54\u5B66\u751F\u5F53\u524D\u95EE\u9898\uFF0C\u518D\u7ED9\u5FC5\u8981\u7684\u76F4\u89C9\u3001\u51C6\u786E\u8868\u8FF0\u3001\u9002\u7528\u6761\u4EF6\u548C\u5E38\u89C1\u8BEF\u533A\uFF1B\u4E0D\u8981\u5806\u780C\u65E0\u5173\u5185\u5BB9\u3002",
    "2. \u53EA\u7528\u63D0\u4F9B\u7684\u8BFE\u7A0B\u8D44\u6599\u4F5C\u4E3A\u8BFE\u7A0B\u4F9D\u636E\uFF1B\u8D44\u6599\u6CA1\u8986\u76D6\u65F6\u53EF\u4EE5\u7ED9\u51FA\u4F60\u7684\u8865\u5145\u77E5\u8BC6\uFF0C\u4F46\u5FC5\u987B\u660E\u786E\u6807\u6CE8\u201C\u6A21\u578B\u8865\u5145\u201D\u3002",
    "3. \u5F15\u7528\u8D44\u6599\u65F6\u7528 [\u8D44\u65991]\u3001[\u8D44\u65992] \u8FD9\u6837\u7684\u7F16\u53F7\uFF0C\u7F16\u53F7\u5BF9\u5E94\u7ED9\u5B9A\u7684\u8D44\u6599\u7247\u6BB5\u3002",
    "4. \u4E0D\u7F16\u9020\u8D44\u6599\u4E2D\u6CA1\u6709\u7684\u516C\u5F0F\u3001\u9875\u7801\u6216\u7ED3\u8BBA\uFF1B\u4E0D\u786E\u5B9A\u65F6\u660E\u786E\u8BF4\u660E\u3002",
    "5. \u6BCF\u6B21\u56DE\u590D\u63A7\u5236\u5728\u5B66\u751F\u80FD\u6D88\u5316\u7684\u957F\u5EA6\uFF1B\u9700\u8981\u5C55\u5F00\u65F6\u63D0\u51FA\u4E0B\u4E00\u6B65\u3002",
    "6. \u5982\u679C\u9002\u5408\u7EC3\u4E60\uFF0C\u63D0\u51FA\u4E00\u4E2A\u5C0F\u6D3B\u52A8\uFF08\u753B\u56FE/\u4EE3\u7801/\u63A8\u5BFC/\u9009\u62E9\u9898\uFF09\u3002",
    "\u56DE\u590D\u672B\u5C3E\u9644\u52A0\u4E00\u4E2A JSON \u4EE3\u7801\u5757\uFF08\u5B66\u751F\u770B\u4E0D\u5230\uFF0C\u7528\u4E8E\u4FDD\u5B58\u6559\u5B66\u72B6\u6001\uFF09\uFF0C\u683C\u5F0F\uFF1A",
    "```json",
    '{"stage":"teaching|practice|diagnosis|transfer|review","concept":<\u6982\u5FF5\u7F16\u53F7\u6216null>,"activity":null \u6216 {"kind":"quiz|graph|derivation|code-run|open-question","title":"...","goal":"...","payload":{...},"verification":{"kind":"objective|rubric|open|none"}},"uncertainty":["..."]}',
    "```",
    "\u6D3B\u52A8 payload \u5FC5\u987B\u4E25\u683C\u7B26\u5408\u7ED9\u5B9A\u7C7B\u578B\uFF1B\u65E0\u6CD5\u7ED9\u51FA\u6D3B\u52A8\u65F6 activity \u4E3A null\u3002"
  ].join("\n");
  const materialBlock = input.material.length === 0 ? "\uFF08\u672C\u8F6E\u6CA1\u6709\u68C0\u7D22\u5230\u672C\u5730\u8D44\u6599\u7247\u6BB5\uFF1B\u82E5\u4F7F\u7528\u6A21\u578B\u77E5\u8BC6\uFF0C\u8BF7\u660E\u786E\u6807\u6CE8\u3002\uFF09" : input.material.map((item, index) => [
    `[\u8D44\u6599${index + 1}] ${item.documentTitle}`,
    `\u4F4D\u7F6E: ${JSON.stringify(item.anchor.locator)}`,
    `\u539F\u6587: ${item.anchor.excerpt}`
  ].join("\n")).join("\n\n");
  const webBlock = (input.webResults ?? []).length === 0 ? "" : [
    "\u5916\u90E8\u7F51\u9875\u67E5\u8BC1\u7ED3\u679C\uFF08\u5FC5\u987B\u6807\u6CE8\u4E3A\u201C\u5916\u90E8\u8D44\u6599\u201D\uFF0C\u5E76\u4E0E\u672C\u5730\u8D44\u6599\u533A\u5206\uFF09\uFF1A",
    ...(input.webResults ?? []).map((item, index) => `[\u5916\u90E8${index + 1}] ${item.title} \u2014 ${item.url}
\u6458\u8981: ${item.snippet}`)
  ].join("\n");
  const messages = [];
  for (const message of input.history.slice(-10)) {
    if (message.role === "student") messages.push({ role: "user", text: message.text });
    else if (message.role === "teacher") messages.push({ role: "assistant", text: message.text.length > 4e3 ? message.text.slice(0, 4e3) : message.text });
  }
  messages.push({
    role: "user",
    text: [
      `\u8BFE\u7A0B\uFF1A${input.course.title}`,
      `\u5B66\u4E60\u76EE\u6807\uFF1A${input.revision.goals.join("\uFF1B") || "\u672A\u6307\u5B9A"}`,
      input.currentConceptTitle === void 0 ? "" : `\u5F53\u524D\u6982\u5FF5\uFF1A${input.currentConceptTitle}`,
      "",
      "\u53EF\u7528\u8BFE\u7A0B\u8D44\u6599\u7247\u6BB5\uFF1A",
      materialBlock,
      ...webBlock === "" ? [] : ["", webBlock],
      "",
      `\u5B66\u751F\u7684\u95EE\u9898/\u56DE\u7B54\uFF1A${input.studentText}`
    ].filter((line) => line !== "").join("\n")
  });
  return { system, messages };
}
function parseTeachingMeta(text) {
  const warnings = [];
  const fence = /```json\s*([\s\S]*?)```\s*$/.exec(text);
  if (fence === null) return { replyText: text.trim(), warnings };
  let meta;
  try {
    meta = JSON.parse(fence[1] ?? "{}");
  } catch {
    warnings.push("\u6559\u5B66\u72B6\u6001 JSON \u89E3\u6790\u5931\u8D25\uFF0C\u5DF2\u4FDD\u7559\u8BB2\u89E3\u6587\u672C");
    return { replyText: text.slice(0, fence.index).trim(), warnings };
  }
  return { replyText: text.slice(0, fence.index).trim(), meta, warnings };
}
function normalizeActivityProposal(raw) {
  if (typeof raw !== "object" || raw === null) return void 0;
  const kind = raw.kind;
  const payloadUnknown = raw.payload ?? raw;
  if (typeof kind !== "string" || typeof payloadUnknown !== "object" || payloadUnknown === null) return void 0;
  const value = payloadUnknown;
  const verificationRaw = raw.verification;
  const verificationKind = verificationRaw?.kind === "objective" || verificationRaw?.kind === "rubric" || verificationRaw?.kind === "open" ? verificationRaw.kind : "none";
  switch (kind) {
    case "quiz": {
      const first = Array.isArray(value.questions) && typeof value.questions[0] === "object" && value.questions[0] !== null ? value.questions[0] : value;
      const questionText = typeof first.question === "string" ? first.question : typeof first.stem === "string" ? first.stem : void 0;
      const rawOptions = Array.isArray(first.options) ? first.options : [];
      if (questionText === void 0 || rawOptions.length < 2) return void 0;
      const options = [];
      rawOptions.forEach((option, index) => {
        const fallbackId = String.fromCharCode(65 + index);
        if (typeof option === "string") {
          options.push({ id: fallbackId, label: option });
          return;
        }
        if (typeof option !== "object" || option === null) return;
        const item = option;
        const label = typeof item.label === "string" ? item.label : typeof item.text === "string" ? item.text : void 0;
        if (label === void 0) return;
        options.push({ id: typeof item.id === "string" ? item.id : fallbackId, label });
      });
      if (options.length < 2) return void 0;
      const rawCorrect = Array.isArray(first.correctOptionIds) ? first.correctOptionIds : first.correctOptionId !== void 0 ? [first.correctOptionId] : first.answerIndex !== void 0 ? [first.answerIndex] : first.answer !== void 0 ? [first.answer] : [];
      const correct = rawCorrect.flatMap((entry) => {
        if (typeof entry === "number" && options[entry] !== void 0) return [options[entry].id];
        if (typeof entry !== "string") return [];
        const direct = options.find((option) => option.id === entry);
        if (direct !== void 0) return [direct.id];
        const byLetter = options.find((option) => option.id.toLowerCase() === entry.trim().toLowerCase());
        if (byLetter !== void 0) return [byLetter.id];
        const asIndex = Number(entry);
        if (Number.isInteger(asIndex) && options[asIndex] !== void 0) return [options[asIndex].id];
        return [];
      });
      if (correct.length === 0) return void 0;
      return {
        payload: {
          type: "quiz",
          question: questionText,
          markdown: typeof first.markdown === "string" ? first.markdown : void 0,
          options,
          correctOptionIds: correct,
          multiple: first.multiple === true,
          explanation: typeof first.explanation === "string" ? first.explanation : typeof first.explain === "string" ? first.explain : void 0,
          hint: typeof first.hint === "string" ? first.hint : void 0
        },
        verification: { kind: "objective", note: "\u9009\u62E9\u9898\u7531\u5BBF\u4E3B\u6309\u6B63\u786E\u9009\u9879\u5224\u5B9A" }
      };
    }
    case "graph": {
      const seriesSource = Array.isArray(value.series) ? value.series : Array.isArray(value.functions) ? value.functions : [];
      if (seriesSource.length === 0 || !Array.isArray(value.xRange) || !Array.isArray(value.yRange)) return void 0;
      const series = seriesSource.flatMap((entry, index) => {
        if (typeof entry !== "object" || entry === null) return [];
        const item = entry;
        const expr = typeof item.expr === "string" ? item.expr : typeof item.expression === "string" ? item.expression : void 0;
        if (expr === void 0) return [];
        return [{
          id: typeof item.id === "string" ? item.id : `s${index + 1}`,
          label: typeof item.label === "string" ? item.label : expr,
          expr,
          color: typeof item.color === "string" ? item.color : void 0,
          dashed: item.dashed === true
        }];
      });
      if (series.length === 0) return void 0;
      return {
        payload: {
          type: "graph",
          title: typeof value.title === "string" ? value.title : void 0,
          xLabel: typeof value.xLabel === "string" ? value.xLabel : void 0,
          yLabel: typeof value.yLabel === "string" ? value.yLabel : void 0,
          xRange: [Number(value.xRange[0] ?? -5), Number(value.xRange[1] ?? 5)],
          yRange: [Number(value.yRange[0] ?? -5), Number(value.yRange[1] ?? 5)],
          series,
          params: Array.isArray(value.params) ? value.params.flatMap((param) => {
            if (typeof param !== "object" || param === null) return [];
            const item = param;
            if (typeof item.name !== "string" || typeof item.label !== "string") return [];
            return [{
              name: item.name,
              label: item.label,
              min: Number(item.min ?? 0),
              max: Number(item.max ?? 1),
              step: Number(item.step ?? 0.1),
              value: Number(item.value ?? 0.5)
            }];
          }) : void 0,
          hint: typeof value.hint === "string" ? value.hint : void 0
        },
        verification: { kind: "none", note: "\u63A2\u7D22\u6027\u56FE\u5F62\u6D3B\u52A8\uFF0C\u4E0D\u5355\u72EC\u4F5C\u4E3A\u638C\u63E1\u8BC1\u636E" }
      };
    }
    case "derivation": {
      const stepSource = Array.isArray(value.steps) ? value.steps : [];
      if (stepSource.length === 0) return void 0;
      const steps = stepSource.flatMap((entry, index) => {
        if (typeof entry !== "object" || entry === null) return [];
        const item = entry;
        if (typeof item.latex !== "string") return [];
        return [{
          id: typeof item.id === "string" ? item.id : `step${index + 1}`,
          latex: item.latex,
          note: typeof item.note === "string" ? item.note : void 0
        }];
      });
      if (steps.length === 0) return void 0;
      return {
        payload: { type: "derivation", title: typeof value.title === "string" ? value.title : void 0, steps },
        verification: { kind: "open", note: "\u63A8\u5BFC\u7531\u5B66\u751F\u89E3\u91CA\u5E76\u7ED3\u5408 rubric \u8BC4\u4EF7" }
      };
    }
    case "code-run": {
      if (typeof value.language !== "string" || typeof value.code !== "string") return void 0;
      return {
        payload: {
          type: "code-run",
          language: value.language,
          dialect: typeof value.dialect === "string" ? value.dialect : void 0,
          code: value.code,
          editable: true,
          instructions: typeof value.instructions === "string" ? value.instructions : void 0,
          stdin: typeof value.stdin === "string" ? value.stdin : void 0,
          tests: Array.isArray(value.tests) ? normalizeCodeTests(value.tests) : void 0
        },
        verification: { kind: "objective", note: "\u7531\u771F\u5B9E\u8FD0\u884C\u7ED3\u679C\u9A8C\u8BC1" }
      };
    }
    default:
      return void 0;
  }
}
function normalizeCodeTests(raw) {
  const out = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const item = entry;
    if (typeof item.name !== "string" || typeof item.type !== "string" || item.value === void 0) continue;
    if (item.type === "exit-code") {
      const value = typeof item.value === "number" ? item.value : Number(item.value);
      if (Number.isFinite(value)) out.push({ name: item.name, type: "exit-code", value });
    } else if (item.type === "stdout-contains") {
      out.push({ name: item.name, type: "stdout-contains", value: String(item.value) });
    } else if (item.type === "stdout-equals") {
      out.push({ name: item.name, type: "stdout-equals", value: String(item.value) });
    }
  }
  return out;
}
async function runCode(body) {
  const startedAt = Date.now();
  const timeoutMs = Math.min(3e4, body.timeoutMs ?? 1e4);
  const { command, args, env } = commandFor(body.language, body.code);
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let cancelled = false;
    const cap = 256 * 1024;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      if (stdout.length < cap) stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < cap) stderr += chunk.toString("utf8");
    });
    child.on("error", (cause) => {
      stderr += String(cause);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        language: body.language,
        stdout: stdout.slice(0, cap),
        stderr: stderr.slice(0, cap),
        exitCode: code ?? void 0,
        durationMs: Date.now() - startedAt,
        timedOut,
        cancelled
      });
    });
    if (body.stdin !== void 0) child.stdin.end(body.stdin);
    else child.stdin.end();
    void cancelled;
  });
}
function commandFor(language, code) {
  if (language === "python") {
    return { command: process.env.DSH_TEACHING_PYTHON?.trim() || "python3", args: ["-I", "-c", code], env: { PYTHONIOENCODING: "utf-8" } };
  }
  if (language === "javascript") {
    return { command: process.execPath, args: ["--eval", code], env: { ELECTRON_RUN_AS_NODE: "1" } };
  }
  throw appError("capability-missing", `T01 \u6700\u5C0F\u8FD0\u884C\u5668\u6682\u4E0D\u652F\u6301 ${language}\uFF08T05 \u63A5\u5165 Scheme \u7B49\uFF09`);
}
function hitToEvidence(hit) {
  return {
    kind: "course-source",
    label: hit.anchor.label,
    anchor: hit.anchor,
    confidence: hit.anchor.confidence === "unknown" ? "unknown" : hit.anchor.confidence
  };
}
function appError(code, message, details) {
  const error = new Error(message);
  error.name = "TeachingError";
  error.appError = { code, message, ...details === void 0 ? {} : { details } };
  Object.defineProperty(error, "code", { get: () => error.appError.code, enumerable: true });
  Object.defineProperty(error, "details", { get: () => error.appError.details, enumerable: true });
  return error;
}
function createCourseRecord(title, description, language, goals) {
  const id = courseId();
  const revisionId = courseRevisionId();
  const createdAt = nowIso();
  const course = {
    id,
    title,
    description,
    subjectTags: [],
    status: "active",
    createdAt,
    updatedAt: createdAt
  };
  const revision = {
    id: revisionId,
    courseId: id,
    version: 1,
    createdAt,
    state: "draft",
    provenance: "student-edit",
    goals,
    language,
    sources: [],
    concepts: [],
    sequence: [],
    basedOn: []
  };
  return { course, revision };
}
function createSessionRecord(course, revision) {
  const id = sessionId();
  const createdAt = nowIso();
  return {
    session: {
      id,
      courseId: course.id,
      courseRevisionId: revision.id,
      title: course.title,
      createdAt,
      updatedAt: createdAt,
      status: "active",
      position: { stage: "teaching", updatedAt: createdAt },
      messageIds: [],
      coveredConceptIds: []
    },
    message: void 0
  };
}
function teacherMessage(input) {
  return {
    id: messageId(),
    sessionId: input.sessionId,
    role: "teacher",
    kind: "teacher-explanation",
    text: input.text,
    markdown: true,
    createdAt: nowIso(),
    evidenceRefs: input.evidenceRefs,
    activityIds: input.activityIds,
    usage: input.usage,
    teaching: {
      intent: "explain",
      uncertainty: input.uncertainty,
      evidenceKinds: Array.from(new Set(input.evidenceRefs.map((ref) => ref.kind)))
    }
  };
}
function studentMessage(sessionId2, text) {
  return {
    id: messageId(),
    sessionId: sessionId2,
    role: "student",
    kind: "student-question",
    text,
    createdAt: nowIso()
  };
}
function activityFromProposal(input) {
  const createdAt = nowIso();
  return {
    id: activityId(),
    kind: input.proposal.kind,
    sessionId: input.sessionId,
    courseId: input.courseId,
    conceptIds: input.proposal.conceptIds,
    goal: input.proposal.goal,
    title: input.proposal.title,
    createdAt,
    updatedAt: createdAt,
    revision: 1,
    status: "active",
    sourceRefs: input.sourceRefs,
    verification: input.proposal.verification,
    independent: input.proposal.independent,
    payload: input.proposal.payload
  };
}

// packages/dsh-plugin/src/host/routes.ts
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { readFile as readFile3, stat as stat3 } from "node:fs/promises";
import { basename as basename2 } from "node:path";
function envelope(value) {
  return new Response(JSON.stringify({ ok: true, value }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function failure(error) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
async function readJsonBody(request) {
  const text = await request.text();
  if (text.length > 2e6) throw appError("limit-exceeded", "\u8BF7\u6C42\u4F53\u8FC7\u5927");
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    throw appError("invalid-input", "\u8BF7\u6C42\u4F53\u4E0D\u662F\u6709\u6548 JSON");
  }
}
function catchToResponse(cause, logger) {
  if (typeof cause === "object" && cause !== null && typeof cause.code === "string") {
    return failure(cause);
  }
  logger("route error", { message: cause instanceof Error ? cause.message : String(cause) });
  return failure({
    code: "failed",
    message: "\u64CD\u4F5C\u5931\u8D25",
    details: { message: cause instanceof Error ? cause.message : String(cause) }
  });
}
function registerRoutes(services) {
  const { ctx, logger } = services;
  function route(operation, handler) {
    const definition = { method: operation === "bootstrap" ? "GET" : void 0 };
    void definition;
    const spec = requestSpec(operation);
    const path = apiPath(operation);
    ctx.connection.fetch.register({
      path,
      methods: [spec.method],
      requestBody: spec.method === "POST" ? "buffered" : "buffered",
      fetch: async (request) => {
        const controller = new AbortController();
        const abort = () => controller.abort();
        request.signal?.addEventListener("abort", abort, { once: true });
        try {
          await services.ready;
          const url = new URL(request.url);
          const body = spec.method === "POST" ? await readJsonBody(request) : void 0;
          return await handler({ query: url.searchParams, body, request, signal: controller.signal });
        } catch (cause) {
          return catchToResponse(cause, logger);
        } finally {
          request.signal?.removeEventListener("abort", abort);
        }
      }
    });
  }
  route("bootstrap", async () => {
    const profile = await services.profiles.get();
    const model = await services.model.info();
    const capabilities = {
      provider: model.provider,
      model: model.model,
      reasoningEffort: model.reasoningEffort,
      imageInput: model.imageInput,
      contextWindow: model.contextWindow,
      note: model.note
    };
    const warnings = [];
    if (model.imageInput === "unknown") warnings.push("\u672A\u80FD\u786E\u8BA4\u5F53\u524D\u6A21\u578B\u662F\u5426\u652F\u6301\u56FE\u7247\u8F93\u5165\uFF1B\u626B\u63CF\u4EF6\u5C06\u5C55\u793A\u539F\u6587\u4F9B\u6838\u5BF9");
    const info = {
      pluginVersion: services.pluginVersion,
      builtFor: "0.2.1-rc.5",
      host: {
        profile: services.hostFacts.profile,
        platform: services.hostFacts.platform,
        arch: services.hostFacts.arch,
        nodeVersion: services.hostFacts.nodeVersion
      },
      model: capabilities,
      dataDir: services.dataDir,
      profile,
      language: profile.language,
      features: {
        imageOcr: false,
        webSearch: services.web.available(),
        experiments: true,
        offlineExport: false
      },
      warnings
    };
    return envelope(info);
  });
  route("capabilities.get", async () => {
    const model = await services.model.info();
    return envelope({
      model: {
        provider: model.provider,
        model: model.model,
        reasoningEffort: model.reasoningEffort,
        imageInput: model.imageInput,
        contextWindow: model.contextWindow
      },
      environments: await listEnvironments(services)
    });
  });
  route("courses.list", async () => {
    const courses = await services.courses.list();
    const summaries = [];
    for (const course of courses) {
      const sources = await services.courses.listSources(course.id);
      const revisions = await services.courses.listRevisions(course.id);
      const active = revisions.find((revision) => revision.id === course.activeRevisionId);
      const sessions = await services.sessions.list(course.id);
      summaries.push({
        course,
        sourceCount: sources.length,
        conceptCount: active?.concepts.length ?? 0,
        readySourceCount: sources.filter((source) => source.status === "ready").length,
        lastSessionAt: sessions[0]?.updatedAt
      });
    }
    return envelope({ courses: summaries });
  });
  route("courses.create", async ({ body }) => {
    const input = body;
    if (typeof input?.title !== "string" || input.title.trim() === "") {
      throw appError("invalid-input", "\u8BFE\u7A0B\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A");
    }
    const language = input.language ?? (await services.profiles.get()).language;
    const { course, revision } = createCourseRecord(input.title.trim(), input.description ?? "", language, input.goals ?? []);
    const created = await services.courses.save(course);
    await services.courses.saveRevision(revision);
    const withDraft = { ...created, draftRevisionId: revision.id };
    await services.courses.save(withDraft);
    return envelope({ course: withDraft, revision });
  });
  route("courses.get", async ({ query }) => {
    const courseId2 = requireQuery(query, "courseId");
    const course = await services.courses.get(courseId2);
    if (course === void 0) throw notFoundError("\u8BFE\u7A0B");
    const revisions = await services.courses.listRevisions(courseId2);
    const active = revisions.find((revision) => revision.id === course.activeRevisionId);
    const draftRevision = revisions.find((revision) => revision.id === course.draftRevisionId);
    const sources = await services.courses.listSources(courseId2);
    const learning = await services.learning.get(courseId2) ?? emptyLearning(courseId2, active?.id ?? "");
    let draft;
    if (draftRevision !== void 0) {
      draft = await buildDraftView(services, course, draftRevision, sources);
    }
    return envelope({ course, revisions, activeRevision: active, draftRevision, draft, sources, learning });
  });
  route("courses.update", async ({ body }) => {
    const input = body;
    if (typeof input?.courseId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 courseId");
    const course = await services.courses.updateHeader(input.courseId, {
      ...input.title === void 0 ? {} : { title: input.title },
      ...input.description === void 0 ? {} : { description: input.description },
      ...input.status === void 0 ? {} : { status: input.status }
    });
    return envelope({ course });
  });
  route("courses.delete", async ({ body }) => {
    const input = body;
    if (typeof input?.courseId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 courseId");
    const sessions = await services.sessions.list(input.courseId);
    for (const session of sessions) await services.sessions.delete(session.id);
    await services.courses.delete(input.courseId);
    await services.state.remove(`learning/${input.courseId}.json`);
    return envelope({ deleted: true });
  });
  route("sources.import", async ({ body }) => {
    const input = body;
    const paths = (input?.paths ?? []).filter((path) => typeof path === "string" && path.trim() !== "");
    if (paths.length === 0) throw appError("invalid-input", "\u8BF7\u63D0\u4F9B\u81F3\u5C11\u4E00\u4E2A\u672C\u5730\u6587\u4EF6\u8DEF\u5F84");
    const courseId2 = input.courseId;
    const handle = services.tasks.start({
      kind: "source-import",
      label: `\u5BFC\u5165 ${paths.length} \u4EFD\u8D44\u6599`,
      steps: [
        ...paths.slice(0, 20).map((path, index) => ({ id: `file-${index}`, label: basename2(path) }))
      ],
      resumable: true
    }, async (context) => {
      const imported = [];
      const failures = [];
      for (const [index, path] of paths.entries()) {
        if (context.cancelled()) break;
        const stepId = `file-${index}`;
        context.step(stepId, { status: "running" });
        try {
          if (index >= 20) {
            context.progress(index / paths.length);
          }
          const result = await services.corpus.importFile(path, courseId2);
          if (courseId2 !== void 0) await services.corpus.attach(result.document.id, courseId2, true);
          imported.push(result.document);
          for (const warning of result.warnings) context.warn(`${basename2(path)}: ${warning}`);
          context.step(stepId, { status: "done", detail: `${result.units.length} \u4E2A\u5185\u5BB9\u5355\u5143` });
        } catch (cause) {
          const error = toAppError(cause);
          failures.push({ path, error });
          context.step(stepId, { status: "failed", detail: error.message });
        }
        context.progress((index + 1) / paths.length);
      }
      context.result({ imported: imported.map((document) => document.id), failures });
      if (failures.length > 0 && imported.length === 0) throw appError("failed", "\u6240\u6709\u8D44\u6599\u5BFC\u5165\u5931\u8D25", { failures });
      return { imported, failures };
    });
    return envelope({ task: handle });
  });
  route("sources.refresh", async ({ body }) => {
    const input = body;
    const documentId = input?.documentId;
    if (typeof documentId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 documentId");
    const handle = services.tasks.start({
      kind: "source-refresh",
      label: "\u68C0\u67E5\u8D44\u6599\u53D8\u5316",
      steps: [{ id: "compare", label: "\u5BF9\u6BD4\u6307\u7EB9" }, { id: "reimport", label: "\u66F4\u65B0\u89E3\u6790" }]
    }, async (context) => {
      context.step("compare", { status: "running" });
      const stored = await services.corpus.load(documentId);
      const info = await stat3(stored.document.originalPath).catch(() => void 0);
      context.step("compare", { status: "done", detail: info === void 0 ? "\u539F\u6587\u4EF6\u7F3A\u5931" : "\u5DF2\u8BFB\u53D6" });
      if (info === void 0) throw appError("not-found", "\u539F\u6587\u4EF6\u5DF2\u4E0D\u5B58\u5728\uFF0C\u65E0\u6CD5\u5237\u65B0");
      const bytes = await readFile3(stored.document.originalPath);
      const fingerprint = createHash2("sha256").update(bytes).digest("hex");
      if (fingerprint === stored.fingerprint) {
        context.result({ changed: false });
        return { changed: false };
      }
      context.step("reimport", { status: "running" });
      const reimported = await services.corpus.importFile(stored.document.originalPath, stored.document.courseIds[0]);
      await services.corpus.attach(reimported.document.id, stored.document.courseIds[0] ?? "", true);
      context.step("reimport", { status: "done", detail: `${reimported.units.length} \u4E2A\u5185\u5BB9\u5355\u5143` });
      context.result({
        changed: true,
        newRevision: reimported.document.currentRevisionId,
        affectedConcepts: "\u5F85 T02 \u57FA\u4E8E\u5F15\u7528\u7D22\u5F15\u8BA1\u7B97"
      });
      return { changed: true };
    });
    return envelope({ task: handle });
  });
  route("sources.get", async ({ query }) => {
    const documentId = requireQuery(query, "documentId");
    const offset = Number(query.get("offset") ?? "0");
    const limit = Math.min(200, Math.max(1, Number(query.get("limit") ?? "50")));
    const stored = await services.corpus.load(documentId);
    const units = stored.units.slice(offset, offset + limit);
    const revision = {
      id: stored.document.currentRevisionId ?? stored.units[0]?.revisionId ?? "",
      documentId: stored.document.id,
      fingerprint: stored.fingerprint,
      createdAt: stored.document.addedAt,
      extractor: { name: "text-v1", version: "0.1.0" },
      unitCount: stored.units.length,
      issueCount: stored.warnings.length,
      status: stored.document.status === "ready" ? "ready" : "partial",
      units,
      issues: stored.warnings.map((message) => ({ code: "unsupported-content", severity: "info", message, reviewRequired: false }))
    };
    const view = {
      document: stored.document,
      revision,
      issues: stored.warnings.map((message) => ({ code: "unsupported-content", severity: "info", message, reviewRequired: false })),
      totalUnits: stored.units.length
    };
    return envelope(view);
  });
  route("courseDraft.generate", async ({ body }) => {
    const input = body;
    if (typeof input?.courseId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 courseId");
    const course = await services.courses.get(input.courseId);
    if (course === void 0) throw notFoundError("\u8BFE\u7A0B");
    const handle = services.tasks.start({
      kind: "course-draft",
      label: "\u5206\u6790\u8D44\u6599\u5E76\u751F\u6210\u8BFE\u7A0B\u8349\u6848",
      steps: [
        { id: "read", label: "\u8BFB\u53D6\u5DF2\u5C31\u7EEA\u8D44\u6599" },
        { id: "structure", label: "\u63D0\u53D6\u6982\u5FF5\u4E0E\u987A\u5E8F" },
        { id: "save", label: "\u4FDD\u5B58\u8349\u6848" }
      ]
    }, async (context) => {
      context.step("read", { status: "running" });
      const documents = await services.courses.listSources(course.id);
      if (documents.length === 0) throw appError("invalid-input", "\u8BFE\u7A0B\u8FD8\u6CA1\u6709\u8D44\u6599\uFF0C\u8BF7\u5148\u5BFC\u5165\u8D44\u6599");
      const loaded = [];
      for (const document of documents) {
        if (document.status === "failed") continue;
        loaded.push({ document, units: (await services.corpus.load(document.id)).units });
      }
      context.step("read", { status: "done", detail: `${loaded.length} \u4EFD\u8D44\u6599` });
      context.step("structure", { status: "running" });
      const drafted = draftConceptsFromSources(loaded);
      context.step("structure", { status: "done", detail: `${drafted.concepts.length} \u4E2A\u5019\u9009\u6982\u5FF5` });
      context.step("save", { status: "running" });
      const previous = await services.courses.listRevisions(course.id);
      const nextVersion = (previous.at(-1)?.version ?? 0) + 1;
      const revision = {
        id: courseRevisionId(),
        courseId: course.id,
        version: nextVersion,
        createdAt: nowIso(),
        state: "draft",
        provenance: "ai-draft",
        goals: previous.find((item) => item.id === course.activeRevisionId)?.goals ?? [],
        language: course.description !== "" ? (await services.profiles.get()).language : (await services.profiles.get()).language,
        sources: loaded.map((item) => ({ sourceId: item.document.id, role: "textbook" })),
        concepts: drafted.concepts,
        sequence: drafted.concepts.map((concept) => concept.id),
        basedOn: loaded.map((item) => ({ sourceId: item.document.id, revisionId: item.document.currentRevisionId ?? "" })),
        changeSummary: `\u57FA\u4E8E ${loaded.length} \u4EFD\u8D44\u6599\u751F\u6210 ${drafted.concepts.length} \u4E2A\u6982\u5FF5`
      };
      await services.courses.saveRevision(revision);
      await services.courses.save({ ...course, draftRevisionId: revision.id });
      context.step("save", { status: "done" });
      context.result({ revisionId: revision.id, conceptCount: revision.concepts.length, warnings: drafted.warnings });
      return { revisionId: revision.id };
    });
    return envelope({ task: handle });
  });
  route("courseDraft.get", async ({ query }) => {
    const courseId2 = requireQuery(query, "courseId");
    const course = await services.courses.get(courseId2);
    if (course === void 0) throw notFoundError("\u8BFE\u7A0B");
    const draft = await services.courses.getDraftRevision(course);
    if (draft === void 0) return envelope({});
    const sources = await services.courses.listSources(courseId2);
    return envelope({ draft: await buildDraftView(services, course, draft, sources) });
  });
  route("courseDraft.confirm", async ({ body }) => {
    const input = body;
    if (typeof input?.courseId !== "string" || typeof input?.revisionId !== "string") {
      throw appError("invalid-input", "\u7F3A\u5C11 courseId \u6216 revisionId");
    }
    const course = await services.courses.get(input.courseId);
    if (course === void 0) throw notFoundError("\u8BFE\u7A0B");
    const draft = await services.courses.getRevision(input.courseId, input.revisionId);
    if (draft === void 0) throw notFoundError("\u8BFE\u7A0B\u8349\u6848");
    const edits = input.edits;
    let concepts = draft.concepts;
    if (edits?.removeConceptIds !== void 0) {
      const remove = new Set(edits.removeConceptIds);
      concepts = concepts.filter((concept) => !remove.has(concept.id));
    }
    if (edits?.conceptTitles !== void 0) {
      concepts = concepts.map((concept) => edits.conceptTitles?.[concept.id] === void 0 ? concept : { ...concept, title: edits.conceptTitles[concept.id] ?? concept.title });
    }
    let sequence = draft.sequence.filter((id) => concepts.some((concept) => concept.id === id));
    if (edits?.sequence !== void 0) {
      const requested = edits.sequence.filter((id) => concepts.some((concept) => concept.id === id));
      sequence = [...requested, ...concepts.map((concept) => concept.id).filter((id) => !requested.includes(id))];
    }
    const confirmed = {
      ...draft,
      state: "confirmed",
      confirmedAt: nowIso(),
      provenance: "student-edit",
      concepts,
      sequence,
      goals: edits?.goals ?? draft.goals
    };
    await services.courses.saveRevision(confirmed);
    if (course.activeRevisionId !== void 0 && course.activeRevisionId !== confirmed.id) {
      const previous = await services.courses.getRevision(course.id, course.activeRevisionId);
      if (previous !== void 0) await services.courses.saveRevision({ ...previous, state: "superseded" });
    }
    const updatedCourse = {
      ...course,
      status: "active",
      activeRevisionId: confirmed.id,
      draftRevisionId: void 0,
      updatedAt: nowIso()
    };
    await services.courses.save(updatedCourse);
    return envelope({ course: updatedCourse, revision: confirmed });
  });
  route("sessions.list", async ({ query }) => {
    const courseId2 = query.get("courseId") ?? void 0;
    const sessions = await services.sessions.list(courseId2);
    const summaries = [];
    for (const session of sessions) {
      const messages = await services.sessions.messages(session.id);
      summaries.push({
        id: session.id,
        courseId: session.courseId,
        title: session.title,
        updatedAt: session.updatedAt,
        status: session.status,
        stage: session.position.stage,
        messageCount: messages.length
      });
    }
    return envelope({ sessions: summaries });
  });
  route("sessions.create", async ({ body }) => {
    const input = body;
    if (typeof input?.courseId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 courseId");
    const course = await services.courses.get(input.courseId);
    if (course === void 0) throw notFoundError("\u8BFE\u7A0B");
    const revision = await services.courses.getActiveRevision(course);
    if (revision === void 0) {
      return failure({
        code: "needs-confirmation",
        message: "\u8BFE\u7A0B\u7ED3\u6784\u5C1A\u672A\u786E\u8BA4\u3002\u8BF7\u5148\u786E\u8BA4 AI \u751F\u6210\u7684\u8BFE\u7A0B\u8349\u6848\uFF0C\u6216\u9009\u62E9\u968F\u95EE\u968F\u5B66\u3002",
        details: { courseId: course.id, draftRevisionId: course.draftRevisionId }
      });
    }
    const { session } = createSessionRecord(course, revision);
    const titled = { ...session, ...input.title === void 0 ? {} : { title: input.title } };
    await services.sessions.save(titled);
    return envelope({ session: titled });
  });
  route("sessions.get", async ({ query }) => {
    const sessionId2 = requireQuery(query, "sessionId");
    const session = await services.sessions.get(sessionId2);
    if (session === void 0) throw notFoundError("\u5B66\u4E60\u4F1A\u8BDD");
    const course = await services.courses.get(session.courseId);
    const revision = await services.courses.getRevision(session.courseId, session.courseRevisionId);
    if (course === void 0 || revision === void 0) throw notFoundError("\u8BFE\u7A0B\u7ED3\u6784");
    const messages = await services.sessions.messages(session.id);
    const activities = await services.sessions.listActivities(session.id);
    const states = [];
    for (const activity of activities) {
      const state = await services.sessions.getActivityState(activity.id);
      if (state !== void 0) states.push(state);
    }
    const record = await services.learning.get(session.courseId);
    const view = {
      session,
      messages,
      activities,
      states,
      course,
      courseRevision: revision,
      mastery: record?.mastery ?? [],
      review: record?.review ?? []
    };
    return envelope(view);
  });
  route("sessions.position", async ({ body }) => {
    const input = body;
    if (typeof input?.sessionId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 sessionId");
    const session = await services.sessions.get(input.sessionId);
    if (session === void 0) throw notFoundError("\u5B66\u4E60\u4F1A\u8BDD");
    const position = {
      stage: input.stage ?? session.position.stage,
      conceptId: input.conceptId ?? session.position.conceptId,
      activityId: input.activityId === null ? void 0 : input.activityId ?? session.position.activityId,
      note: input.note ?? session.position.note,
      updatedAt: nowIso()
    };
    const next = await services.sessions.save({ ...session, position });
    return envelope({ session: next });
  });
  const activeChats = /* @__PURE__ */ new Map();
  route("chat.send", async ({ body }) => {
    const input = body;
    if (typeof input?.sessionId !== "string" || typeof input?.text !== "string" || input.text.trim() === "") {
      throw appError("invalid-input", "\u7F3A\u5C11 sessionId \u6216\u6D88\u606F\u5185\u5BB9");
    }
    const session = await services.sessions.get(input.sessionId);
    if (session === void 0) throw notFoundError("\u5B66\u4E60\u4F1A\u8BDD");
    const course = await services.courses.get(session.courseId);
    const revision = await services.courses.getRevision(session.courseId, session.courseRevisionId);
    if (course === void 0 || revision === void 0) throw notFoundError("\u8BFE\u7A0B\u7ED3\u6784");
    const profile = await services.profiles.get();
    const history = await services.sessions.messages(session.id);
    const student = studentMessage(session.id, input.text.trim());
    await services.sessions.appendMessage(student);
    await services.sessions.save({ ...session, messageIds: [...session.messageIds, student.id], updatedAt: nowIso() });
    const controller = new AbortController();
    activeChats.set(session.id, controller);
    const currentConcept = session.position.conceptId === void 0 ? void 0 : revision.concepts.find((concept) => concept.id === session.position.conceptId);
    const stream = new ReadableStream({
      start: async (sink) => {
        const encoder = new TextEncoder();
        const send = (event) => {
          sink.enqueue(encoder.encode(`data: ${JSON.stringify(event)}

`));
        };
        try {
          send({ type: "start", studentMessage: student });
          send({ type: "progress", label: "\u68C0\u7D22\u8BFE\u7A0B\u8D44\u6599" });
          const hits = await services.corpus.search(input.text, [course.id], 6);
          const material = hits.map((hit) => ({ anchor: hit.anchor, documentTitle: hit.anchor.label.split(" \xB7 ")[0] ?? hit.anchor.label }));
          const evidenceRefs = hits.map(hitToEvidence);
          let webResults = [];
          let webNote;
          if (wantsWebLookup(input.text)) {
            if (!services.web.available()) {
              webNote = "\u672C\u8F6E\u8BF7\u6C42\u6D89\u53CA\u8054\u7F51\u67E5\u8BC1\uFF0C\u4F46\u5F53\u524D Harness \u914D\u7F6E\u6CA1\u6709\u53EF\u7528\u7684\u8054\u7F51\u80FD\u529B\uFF1B\u4EE5\u4E0B\u56DE\u7B54\u4EC5\u57FA\u4E8E\u672C\u5730\u8D44\u6599\u4E0E\u6A21\u578B\u77E5\u8BC6\u3002";
            } else {
              send({ type: "progress", label: "\u8054\u7F51\u67E5\u8BC1\uFF08\u6309\u9700\uFF09" });
              const searched = await services.web.search(toSearchQuery(input.text), { maxResults: 4, signal: controller.signal });
              if (searched.ok) {
                webResults = [...searched.value];
                for (const hit of searched.value) {
                  evidenceRefs.push({ kind: "external-web", label: hit.title, url: hit.url, note: hit.snippet.slice(0, 240) });
                }
                if (searched.value.length === 0) webNote = "\u8054\u7F51\u67E5\u8BE2\u6CA1\u6709\u8FD4\u56DE\u53EF\u7528\u6765\u6E90\uFF0C\u56DE\u7B54\u672A\u5F15\u7528\u5916\u90E8\u8D44\u6599\u3002";
              } else {
                webNote = `\u8054\u7F51\u67E5\u8BC1\u672A\u5B8C\u6210\uFF08${searched.error.code}\uFF09\uFF1A${searched.error.message}`;
              }
            }
          }
          if (hits.length === 0) {
            evidenceRefs.push({ kind: "model-knowledge", label: "\u6A21\u578B\u8865\u5145", note: "\u672C\u8F6E\u672A\u5728\u672C\u5730\u8D44\u6599\u4E2D\u68C0\u7D22\u5230\u76F8\u5173\u7247\u6BB5" });
          }
          send({ type: "evidence", refs: evidenceRefs });
          send({ type: "progress", label: "\u751F\u6210\u8BB2\u89E3" });
          const prompt = buildTeachingMessages({
            course,
            revision,
            profile,
            history,
            material,
            webResults,
            studentText: input.text.trim(),
            currentConceptTitle: currentConcept?.title
          });
          let answer = "";
          let modelFailure;
          let usage;
          for await (const event of services.model.stream({
            system: prompt.system,
            messages: prompt.messages,
            maxTokens: 3e3,
            sessionId: session.id,
            purpose: "chat",
            language: profile.language
          }, controller.signal)) {
            if (event.type === "text") {
              answer += event.text;
              send({ type: "delta", text: event.text });
            } else if (event.type === "usage") {
              usage = event.usage;
            } else if (event.type === "error") {
              modelFailure = { code: event.error.code === "cancelled" ? "cancelled" : "failed", message: event.error.message };
            }
          }
          const parsed = parseTeachingMeta(answer);
          for (const warning of parsed.warnings) {
            send({ type: "progress", label: warning });
          }
          const activities = [];
          let limitations = [];
          if (parsed.meta?.activity !== void 0 && parsed.meta.activity !== null) {
            const proposal = activityProposalFromMeta(parsed.meta.activity, revision, hits);
            if (proposal === void 0) {
              services.logger("activity proposal invalid", { raw: JSON.stringify(parsed.meta.activity).slice(0, 1200) });
              limitations = [...limitations, "\u6A21\u578B\u63D0\u51FA\u7684\u6D3B\u52A8\u7ED3\u6784\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u7701\u7565"];
            } else {
              const activity = activityFromProposal({
                proposal,
                sessionId: session.id,
                courseId: course.id,
                sourceRefs: hits.slice(0, 3).map((hit) => hit.anchor)
              });
              await services.sessions.saveActivity(activity);
              activities.push(activity);
              send({ type: "activity", activity });
            }
          }
          if (activities.length === 0) {
            const fallback = await proposeFallbackActivity(services, {
              course,
              revision,
              material,
              answerText: parsed.replyText,
              signal: controller.signal
            });
            if (fallback !== void 0) {
              const activity = activityFromProposal({
                proposal: fallback,
                sessionId: session.id,
                courseId: course.id,
                sourceRefs: hits.slice(0, 3).map((hit) => hit.anchor)
              });
              await services.sessions.saveActivity(activity);
              activities.push(activity);
              send({ type: "activity", activity });
            }
          }
          const uncertainty = [
            ...(parsed.meta?.uncertainty ?? []).filter((item) => typeof item === "string"),
            ...limitations,
            ...webNote === void 0 ? [] : [webNote]
          ];
          const teacher = teacherMessage({
            sessionId: session.id,
            text: parsed.replyText,
            evidenceRefs,
            activityIds: activities.map((activity) => activity.id),
            usage,
            uncertainty
          });
          await services.sessions.appendMessage(teacher);
          const latest = await services.sessions.get(session.id) ?? session;
          const nextPosition = {
            stage: parsed.meta?.stage ?? latest.position.stage,
            conceptId: latest.position.conceptId,
            activityId: activities[0]?.id ?? latest.position.activityId,
            updatedAt: nowIso()
          };
          await services.sessions.save({
            ...latest,
            messageIds: [...latest.messageIds, teacher.id],
            position: nextPosition,
            updatedAt: nowIso()
          });
          send({ type: "position", stage: nextPosition.stage, conceptId: nextPosition.conceptId });
          if (modelFailure !== void 0) {
            send({ type: "error", error: modelFailure });
          } else {
            send({ type: "done", message: teacher });
          }
        } catch (cause) {
          const error = toAppError(cause);
          services.logger("chat turn failed", { sessionId: session.id, code: error.code });
          try {
            send({ type: "error", error });
          } catch {
          }
        } finally {
          activeChats.delete(session.id);
          sink.close();
        }
      },
      cancel: () => {
        controller.abort();
        activeChats.delete(session.id);
      }
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive" }
    });
  });
  route("chat.cancel", async ({ body }) => {
    const input = body;
    const controller = activeChats.get(input?.sessionId);
    if (controller === void 0) return envelope({ cancelled: false });
    controller.abort();
    activeChats.delete(input.sessionId);
    return envelope({ cancelled: true });
  });
  route("activity.get", async ({ query }) => {
    const activityId2 = requireQuery(query, "activityId");
    const activity = await services.sessions.getActivity(activityId2);
    if (activity === void 0) throw notFoundError("\u6D3B\u52A8");
    return envelope({ activity, state: await services.sessions.getActivityState(activityId2) });
  });
  route("activity.patch", async ({ body }) => {
    const input = body;
    if (typeof input?.activityId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 activityId");
    const activity = await services.sessions.getActivity(input.activityId);
    if (activity === void 0) throw notFoundError("\u6D3B\u52A8");
    if (activity.revision !== input.expectedRevision) {
      return failure({
        code: "conflict",
        message: "\u6D3B\u52A8\u5DF2\u88AB\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5",
        details: { expected: input.expectedRevision, actual: activity.revision }
      });
    }
    const updated = {
      ...activity,
      revision: activity.revision + 1,
      payload: input.payload,
      updatedAt: nowIso(),
      revisionHistory: [
        ...activity.revisionHistory ?? [],
        { revision: activity.revision, createdAt: activity.updatedAt, payload: activity.payload, createdBy: "student", note: input.note }
      ]
    };
    await services.sessions.saveActivity(updated);
    return envelope({ activity: updated });
  });
  route("activity.state", async ({ body }) => {
    const input = body;
    if (typeof input?.activityId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 activityId");
    const state = {
      activityId: input.activityId,
      activityRevision: input.activityRevision,
      params: input.params,
      code: input.code,
      revealedStepIds: input.revealedStepIds,
      notes: input.notes,
      updatedAt: nowIso()
    };
    return envelope({ state: await services.sessions.saveActivityState(state) });
  });
  route("activity.run", async ({ body }) => {
    const input = body;
    if (typeof input?.activityId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 activityId");
    const activity = await services.sessions.getActivity(input.activityId);
    if (activity === void 0) throw notFoundError("\u6D3B\u52A8");
    if (activity.payload.type !== "code-run") {
      return failure({ code: "invalid-input", message: "\u8BE5\u6D3B\u52A8\u4E0D\u662F\u4EE3\u7801\u5B9E\u9A8C" });
    }
    const state = await services.sessions.getActivityState(activity.id);
    const code = input.code ?? state?.code ?? activity.payload.code;
    const run = await executeCodeRun(services, {
      sessionId: activity.sessionId,
      courseId: activity.courseId,
      activityId: activity.id,
      activityRevision: activity.revision,
      language: activity.payload.language,
      dialect: activity.payload.dialect,
      code,
      stdin: input.stdin ?? activity.payload.stdin,
      checks: activity.payload.tests
    });
    return envelope({ run, validation: run.validation });
  });
  route("experiments.run", async ({ body }) => {
    const input = body;
    if (typeof input?.language !== "string" || typeof input?.code !== "string") {
      throw appError("invalid-input", "\u7F3A\u5C11\u8BED\u8A00\u6216\u4EE3\u7801");
    }
    const run = await executeCodeRun(services, {
      sessionId: input.sessionId,
      courseId: input.courseId,
      activityId: input.activityId,
      activityRevision: input.activityRevision,
      language: input.language,
      dialect: input.dialect,
      code: input.code,
      stdin: input.stdin,
      checks: input.checks
    });
    return envelope({ run });
  });
  route("experiments.cancel", async () => failure({ code: "capability-missing", message: "\u8FD0\u884C\u53D6\u6D88\u5C06\u5728 T05 \u5B9E\u9A8C\u9002\u914D\u5668\u63A5\u5165\u540E\u63D0\u4F9B" }));
  route("attempts.submit", async ({ body }) => {
    const input = body;
    if (typeof input?.sessionId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 sessionId");
    const session = await services.sessions.get(input.sessionId);
    if (session === void 0) throw notFoundError("\u5B66\u4E60\u4F1A\u8BDD");
    const activity = input.activityId === void 0 ? void 0 : await services.sessions.getActivity(input.activityId);
    const independence = classifyIndependence(input);
    const validation = activity === void 0 ? { kind: "unverified", confidence: "unknown", notes: ["\u81EA\u7531\u5BF9\u8BDD\u56DE\u7B54\u672A\u8FDB\u884C\u5BA2\u89C2\u9A8C\u8BC1"] } : await validateAttempt(services, activity, input);
    const attempt = {
      id: `try-${randomUUID2().slice(0, 12)}`,
      sessionId: session.id,
      courseId: session.courseId,
      courseRevisionId: session.courseRevisionId,
      conceptIds: activity?.conceptIds ?? (session.position.conceptId === void 0 ? [] : [session.position.conceptId]),
      activityId: activity?.id,
      activityRevision: activity?.revision,
      prompt: input.prompt,
      answerText: input.answerText,
      selectedOptionIds: input.selectedOptionIds,
      helpExposure: input.helpLevel === "full-answer" ? { level: "full-answer", answer: "" } : { level: input.helpLevel, hints: input.hintsSeen ?? [] },
      independence,
      selfReport: input.selfReport,
      runId: input.runId,
      validation,
      createdAt: nowIso()
    };
    const record = await services.learning.get(session.courseId) ?? emptyLearning(session.courseId, session.courseRevisionId);
    const updated = applyAttemptToRecord(record, attempt, activity);
    const saved = await services.learning.save(updated);
    const mastery = saved.mastery.filter((item) => attempt.conceptIds.includes(item.conceptId));
    const review = saved.review.filter((item) => attempt.conceptIds.includes(item.conceptId));
    const outcome = {
      attempt,
      validation,
      mastery,
      review,
      ...independence === "answer-shown" || independence === "skipped" || independence === "assisted" ? { independenceNote: "\u672C\u6B21\u5C1D\u8BD5\u4E0D\u4F5C\u4E3A\u72EC\u7ACB\u638C\u63E1\u8BC1\u636E" } : {}
    };
    return envelope(outcome);
  });
  route("attempts.list", async ({ query }) => {
    const sessionId2 = query.get("sessionId") ?? void 0;
    const courseId2 = query.get("courseId") ?? void 0;
    const records = [];
    if (courseId2 !== void 0) {
      const record = await services.learning.get(courseId2);
      records.push(...record?.attempts ?? []);
    } else if (sessionId2 !== void 0) {
      const session = await services.sessions.get(sessionId2);
      if (session === void 0) throw notFoundError("\u5B66\u4E60\u4F1A\u8BDD");
      const record = await services.learning.get(session.courseId);
      records.push(...record?.attempts.filter((attempt) => attempt.sessionId === sessionId2) ?? []);
    }
    return envelope({ attempts: records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  });
  route("mastery.list", async ({ query }) => {
    const courseId2 = requireQuery(query, "courseId");
    const record = await services.learning.get(courseId2);
    return envelope({ mastery: record?.mastery ?? [] });
  });
  route("mastery.dispute", async ({ body }) => {
    const input = body;
    if (typeof input?.courseId !== "string" || typeof input?.conceptId !== "string" || typeof input?.reason !== "string") {
      throw appError("invalid-input", "\u7F3A\u5C11\u8BFE\u7A0B\u3001\u6982\u5FF5\u6216\u5F02\u8BAE\u7406\u7531");
    }
    const record = await services.learning.get(input.courseId);
    if (record === void 0) throw notFoundError("\u5B66\u60C5\u8BB0\u5F55");
    const index = record.mastery.findIndex((item) => item.conceptId === input.conceptId);
    if (index === -1) throw notFoundError("\u638C\u63E1\u8BB0\u5F55");
    const current = record.mastery[index];
    const disputed = {
      ...current,
      disputes: [...current.disputes, {
        id: `dispute-${randomUUID2().slice(0, 8)}`,
        reason: input.reason,
        createdAt: nowIso(),
        status: "open"
      }],
      updatedAt: nowIso()
    };
    const mastery = record.mastery.map((item, i) => i === index ? disputed : item);
    await services.learning.save({ ...record, mastery });
    return envelope({ mastery: disputed });
  });
  route("mastery.recheck", async ({ body }) => {
    const input = body;
    if (typeof input?.courseId !== "string" || typeof input?.conceptId !== "string") {
      throw appError("invalid-input", "\u7F3A\u5C11\u8BFE\u7A0B\u6216\u6982\u5FF5");
    }
    const record = await services.learning.get(input.courseId);
    if (record === void 0) throw notFoundError("\u5B66\u60C5\u8BB0\u5F55");
    const index = record.mastery.findIndex((item) => item.conceptId === input.conceptId);
    if (index === -1) throw notFoundError("\u638C\u63E1\u8BB0\u5F55");
    const current = record.mastery[index];
    const recheck = {
      ...current,
      disputes: current.disputes.map((dispute) => dispute.status === "open" ? { ...dispute, status: "recheck-due" } : dispute),
      uncovered: Array.from(/* @__PURE__ */ new Set([...current.uncovered, "\u91CD\u65B0\u68C0\u9A8C\uFF1A\u6761\u4EF6/\u53CD\u4F8B\u4E0E\u8FC1\u79FB\u8868\u73B0"])),
      updatedAt: nowIso()
    };
    const mastery = record.mastery.map((item, i) => i === index ? recheck : item);
    await services.learning.save({ ...record, mastery });
    return envelope({ mastery: recheck });
  });
  route("review.list", async ({ query }) => {
    const courseId2 = requireQuery(query, "courseId");
    const record = await services.learning.get(courseId2);
    return envelope({ review: record?.review ?? [] });
  });
  route("profile.get", async () => envelope({ profile: await services.profiles.get() }));
  route("profile.set", async ({ body }) => {
    const input = body;
    if (input?.patch === void 0 || typeof input.patch !== "object") throw appError("invalid-input", "\u7F3A\u5C11 profile patch");
    return envelope({ profile: await services.profiles.patch(input.patch) });
  });
  route("environments.list", async () => envelope(await listEnvironments(services)));
  route("environments.prepare", async () => failure({
    code: "capability-missing",
    message: "\u73AF\u5883\u81EA\u52A8\u914D\u7F6E\u5728 T06 \u63A5\u5165\uFF1B\u5F53\u524D Python/JavaScript \u53EF\u76F4\u63A5\u8FD0\u884C"
  }));
  route("tasks.get", async ({ query }) => {
    const taskId2 = requireQuery(query, "taskId");
    const task = await services.tasks.get(taskId2);
    if (task === void 0) throw notFoundError("\u4EFB\u52A1");
    return envelope({ task });
  });
  route("tasks.cancel", async ({ body }) => {
    const input = body;
    if (typeof input?.taskId !== "string") throw appError("invalid-input", "\u7F3A\u5C11 taskId");
    const result = await services.tasks.cancel(input.taskId).catch((cause) => {
      throw toAppError(cause);
    });
    return envelope({ snapshot: result.snapshot });
  });
  route("tasks.list", async () => envelope({ tasks: await services.tasks.list() }));
  for (const operation of [
    "portability.export",
    "portability.backup",
    "portability.inspect",
    "portability.restore",
    "records.export",
    "records.delete",
    "records.reset"
  ]) {
    route(operation, async () => failure({
      code: "capability-missing",
      message: "\u5BFC\u51FA\u3001\u5907\u4EFD\u4E0E\u8BB0\u5F55\u7BA1\u7406\u5728 T07 \u63A5\u5165"
    }));
  }
}
function requestSpec(operation) {
  const getOperations = /* @__PURE__ */ new Set([
    "bootstrap",
    "courses.list",
    "courses.get",
    "courseDraft.get",
    "sources.get",
    "sessions.list",
    "sessions.get",
    "activity.get",
    "attempts.list",
    "mastery.list",
    "review.list",
    "profile.get",
    "environments.list",
    "tasks.get",
    "tasks.list",
    "capabilities.get"
  ]);
  return { method: getOperations.has(operation) ? "GET" : "POST" };
}
function requireQuery(query, name2) {
  const value = query.get(name2);
  if (value === null || value === "") throw appError("invalid-input", `\u7F3A\u5C11\u53C2\u6570 ${name2}`);
  return value;
}
async function buildDraftView(services, course, revision, sources) {
  const coverage = [];
  const warnings = [];
  for (const source of sources) {
    const stored = await services.corpus.load(source.id).catch(() => void 0);
    coverage.push({
      sourceId: source.id,
      title: source.title,
      status: source.status,
      usedUnits: stored?.units.length ?? 0,
      issues: stored?.warnings.length ?? 0
    });
    for (const warning of stored?.warnings ?? []) warnings.push(`${source.title}: ${warning}`);
  }
  return { course, revision, coverage, warnings };
}
function activityProposalFromMeta(raw, revision, hits) {
  const normalized = normalizeActivityProposal(raw);
  if (normalized === void 0) return void 0;
  const meta = raw;
  const concept = revision.concepts[0];
  return {
    kind: meta.kind ?? normalized.payload.type,
    title: typeof meta.title === "string" && meta.title !== "" ? meta.title : "\u8BFE\u5802\u6D3B\u52A8",
    goal: typeof meta.goal === "string" && meta.goal !== "" ? meta.goal : concept?.summary ?? "\u68C0\u9A8C\u5BF9\u5F53\u524D\u6982\u5FF5\u7684\u7406\u89E3",
    payload: normalized.payload,
    verification: normalized.verification,
    sourceRefs: hits.slice(0, 2).map((hit) => hit.anchor),
    conceptIds: concept === void 0 ? [] : [concept.id],
    independent: normalized.verification.kind === "objective"
  };
}
function classifyIndependence(input) {
  if (input.answerText.trim() === "") return "skipped";
  if (input.helpLevel === "full-answer" || input.answerRevealed) return "answer-shown";
  if (input.helpLevel >= 2) return "assisted";
  return "independent";
}
async function executeCodeRun(services, input) {
  const runId = `run-${randomUUID2().slice(0, 12)}`;
  const startedAt = nowIso();
  const result = await runCode({ language: input.language, code: input.code, stdin: input.stdin });
  const checks = (input.checks ?? []).map((check) => {
    let status = "not-run";
    if (check.type === "stdout-contains") status = result.stdout.includes(String(check.value)) ? "pass" : "fail";
    else if (check.type === "stdout-equals") status = result.stdout.trim() === String(check.value).trim() ? "pass" : "fail";
    else if (check.type === "exit-code") status = result.exitCode === Number(check.value) ? "pass" : "fail";
    return { ...check, status };
  });
  const run = {
    id: runId,
    sessionId: input.sessionId,
    courseId: input.courseId,
    activityId: input.activityId,
    activityRevision: input.activityRevision,
    environmentId: `env-${input.language}`,
    language: input.language,
    dialect: input.dialect,
    code: input.code,
    stdin: input.stdin,
    startedAt,
    endedAt: nowIso(),
    status: result.timedOut ? "timed-out" : result.exitCode === 0 ? "succeeded" : "failed",
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    checks,
    verification: checks.length === 0 ? "exploratory" : checks.every((check) => check.status === "pass") ? "objective" : "objective",
    limits: { timeoutMs: 1e4 }
  };
  await services.state.writeJson(runFile(services.state.dataDir, run.id), run);
  const validation = checks.length === 0 ? void 0 : {
    kind: "objective",
    passed: checks.every((check) => check.status === "pass"),
    checks: checks.map((check) => ({ name: check.name, status: check.status === "pass" ? "pass" : "fail" })),
    evidence: [result.stdout.slice(0, 400)],
    assessedBy: "objective-runner",
    confidence: "high"
  };
  return { ...run, validation };
}
async function validateAttempt(services, activity, input) {
  if (activity.payload.type === "quiz") {
    const selected = (input.selectedOptionIds ?? []).slice().sort();
    const correct = activity.payload.correctOptionIds.slice().sort();
    const passed = selected.length === correct.length && selected.every((id, index) => id === correct[index]);
    return {
      kind: "quiz",
      passed,
      checks: activity.payload.options.map((option) => ({
        name: option.label,
        status: selected.includes(option.id) === correct.includes(option.id) ? "pass" : "fail"
      })),
      notes: passed ? [activity.payload.explanation ?? "\u56DE\u7B54\u6B63\u786E"] : ["\u56DE\u7B54\u4E0E\u6B63\u786E\u9009\u9879\u4E0D\u4E00\u81F4"],
      assessedBy: "objective-runner",
      confidence: "high"
    };
  }
  if (activity.payload.type === "code-run" && input.runId !== void 0) {
    const run = await services.state.readJson(runFile(services.state.dataDir, input.runId));
    if (run !== void 0) {
      const passed = run.checks !== void 0 && run.checks.length > 0 ? run.checks.every((check) => check.status === "pass") : run.status === "succeeded";
      return {
        kind: "objective",
        passed,
        checks: (run.checks ?? []).map((check) => ({ name: check.name, status: check.status })),
        evidence: [run.stdout.slice(0, 400)],
        assessedBy: "objective-runner",
        confidence: "high"
      };
    }
  }
  return {
    kind: "unverified",
    confidence: "unknown",
    notes: ["\u8BE5\u56DE\u7B54\u5C1A\u672A\u5BA2\u89C2\u9A8C\u8BC1\uFF1B\u6A21\u578B/rubric \u8BC4\u4EF7\u7531 T04 \u63A5\u5165"],
    assessedBy: "none"
  };
}
function applyAttemptToRecord(record, attempt, _activity) {
  const attempts = [...record.attempts, attempt];
  const mastery = [...record.mastery];
  const review = [...record.review];
  const passed = attempt.validation?.passed === true;
  for (const conceptId2 of attempt.conceptIds) {
    const index = mastery.findIndex((item) => item.conceptId === conceptId2);
    const current = index === -1 ? void 0 : mastery[index];
    const independent = attempt.independence === "independent";
    const dimensions = {
      explain: current?.dimensions.explain ?? 0,
      conditions: current?.dimensions.conditions ?? 0,
      variants: (current?.dimensions.variants ?? 0) + (independent && passed ? 1 : 0),
      transfer: current?.dimensions.transfer ?? 0
    };
    const level = attempt.independence === "skipped" ? current?.level ?? "exposed" : independent && passed ? dimensions.variants >= 2 ? "checked" : "practiced" : current?.level === "unseen" || current === void 0 ? "exposed" : current.level;
    const basis = [...current?.basis ?? []];
    if (independent && passed) basis.push(`\u72EC\u7ACB\u5B8C\u6210\u6D3B\u52A8\u53D6\u5F97\u6B63\u786E\u7ED3\u679C\uFF08${attempt.id}\uFF09`);
    else if (attempt.independence === "assisted") basis.push(`\u5728\u63D0\u793A\u4E0B\u5B8C\u6210\uFF0C\u4E0D\u8BA1\u72EC\u7ACB\u8BC1\u636E\uFF08${attempt.id}\uFF09`);
    else if (attempt.independence === "answer-shown") basis.push(`\u5DF2\u67E5\u770B\u5B8C\u6574\u7B54\u6848\uFF0C\u4E0D\u8BA1\u72EC\u7ACB\u8BC1\u636E\uFF08${attempt.id}\uFF09`);
    const next = {
      id: current?.id ?? `mst-${randomUUID2().slice(0, 10)}`,
      courseId: attempt.courseId,
      courseRevisionId: attempt.courseRevisionId,
      conceptId: conceptId2,
      level,
      dimensions,
      evidenceAttemptIds: [...current?.evidenceAttemptIds ?? [], attempt.id],
      basis,
      uncovered: current?.uncovered ?? ["\u6982\u5FF5\u89E3\u91CA", "\u6761\u4EF6/\u53CD\u4F8B\u8FA8\u6790", "\u8FC1\u79FB\u8868\u73B0"],
      disputes: current?.disputes ?? [],
      updatedAt: nowIso()
    };
    if (index === -1) mastery.push(next);
    else mastery[index] = next;
    if (level !== "mastered" && level !== "checked") {
      const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
      if (!review.some((item) => item.conceptId === conceptId2)) {
        review.push({
          conceptId: conceptId2,
          courseId: attempt.courseId,
          dueAt,
          intervalDays: 1,
          reason: "low-mastery"
        });
      }
    }
  }
  return { ...record, attempts, mastery, review, updatedAt: nowIso() };
}
function emptyLearning(courseId2, courseRevisionId2) {
  return {
    courseId: courseId2,
    courseRevisionId: courseRevisionId2,
    attempts: [],
    mastery: [],
    review: [],
    notes: [],
    updatedAt: nowIso()
  };
}
async function listEnvironments(services) {
  const environments = [];
  const probe = async (language, command, args) => {
    try {
      const result = await new Promise((resolve, reject) => {
        const child = spawnSafe(command, args);
        let stdout = "";
        child.stdout?.on("data", (chunk) => {
          stdout += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stdout }));
      });
      if (result.code !== 0) return { ok: false };
      return { ok: true, version: result.stdout.split("\n")[0]?.trim() };
    } catch {
      return { ok: false };
    }
  };
  const python = await probe("python", process.env.DSH_TEACHING_PYTHON ?? "python3", ["--version"]);
  const node = await probe("javascript", process.execPath, ["--version"]);
  const environmentsReady = [
    {
      id: "env-python",
      language: "python",
      kind: "system",
      status: python.ok ? "ready" : "missing",
      version: python.version,
      isolation: { dependencies: "none", note: "T01 \u4F7F\u7528\u7CFB\u7EDF Python\uFF1B\u8BFE\u7A0B\u7EA7\u9694\u79BB\u73AF\u5883\u5728 T06 \u63D0\u4F9B" },
      execution: { mode: "process", executable: process.env.DSH_TEACHING_PYTHON ?? "python3", timeoutMs: 1e4, cancellable: true, network: "unknown", confinement: "\u5BBF\u4E3B\u8FDB\u7A0B\uFF0C\u65E0\u989D\u5916\u5185\u5B58\u9650\u5236" },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...python.ok ? {} : { failure: { message: "\u672A\u627E\u5230 python3", code: "capability-missing", cleanup: "not-needed" } }
    },
    {
      id: "env-javascript",
      language: "javascript",
      kind: "system",
      status: node.ok ? "ready" : "missing",
      version: node.version,
      isolation: { dependencies: "none", note: "\u4F7F\u7528\u5BBF\u4E3B Electron Node \u6A21\u5F0F\u5B50\u8FDB\u7A0B" },
      execution: { mode: "process", executable: process.execPath, timeoutMs: 1e4, cancellable: true, network: "unknown", confinement: "\u5BBF\u4E3B\u8FDB\u7A0B\uFF0C\u65E0\u989D\u5916\u5185\u5B58\u9650\u5236" },
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    {
      id: "env-scheme",
      language: "scheme",
      dialect: "sicp",
      kind: "managed",
      status: "missing",
      isolation: { dependencies: "none", note: "T05 \u63A5\u5165 biwascheme \u89E3\u91CA\u5668" },
      execution: { mode: "in-process", timeoutMs: 1e4, cancellable: false, network: "unknown" },
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  ];
  for (const environment of environmentsReady) {
    environments.push(environment);
    await services.state.writeJson(environmentFile(services.state.dataDir, environment.id), environment);
  }
  return {
    environments,
    supportedLanguages: [
      { language: "python", label: "Python", status: python.ok ? "ready" : "missing", environmentId: "env-python", note: python.version },
      { language: "javascript", label: "JavaScript", status: node.ok ? "ready" : "missing", environmentId: "env-javascript", note: node.version },
      { language: "scheme", label: "Scheme (SICP)", status: "missing", environmentId: "env-scheme", note: "T05 \u63A5\u5165" }
    ],
    gaps: ["Scheme \u89E3\u91CA\u5668\u4E0E SICP \u6559\u5B66\u5E93\u5728 T05 \u63A5\u5165", "\u8BFE\u7A0B\u7EA7\u4F9D\u8D56\u9694\u79BB\u73AF\u5883\u5728 T06 \u63A5\u5165"]
  };
}
function spawnSafe(command, args) {
  const { spawn: spawn2 } = process.getBuiltinModule("node:child_process");
  return spawn2(command, args, { stdio: ["ignore", "pipe", "pipe"] });
}
async function proposeFallbackActivity(services, input) {
  const concept = input.revision.concepts[0];
  const materialText = input.material.slice(0, 4).map((item, index) => `[\u8D44\u6599${index + 1}] ${item.anchor.excerpt.slice(0, 240)}`).join("\n");
  try {
    const completion = await services.model.complete({
      system: "\u4F60\u662F\u6559\u5B66\u6D3B\u52A8\u8BBE\u8BA1\u5E08\u3002\u53EA\u8F93\u51FA JSON\uFF0C\u4E0D\u8981\u89E3\u91CA\u3002",
      messages: [{
        role: "user",
        text: [
          `\u8BFE\u7A0B\uFF1A${input.course.title}`,
          `\u5F53\u524D\u6982\u5FF5\uFF1A${concept?.title ?? "\u672A\u547D\u540D"}`,
          `\u8BB2\u89E3\u6458\u8981\uFF1A${input.answerText.slice(0, 500)}`,
          `\u53EF\u7528\u8D44\u6599\uFF1A
${materialText}`,
          "\u8BF7\u8BBE\u8BA1\u4E00\u4E2A\u80FD\u68C0\u9A8C\u7406\u89E3\u7684\u5C0F\u6D3B\u52A8\uFF0CJSON \u5B57\u6BB5\uFF1A",
          '{"kind":"quiz|graph|code-run|derivation","title":"...","goal":"...","payload":{...},"verification":{"kind":"objective|open|none"}}',
          'quiz payload: {"type":"quiz","question":"...","options":[{"id":"A","label":"..."}],"correctOptionIds":["A"],"explanation":"..."}',
          'graph payload: {"type":"graph","title":"...","xRange":[-5,5],"yRange":[-5,5],"series":[{"id":"s1","label":"...","expr":"x^2"}]}',
          'code-run payload: {"type":"code-run","language":"python","code":"print(1)","editable":true}',
          'derivation payload: {"type":"derivation","steps":[{"id":"s1","latex":"x^2","note":"..."}]}'
        ].join("\n")
      }],
      json: { name: "activity", description: "\u4E00\u4E2A\u6559\u5B66\u6D3B\u52A8", fields: { kind: "\u6D3B\u52A8\u7C7B\u578B", title: "\u6807\u9898", goal: "\u76EE\u6807", payload: "\u6D3B\u52A8\u5185\u5BB9", verification: "\u9A8C\u8BC1\u65B9\u5F0F" } },
      maxTokens: 900,
      purpose: "other",
      sessionId: "session-teaching-plugin"
    }, input.signal);
    const normalized = completion.json === void 0 ? void 0 : normalizeActivityProposal(completion.json);
    if (normalized === void 0) return fallbackReflectionActivity(input);
    const meta = completion.json;
    return {
      kind: meta.kind ?? normalized.payload.type,
      title: meta.title ?? "\u68C0\u9A8C\u7406\u89E3",
      goal: meta.goal ?? (concept?.summary ?? "\u68C0\u9A8C\u5F53\u524D\u6982\u5FF5\u7684\u7406\u89E3"),
      payload: normalized.payload,
      verification: normalized.verification,
      sourceRefs: input.material.slice(0, 2).map((item) => item.anchor),
      conceptIds: concept === void 0 ? [] : [concept.id],
      independent: normalized.verification.kind === "objective"
    };
  } catch (cause) {
    services.logger("fallback activity failed", { message: cause instanceof Error ? cause.message : String(cause) });
    return fallbackReflectionActivity(input);
  }
}
function fallbackReflectionActivity(input) {
  const concept = input.revision.concepts[0];
  const conceptTitle = concept?.title ?? input.course.title;
  return {
    kind: "open-question",
    title: `\u7528\u81EA\u5DF1\u7684\u8BDD\u89E3\u91CA\uFF1A${conceptTitle}`,
    goal: "\u68C0\u9A8C\u80FD\u5426\u8131\u79BB\u539F\u6587\u590D\u8FF0\u5E76\u4E3E\u4F8B",
    payload: {
      type: "open-question",
      prompt: `\u8BF7\u7528\u81EA\u5DF1\u7684\u8BDD\u89E3\u91CA\u300C${conceptTitle}\u300D\uFF0C\u5E76\u7ED9\u51FA\u4E00\u4E2A\u5B83\u9002\u7528\u6216\u4E0D\u9002\u7528\u7684\u5177\u4F53\u4F8B\u5B50\uFF0C\u8BF4\u660E\u4F60\u7684\u5224\u65AD\u4F9D\u636E\u3002`,
      rubric: [
        { id: "explain", label: "\u6982\u5FF5\u8868\u8FF0", description: "\u7528\u81EA\u5DF1\u7684\u8BDD\u51C6\u786E\u8868\u8FF0\u6838\u5FC3\u542B\u4E49", weight: 1 },
        { id: "example", label: "\u4F8B\u5B50\u4E0E\u6761\u4EF6", description: "\u7ED9\u51FA\u4F8B\u5B50\u5E76\u8BF4\u660E\u9002\u7528\u6761\u4EF6", weight: 1 },
        { id: "limits", label: "\u8FB9\u754C\u8BA4\u8BC6", description: "\u6307\u51FA\u4F55\u65F6\u4E0D\u9002\u7528\u6216\u5E38\u89C1\u8BEF\u533A", weight: 1 }
      ]
    },
    verification: { kind: "open", note: "\u5F00\u653E\u9898\u6309 rubric \u8BC4\u4EF7\u5E76\u4FDD\u7559\u4E0D\u786E\u5B9A\u6027" },
    sourceRefs: input.material.slice(0, 2).map((item) => item.anchor),
    conceptIds: concept === void 0 ? [] : [concept.id],
    independent: true
  };
}
function toAppError(cause) {
  if (typeof cause === "object" && cause !== null && typeof cause.code === "string") return cause;
  return { code: "failed", message: "\u64CD\u4F5C\u5931\u8D25", details: { message: cause instanceof Error ? cause.message : String(cause) } };
}
function notFoundError(what) {
  const error = appError("not-found", `${what}\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664`);
  return error;
}

// packages/dsh-plugin/src/host/tasks.ts
var TaskManager = class {
  active = /* @__PURE__ */ new Map();
  logger;
  state;
  constructor(state, logger) {
    this.state = state;
    this.logger = logger ?? (() => void 0);
  }
  /** Mark tasks left running by a previous Host process as interrupted. */
  async recoverInterrupted() {
    const files = (await this.state.list("tasks")).filter((name2) => name2.endsWith(".json"));
    const recovered = [];
    for (const name2 of files) {
      const snapshot = await this.state.readJson(`tasks/${name2}`);
      if (snapshot === void 0) continue;
      if (snapshot.status === "queued" || snapshot.status === "running") {
        const next = {
          ...snapshot,
          status: "failed",
          updatedAt: nowIso(),
          finishedAt: nowIso(),
          steps: snapshot.steps.map((step) => step.status === "running" ? { ...step, status: "failed", detail: "\u5BBF\u4E3B\u91CD\u542F\u5BFC\u81F4\u4EFB\u52A1\u4E2D\u65AD" } : step),
          error: { code: "failed", message: "\u5BBF\u4E3B\u91CD\u542F\u5BFC\u81F4\u4EFB\u52A1\u4E2D\u65AD\uFF1B\u5DF2\u4FDD\u7559\u90E8\u5206\u7ED3\u679C", retryable: true, cause: "interrupted" },
          resumable: snapshot.resumable ?? true
        };
        await this.persist(next);
        recovered.push(snapshot.id);
      }
    }
    return recovered;
  }
  /** Start one task and return its handle immediately. */
  start(options, run) {
    const id = taskId();
    const steps = (options.steps ?? []).map((step) => ({ ...step, status: "pending" }));
    const startedAt = nowIso();
    const controller = new AbortController();
    const record = {
      controller,
      record: {
        id,
        kind: options.kind,
        label: options.label,
        status: "running",
        steps,
        startedAt,
        updatedAt: startedAt,
        resumable: options.resumable ?? true,
        warnings: []
      },
      done: Promise.resolve()
    };
    const update = (patch) => {
      record.record = { ...record.record, ...patch, updatedAt: nowIso() };
      void this.persist(record.record);
    };
    const context = {
      id,
      signal: controller.signal,
      step: (stepId, patch) => {
        const stepsNext = record.record.steps.map((step) => step.id === stepId ? { ...step, ...patch } : step);
        update({ steps: stepsNext });
      },
      warn: (message) => {
        update({ warnings: [...record.record.warnings ?? [], message] });
      },
      progress: (value) => {
        update({ progress: value });
      },
      result: (value) => {
        update({ result: value });
      },
      cancelled: () => controller.signal.aborted
    };
    const done = (async () => {
      try {
        const value = await run(context);
        const finishedAt = nowIso();
        const cancelled = controller.signal.aborted;
        record.record = {
          ...record.record,
          status: cancelled ? "cancelled" : "completed",
          updatedAt: finishedAt,
          finishedAt,
          ...value === void 0 ? {} : { result: record.record.result ?? value },
          steps: record.record.steps.map((step) => step.status === "pending" || step.status === "running" ? { ...step, status: cancelled ? "skipped" : "done" } : step)
        };
        await this.persist(record.record);
      } catch (cause) {
        const finishedAt = nowIso();
        const error = toTaskError(cause, controller.signal.aborted);
        record.record = {
          ...record.record,
          status: controller.signal.aborted ? "cancelled" : "failed",
          updatedAt: finishedAt,
          finishedAt,
          error,
          steps: record.record.steps.map((step) => step.status === "running" ? { ...step, status: "failed" } : step)
        };
        this.logger("task failed", {
          id,
          kind: options.kind,
          code: error.code,
          message: cause instanceof Error ? cause.message : String(cause),
          stack: cause instanceof Error ? (cause.stack ?? "").split("\n").slice(0, 6).join(" | ") : void 0
        });
        await this.persist(record.record);
      } finally {
        this.active.delete(id);
      }
    })();
    record.done = done;
    this.active.set(id, record);
    void this.persist(record.record);
    return { id, snapshot: record.record };
  }
  /** Read one task's latest snapshot (active memory first, then disk). */
  async get(id) {
    const live = this.active.get(id);
    if (live !== void 0) return live.record;
    return this.state.readJson(taskFile(this.state.dataDir, id));
  }
  /** List known tasks, newest first. */
  async list() {
    const byId = /* @__PURE__ */ new Map();
    const files = (await this.state.list("tasks")).filter((name2) => name2.endsWith(".json"));
    for (const name2 of files) {
      const snapshot = await this.state.readJson(`tasks/${name2}`);
      if (snapshot !== void 0) byId.set(snapshot.id, snapshot);
    }
    for (const [id, live] of this.active) byId.set(id, live.record);
    return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  /** Request cancellation and return the current snapshot. */
  async cancel(id) {
    const live = this.active.get(id);
    if (live === void 0) {
      const snapshot = await this.get(id);
      if (snapshot === void 0) {
        throw Object.assign(new Error("\u4EFB\u52A1\u4E0D\u5B58\u5728"), { code: "not-found" });
      }
      return { id, accepted: false, snapshot };
    }
    live.controller.abort();
    live.record = { ...live.record, cancelRequested: true, updatedAt: nowIso() };
    void this.persist(live.record);
    return { id: live.record.id, accepted: true, snapshot: live.record };
  }
  /** Wait for one active task to settle (used by tests and shutdown). */
  async wait(id) {
    await this.active.get(id)?.done;
  }
  /** Cancel every active task (Host disposal). */
  async dispose() {
    for (const [id, live] of this.active) {
      live.controller.abort();
      live.record = {
        ...live.record,
        status: "cancelled",
        updatedAt: nowIso(),
        finishedAt: nowIso(),
        steps: live.record.steps.map((step) => step.status === "running" ? { ...step, status: "skipped" } : step)
      };
      await this.persist(live.record);
      this.active.delete(id);
    }
  }
  async persist(snapshot) {
    try {
      await this.state.writeJson(taskFile(this.state.dataDir, snapshot.id), snapshot);
    } catch (cause) {
      this.logger("task persist failed", { id: snapshot.id, error: String(cause) });
    }
  }
};
function toTaskError(cause, cancelled) {
  if (cancelled) return { code: "cancelled", message: "\u4EFB\u52A1\u5DF2\u53D6\u6D88" };
  if (typeof cause === "object" && cause !== null && typeof cause.code === "string") {
    return cause;
  }
  return {
    code: "failed",
    message: "\u4EFB\u52A1\u5931\u8D25",
    details: { message: cause instanceof Error ? cause.message : String(cause) }
  };
}

// packages/dsh-plugin/src/host/index.ts
var name = "ai-teaching";
var inject = ["connection", "llm", "agentDefaultModel"];
function resolveDataDir(config) {
  const overridden = typeof config.dataDir === "string" && config.dataDir.trim() !== "" ? config.dataDir.trim() : void 0;
  if (overridden !== void 0) return overridden;
  const home = process.env.DSH_HOME?.trim() || join3(homedir(), ".dsh");
  return join3(home, "teaching");
}
function apply(ctx, config = {}) {
  const dataDir = resolveDataDir(config);
  const logger = (message, fields) => {
    console.log(`[ai-teaching] ${message}`, fields === void 0 ? "" : JSON.stringify(fields));
  };
  const state = new LocalState({ dataDir, pluginVersion: "0.1.0" });
  const profiles = new ProfileRepository(state);
  const courses = new CourseRepository(state);
  const sessions = new SessionRepository(state);
  const learning = new LearningRepository(state);
  const tasks = new TaskManager(state, logger);
  const corpus = new MinimalCorpus(state);
  const web = createWebBridge(ctx);
  const model = new HarnessModelAdapter(ctx, {
    routingSessionId: "session-teaching-plugin",
    onUsage: (entry) => {
      void state.appendJsonl("usage/model-usage.jsonl", entry).catch((cause) => {
        logger("usage log failed", { message: String(cause) });
      });
    },
    log: logger
  });
  const ready = (async () => {
    const meta = await state.open();
    await profiles.get();
    const recovered = await tasks.recoverInterrupted();
    if (recovered.length > 0) logger("recovered interrupted tasks", { count: recovered.length });
    logger("ready", { dataDir, schemaVersion: meta.schemaVersion, installationId: meta.installationId });
  })();
  ready.catch((cause) => logger("bootstrap failed", { message: cause instanceof Error ? cause.message : String(cause) }));
  registerRoutes({
    ctx,
    state,
    model,
    web,
    tasks,
    corpus,
    profiles,
    courses,
    sessions,
    learning,
    pluginVersion: "0.1.0",
    dataDir,
    logger,
    hostFacts: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      profile: process.env.DSH_PROFILE
    },
    ready
  });
  ctx.effect(() => () => {
    void tasks.dispose();
    logger("disposed");
  }, "ai-teaching: lifetime");
}
export {
  apply,
  inject,
  name,
  resolveDataDir
};
//# sourceMappingURL=index.js.map
