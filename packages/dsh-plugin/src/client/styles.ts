/**
 * Stylesheet for the teaching workspace.
 *
 * Plain CSS shipped as a string and injected by the client entry, so the bundle
 * has no CSS side effects and the same markup stays readable in the offline
 * export later. Colours come from the Harness theme CSS variables with neutral
 * fallbacks, so the panel follows the app's light/dark theme.
 */
export const TEACHING_CSS = `
.ai-teaching-root {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-primary, #1f2937);
  background: var(--dsw-alias-bg-base, transparent);
}
.ai-teaching-topbar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 14px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.04));
  flex: 0 0 auto;
}
.ai-topbar-title { font-size: 14px; font-weight: 600; margin: 0; }
.ai-topbar-goal { font-size: 12px; opacity: 0.72; max-width: 380px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.ai-topbar-meta { font-size: 11px; opacity: 1; margin-left: auto; display: flex;
  gap: 10px; align-items: center; flex-wrap: wrap; }
/* Keep interactive controls fully opaque: an opacity ancestor makes the model
   dropdown look transparent and lets chat content show through it. */
.ai-topbar-meta > span:not(.ai-model-selector):not(.ai-context-meter):not(.ai-lang-switch) { opacity: 0.62; }
.ai-topbar-meta > .ai-model-selector,
.ai-topbar-meta > .ai-context-meter,
.ai-topbar-meta > .ai-lang-switch { opacity: 1; }
.ai-lang-switch { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10)); }
.ai-lang-switch button { border: none; background: transparent; color: inherit;
  font-size: 11px; padding: 2px 8px; border-radius: 6px; cursor: pointer; }
.ai-lang-switch button[data-active="true"] {
  background: var(--dsw-alias-state-business-primary, #3b82f6); color: #fff;
}
.ai-teaching-body { display: flex; flex: 1 1 auto; min-height: 0; }
.ai-teaching-sidebar {
  width: 232px; flex: 0 0 232px; overflow-y: auto; padding: 10px 10px 20px;
  border-right: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.03));
}
.ai-sidebar-section { margin-bottom: 14px; }
.ai-sidebar-heading { font-size: 11px; text-transform: none; letter-spacing: 0.02em;
  opacity: 0.6; margin: 0 0 6px; font-weight: 600; }
.ai-sidebar-heading-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ai-onboarding-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}

.ai-course-button {
  display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
  border: 1px solid transparent; background: transparent; color: inherit; cursor: pointer;
  border-radius: 8px; padding: 6px 8px; font-size: 12px;
}
.ai-course-button:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10)); }
.ai-course-button[data-active="true"] {
  border-color: var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10));
}
.ai-course-title { font-weight: 600; }
.ai-course-meta { font-size: 11px; opacity: 0.62; }
.ai-progress { height: 5px; border-radius: 999px; background: var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
  overflow: hidden; margin-top: 4px; }
.ai-progress > span { display: block; height: 100%; background: var(--dsw-alias-state-business-primary, #3b82f6); }
.ai-concept-row {
  display: flex; align-items: center; gap: 6px; width: 100%; text-align: left;
  border: none; background: transparent; color: inherit; cursor: pointer;
  border-radius: 6px; padding: 3px 6px; font-size: 12px;
}
.ai-concept-row:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
.ai-concept-row[data-current="true"] { background: var(--dsw-alias-bg-layer-1, rgba(59,130,246,0.12)); }
.ai-badge { font-size: 10px; padding: 0 6px; border-radius: 999px; border: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); opacity: 0.8; white-space: nowrap; }
.ai-badge[data-level="mastered"] { color: var(--dsw-alias-state-success-primary, #15803d); border-color: var(--dsw-alias-state-success-primary, #16a34a); opacity: 1; }
.ai-badge[data-level="checked"] { color: var(--dsw-alias-link, #0369a1); border-color: var(--dsw-alias-link, #0284c7); opacity: 1; }
.ai-badge[data-level="practiced"] { color: var(--dsw-alias-state-warn-primary, #b45309); border-color: var(--dsw-alias-state-warn-primary, #d97706); opacity: 1; }
.ai-session-row { display: flex; align-items: center; gap: 4px; width: 100%;
  padding: 1px 2px 1px 0; border-radius: 6px; }
.ai-session-row:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
.ai-session-row[data-active="true"] { background: var(--dsw-alias-bg-layer-1, rgba(59,130,246,0.12)); }
.ai-session-main { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;
  border: none; background: transparent; color: inherit; cursor: pointer; font-size: 12px;
  padding: 4px 6px; text-align: left; font-family: inherit; }
.ai-session-delete { flex: 0 0 auto; border: none; background: transparent; color: inherit;
  opacity: 0; cursor: pointer; font-size: 10px; padding: 2px 5px; border-radius: 5px; }
.ai-session-row:hover .ai-session-delete,
.ai-session-delete:focus-visible { opacity: 0.7; }
.ai-session-delete:hover { opacity: 1; color: var(--dsw-alias-state-error-primary, #b91c1c);
  background: rgba(185,28,28,0.08); }
.ai-session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-review-item { font-size: 12px; padding: 6px 8px; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); margin-bottom: 6px; }
.ai-review-reason { font-size: 11px; opacity: 0.65; }
.ai-link-button { border: none; background: transparent; color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb));
  cursor: pointer; font-size: 11px; padding: 2px 0; text-align: left; }
.ai-link-button:hover { text-decoration: underline; }
.ai-small-button, .ai-primary-button, .ai-danger-button {
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35)); background: transparent;
  color: inherit; border-radius: 7px; cursor: pointer; font-size: 12px; padding: 3px 10px;
  font-family: inherit;
}
.ai-primary-button { background: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); border-color: transparent; color: #fff; }
.ai-primary-button:disabled, .ai-small-button:disabled, .ai-danger-button:disabled {
  opacity: 0.45; cursor: not-allowed;
}
.ai-danger-button { color: var(--dsw-alias-state-error-primary, #b91c1c); border-color: rgba(185,28,28,0.4); }
.ai-teaching-main { flex: 1 1 auto; display: flex; min-width: 0; min-height: 0; }
.ai-chat-panel { flex: 1 1 52%; display: flex; flex-direction: column; min-width: 0;
  border-right: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); }
.ai-chat-scroll { flex: 1 1 auto; overflow-y: auto; padding: 14px 16px; display: flex;
  flex-direction: column; gap: 10px; }
.ai-msg { max-width: 92%; border-radius: 12px; padding: 8px 12px; position: relative; }
.ai-msg-teacher { align-self: flex-start; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.07));
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.16)); }
.ai-msg-student { align-self: flex-end; background: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); color: #fff; }
.ai-msg-student .teaching-markdown a { color: #dbeafe; }
.ai-msg-system { align-self: center; font-size: 11px; opacity: 0.65; background: transparent;
  border: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); }
.ai-msg-meta { font-size: 10px; opacity: 0.6; margin-top: 4px; display: flex; gap: 8px;
  flex-wrap: wrap; align-items: center; }
.ai-msg-student .ai-msg-meta { opacity: 0.85; }
.ai-msg-feedback { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.28));
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.06)); border-radius: 10px;
  padding: 10px 12px; }
.ai-msg-feedback .ai-markdown h3 { margin-top: 0; }
.ai-feedback-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.ai-evidence-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.ai-evidence-chip { font-size: 10px; border-radius: 999px; padding: 1px 8px; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35)); background: transparent;
  color: inherit; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-evidence-chip[data-kind="course-source"] { border-color: var(--dsw-alias-link, #0284c7); color: var(--dsw-alias-link, #0369a1); }
.ai-evidence-chip[data-kind="external-web"] { border-color: var(--dsw-alias-state-warn-primary, #d97706); color: var(--dsw-alias-state-warn-primary, #b45309); }
.ai-evidence-chip[data-kind="model-knowledge"] { border-style: dashed; }
.ai-evidence-detail { font-size: 11px; opacity: 0.8; margin-top: 4px; padding: 6px 8px;
  border-left: 2px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); white-space: pre-wrap; }
.ai-quick-actions { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 16px 6px; }
.ai-quick-actions button { font-size: 11px; }
.ai-progress-line { font-size: 11px; opacity: 0.75; padding: 2px 16px 0;
  display: flex; gap: 8px; align-items: center; }
.ai-streaming-text { white-space: pre-wrap; }
.ai-composer { display: flex; gap: 8px; padding: 8px 12px 12px; align-items: flex-end;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.18)); }
.ai-composer textarea {
  flex: 1; resize: vertical; min-height: 44px; max-height: 180px; padding: 8px 10px;
  border-radius: 10px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3));
  background: var(--dsw-alias-bg-base, transparent); color: inherit; font: inherit; font-size: 13px;
  box-sizing: border-box;
}
.ai-teaching-area { flex: 1 1 48%; display: flex; flex-direction: column; min-width: 0;
  min-height: 0; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.02)); }
.ai-tabs { display: flex; gap: 2px; padding: 6px 10px 0; border-bottom: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.2)); flex: 0 0 auto; }
.ai-tab { border: none; background: transparent; color: inherit; cursor: pointer;
  font-size: 12px; padding: 6px 10px; border-bottom: 2px solid transparent; opacity: 0.7; }
.ai-tab[data-active="true"] { border-bottom-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); opacity: 1;
  font-weight: 600; }
.ai-tab-body { flex: 1 1 auto; overflow-y: auto; padding: 12px 14px 24px; min-height: 0; }
.ai-empty { opacity: 0.62; font-size: 12px; padding: 10px 0; }
.ai-activity-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.ai-activity-list button[data-active="true"] { border-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb));
  color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); }
.ai-source-card { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); border-radius: 8px;
  padding: 8px 10px; margin-bottom: 8px; }
.ai-source-title { font-weight: 600; font-size: 12px; display: flex; gap: 8px; align-items: center; }
.ai-source-meta { font-size: 11px; opacity: 0.65; }
.ai-source-unit { font-size: 12px; padding: 6px 0; border-bottom: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.12)); white-space: pre-wrap; }
.ai-source-issue { font-size: 11px; color: var(--dsw-alias-state-warn-primary, #b45309); }
.ai-env-row { font-size: 12px; padding: 6px 0; border-bottom: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.12)); }
.ai-course-setup { flex: 1 1 auto; overflow-y: auto; padding: 24px; min-height: 0; }
.ai-course-setup-card { max-width: 820px; margin: 0 auto; padding: 18px 20px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25)); border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); }
.ai-draft-review h3 { color: inherit; }
.ai-draft-review .ai-checklist { max-height: 320px; overflow-y: auto; }
.ai-onboarding { padding: 24px; max-width: 720px; margin: 0 auto; overflow-y: auto; }
.ai-onboarding h2 { font-size: 18px; margin: 0 0 6px; }
.ai-onboarding p { opacity: 0.8; margin: 4px 0 10px; }
.ai-onboarding-card { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25)); border-radius: 12px;
  padding: 14px 16px; margin-bottom: 14px; background: var(--dsw-alias-bg-base, transparent); }
.ai-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.ai-field label { font-size: 12px; font-weight: 600; }
.ai-field input, .ai-field textarea, .ai-field select {
  padding: 7px 9px; border-radius: 8px; border: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); background: var(--dsw-alias-bg-base, transparent);
  color: inherit; font: inherit; font-size: 13px;
}
.ai-field-hint { font-size: 11px; opacity: 0.62; }
.ai-banner { display: flex; gap: 8px; align-items: flex-start; padding: 7px 12px; font-size: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2)); }
.ai-banner[data-kind="error"] { background: rgba(220,38,38,0.08); color: var(--dsw-alias-state-error-primary, #b91c1c); }
.ai-banner[data-kind="warning"] { background: rgba(217,119,6,0.1); color: var(--dsw-alias-state-warn-primary, #b45309); }
.ai-banner[data-kind="info"] { background: rgba(37,99,235,0.07); color: #1d4ed8; }
.ai-banner-close { margin-left: auto; border: none; background: transparent; cursor: pointer;
  color: inherit; font-size: 14px; line-height: 1; }
.ai-task { display: flex; gap: 10px; align-items: center; padding: 6px 14px; font-size: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.16)); }
.ai-task-progress { flex: 1; height: 5px; border-radius: 999px; overflow: hidden;
  background: var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); }
.ai-task-progress > span { display: block; height: 100%; background: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); }
.ai-spinner { width: 12px; height: 12px; border-radius: 50%; display: inline-block;
  border: 2px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
  border-top-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); animation: ai-spin 0.8s linear infinite; }
@keyframes ai-spin { to { transform: rotate(360deg); } }
.ai-checklist { font-size: 12px; margin: 4px 0 0; padding-left: 18px; }
.ai-warning-list { font-size: 11px; color: var(--dsw-alias-state-warn-primary, #b45309); margin: 6px 0 0; padding-left: 18px; }
.teaching-markdown { font-size: 13px; line-height: 1.68; overflow-wrap: anywhere; }
.teaching-markdown h1, .teaching-markdown h2, .teaching-markdown h3, .teaching-markdown h4 {
  margin: 0.6em 0 0.3em; line-height: 1.35; }
.teaching-markdown h1 { font-size: 16px; } .teaching-markdown h2 { font-size: 15px; }
.teaching-markdown h3 { font-size: 14px; } .teaching-markdown h4 { font-size: 13px; }
.teaching-markdown p { margin: 0.4em 0; }
.teaching-markdown ul, .teaching-markdown ol { margin: 0.35em 0; padding-left: 1.5em; }
.teaching-markdown li { margin: 0.15em 0; }
.teaching-markdown code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em; background: var(--dsw-alias-markdown-inline-code, rgba(127,127,127,0.14));
  padding: 0.1em 0.35em; border-radius: 4px; }
.teaching-markdown pre { background: var(--dsw-alias-markdown-code-block, rgba(127,127,127,0.1));
  padding: 8px 10px; border-radius: 8px; overflow-x: auto; margin: 0.5em 0; }
.teaching-markdown pre code { background: transparent; padding: 0; }
.teaching-markdown blockquote { margin: 0.5em 0; padding-left: 10px;
  border-left: 3px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35)); opacity: 0.9; }
.teaching-markdown a { color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); }
.teaching-markdown hr { border: none; border-top: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); margin: 0.8em 0; }
.teaching-math-inline, .teaching-math-block { color: inherit; }
.teaching-math-block { display: block; overflow-x: auto; margin: 0.5em 0; }
.teaching-activity { margin-bottom: 10px; }
.teaching-activity-title { color: inherit; }
.ai-notes-area textarea { width: 100%; min-height: 160px; box-sizing: border-box;
  padding: 8px 10px; border-radius: 8px; border: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); background: var(--dsw-alias-bg-base, transparent);
  color: inherit; font: inherit; font-size: 12px; line-height: 1.6; }
.ai-muted { opacity: 0.62; font-size: 12px; }
.ai-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ai-grow { flex: 1; }
@media (max-width: 980px) {
  .ai-teaching-body { flex-direction: column; }
  .ai-teaching-sidebar { width: auto; flex: 0 0 auto; max-height: 180px;
    border-right: none; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); }
  .ai-teaching-main { flex-direction: column; }
  .ai-chat-panel { flex: 1 1 auto; border-right: none; min-height: 320px; }
  .ai-teaching-area { flex: 1 1 auto; }
}
.ai-course-row{display:flex;align-items:stretch;gap:4px}
.ai-course-row .ai-course-button{flex:1;min-width:0}
.ai-course-delete{border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:transparent;color:var(--dsw-alias-label-secondary,#888);border-radius:6px;cursor:pointer;padding:0 6px;font-size:12px}
.ai-course-delete:hover{color:#c0392b;border-color:#c0392b}
.ai-current-activity { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25));
  border-radius: 10px; padding: 10px 12px; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); }
.ai-current-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ai-current-title { flex: 1; font-weight: 600; font-size: 14px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.ai-collapsible { border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2));
  padding-top: 8px; margin-top: 8px; }
.ai-collapsible-head { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left;
  border: none; background: transparent; color: inherit; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 600; padding: 3px 0; }
.ai-collapsible-head:hover { color: var(--dsw-alias-state-business-primary, #2563eb); }
.ai-collapsible-arrow { width: 12px; display: inline-block; opacity: 0.7; }
.ai-collapsible-body { display: flex; flex-direction: column; gap: 6px; padding: 6px 0 2px; }
.ai-history-row { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2)); border-radius: 8px;
  padding: 7px 9px; background: var(--dsw-alias-bg-base, transparent); }
.ai-history-main { flex: 1; min-width: 0; }
.ai-history-title { font-size: 13px; font-weight: 600; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.ai-history-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
  font-size: 11px; opacity: 0.72; margin-top: 2px; }
.ai-current-experiment { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25));
  border-radius: 10px; padding: 10px 12px; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); }
.ai-run-summary { margin-top: 4px; }
.ai-run-output { margin: 2px 0; padding: 8px; border-radius: 6px; max-height: 220px; overflow: auto;
  background: var(--dsw-alias-markdown-code-block, rgba(127,127,127,0.1)); font-size: 11px;
  white-space: pre-wrap; word-break: break-word; }
.ai-run-output-error { color: var(--dsw-alias-state-error-primary, #b91c1c);
  background: rgba(239,68,68,0.08); }
.ai-badge[data-run-status="succeeded"] { color: var(--dsw-alias-state-success-primary, #16a34a); border-color: currentColor; }
.ai-badge[data-run-status="failed"], .ai-badge[data-run-status="timed-out"] { color: var(--dsw-alias-state-error-primary, #b91c1c); border-color: currentColor; }
.ai-badge[data-run-status="cancelled"] { color: var(--dsw-alias-state-warn-primary, #b45309); border-color: currentColor; }
.ai-draft-origin { margin: 0 0 6px; }
.ai-badge[data-origin="kb-structure"] { color: var(--dsw-alias-state-success-primary, #16a34a);
  border-color: currentColor; opacity: 1; }
.ai-badge[data-origin="llm-wiki"] { color: var(--dsw-alias-state-business-primary, #2563eb);
  border-color: currentColor; opacity: 1; }
.ai-badge[data-origin="ai"] { border-style: dashed; opacity: 0.85; }
.ai-structure-notes { margin: 4px 0 0; padding-left: 18px; font-size: 11px; opacity: 0.72; }
.ai-structure-notes li { margin: 1px 0; }
.ai-chapter-list { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 2px; }
.ai-chapter { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
  border-radius: 8px; padding: 8px 10px; background: var(--dsw-alias-bg-base, transparent); }
.ai-chapter-head { margin-bottom: 2px; }
.ai-chapter-title { font-weight: 600; font-size: 13px; }
.ai-chapter-summary { font-size: 12px; opacity: 0.78; margin-top: 2px; }
.ai-chapter-anchors { font-size: 11px; opacity: 0.6; margin-top: 2px; }
.ai-chapter-concepts { margin-top: 4px; }
.ai-badge[data-chapter-role="appendix"] { border-style: dashed; opacity: 0.85; }
.ai-badge[data-chapter-role="tool"] { color: var(--dsw-alias-state-warn-primary, #b45309);
  border-color: currentColor; opacity: 1; }
.ai-sidebar-chapters { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; }
.ai-chapter-group { border-radius: 6px; }
.ai-chapter-toggle { display: flex; align-items: center; gap: 5px; width: 100%; text-align: left;
  border: none; background: transparent; color: inherit; cursor: pointer; font: inherit;
  font-size: 12px; padding: 4px 6px; border-radius: 6px;
  appearance: none; -webkit-appearance: none; box-shadow: none; }
.ai-chapter-toggle:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
.ai-chapter-toggle-static { cursor: default; }
.ai-chapter-toggle-static:hover { background: transparent; }
.ai-sidebar-chapters .ai-chapter-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-chapter-progress { margin-left: auto; font-size: 10px; opacity: 0.62; white-space: nowrap; }
.ai-chapter-concept-rows { display: flex; flex-direction: column; gap: 1px; padding-left: 6px; }
.ai-chapter-empty { font-size: 11px; padding: 2px 6px 4px 18px; }
.ai-edit-rows { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; }
.ai-edit-row { display: flex; gap: 8px; align-items: flex-start; justify-content: space-between;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); border-radius: 8px;
  padding: 6px 8px; background: var(--dsw-alias-bg-base, transparent); }
.ai-edit-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ai-edit-title { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px;
  padding: 4px 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3));
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.06)); color: inherit; }
.ai-edit-title:focus { outline: 2px solid var(--dsw-alias-state-business-primary, #2563eb); outline-offset: 1px; }
.ai-edit-summary { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-edit-chapter-title { flex: 1; min-width: 0; width: auto; font-weight: 600; }
.ai-edit-chapter-summary { margin-top: 4px; font-weight: 400; }
.ai-edit-optional { margin-top: 3px; }
.ai-edit-row-added { border-style: dashed; }
.ai-badge[data-added="true"] { color: var(--dsw-alias-state-business-primary, #2563eb);
  border-color: currentColor; opacity: 1; white-space: nowrap; }
.ai-edit-hint { font-size: 11px; opacity: 0.7; }
.ai-add-concept { align-self: flex-start; margin-top: 2px; }
.ai-unsaved-guard { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ai-teaching-body[data-left-collapsed="true"] .ai-teaching-sidebar { display: none; }
.ai-teaching-body[data-right-collapsed="true"] .ai-teaching-area { display: none; }
.ai-topbar-titles { min-width: 0; }
.ai-icon-button { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3));
  background: transparent; color: inherit; border-radius: 6px; cursor: pointer;
  font-size: 12px; line-height: 1; padding: 3px 6px; }
.ai-icon-button:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.12)); }
.ai-icon-button[aria-pressed="false"] { opacity: 0.6; }
.ai-model-selector { position: relative; display: inline-flex; }
.ai-model-button { display: inline-flex; align-items: center; gap: 6px; border: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); background: transparent; color: inherit;
  border-radius: 8px; cursor: pointer; font-size: 12px; padding: 3px 8px; font-family: inherit; }
.ai-model-button:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.12)); }
.ai-model-name { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-badge[data-follow-host="true"] { opacity: 0.75; }
.ai-model-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 200;
  min-width: 300px; max-width: 420px; max-height: 60vh; overflow-y: auto;
  padding: 8px; border-radius: 10px; border: 1px solid
  var(--dsw-alias-border-l2, rgba(127,127,127,0.3));
  background-color: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #ffffff));
  background-image: linear-gradient(var(--dsw-alias-bg-layer-1, transparent), var(--dsw-alias-bg-layer-1, transparent));
  color: var(--dsw-alias-label-primary, #111); box-shadow: 0 12px 36px rgba(0,0,0,0.28);
  display: flex; flex-direction: column; gap: 4px; isolation: isolate; }
.ai-model-provider { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
.ai-model-provider-name { font-size: 11px; opacity: 0.65; font-weight: 600; padding: 2px 4px; }
.ai-model-item { display: flex; justify-content: space-between; gap: 10px; align-items: baseline;
  border: 1px solid transparent; border-radius: 6px; background: transparent; color: inherit;
  cursor: pointer; font: inherit; font-size: 12px; padding: 4px 6px; text-align: left; }
.ai-model-item:hover { background: var(--dsw-alias-bg-base, rgba(127,127,127,0.1)); }
.ai-model-item[data-active="true"] { border-color: var(--dsw-alias-state-business-primary, #2563eb); }
.ai-model-efforts { border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2));
  margin-top: 4px; padding-top: 4px; display: flex; flex-direction: column; gap: 2px; }
.ai-model-error { color: var(--dsw-alias-state-error-primary, #b91c1c); font-size: 11px; padding: 2px 4px; }
.ai-model-failures { border-top: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,0.2));
  margin-top: 4px; padding-top: 4px; display: flex; flex-direction: column; gap: 2px; }
.ai-context-meter { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; }
.ai-context-bar { display: inline-block; width: 56px; height: 6px; border-radius: 999px;
  background: var(--dsw-alias-border-l2, rgba(127,127,127,0.25)); overflow: hidden; }
.ai-context-bar > span { display: block; height: 100%; border-radius: 999px;
  background: var(--dsw-alias-state-business-primary, #2563eb); }
.ai-context-bar[data-tone="warn"] > span { background: var(--dsw-alias-state-warn-primary, #d97706); }
.ai-context-bar[data-tone="danger"] > span { background: var(--dsw-alias-state-error-primary, #dc2626); }
.ai-context-label { white-space: nowrap; opacity: 0.85; }
.ai-compaction-banner { display: flex; flex-direction: column; gap: 2px; font-size: 11px;
  padding: 6px 8px; border-radius: 8px; border: 1px dashed
  var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.06)); }
.ai-compacted-block { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25));
  border-radius: 8px; padding: 4px 8px; font-size: 12px; }
.ai-compacted-block > summary { cursor: pointer; opacity: 0.8; font-size: 11px; }
.ai-compacted-messages { display: flex; flex-direction: column; gap: 8px; padding-top: 6px; opacity: 0.85; }
.ai-compress-modal { max-width: 560px; }
.teaching-visual { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25));
  border-radius: 10px; padding: 10px 12px; background: var(--dsw-alias-bg-base, transparent); }
.teaching-visual-title { color: inherit; }
.teaching-visual-caption { color: inherit; }
.teaching-visual-observe { color: var(--dsw-alias-state-warn-primary, #b45309); }
.teaching-visual-frame { display: block; width: 100%; border: 0; border-radius: 8px;
  background: transparent; }
.teaching-visual-formula { margin: 4px 0; overflow-x: auto; }
.teaching-visual-conditions { color: var(--dsw-alias-state-warn-primary, #b45309); }
.teaching-visual-fallback { white-space: pre-wrap; }
.teaching-visual-limitation { opacity: 0.65; }
.teaching-visual-error { color: var(--dsw-alias-state-error-primary, #b91c1c); }
.ai-chat-visuals { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.ai-chat-visual { border: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
  border-radius: 8px; padding: 8px; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); }
.ai-chat-visual-caption { font-size: 11px; opacity: 0.72; margin-bottom: 6px; }
.ai-chat-visual-error { font-size: 11px; color: var(--dsw-alias-state-error-primary, #b91c1c); }
.ai-chat-visual-source { margin-top: 4px; font-size: 11px; }
.ai-chat-visual-source > summary { cursor: pointer; opacity: 0.7; }
.ai-chat-visual-source pre { margin: 4px 0 0; padding: 6px; border-radius: 6px; max-height: 240px;
  overflow: auto; white-space: pre-wrap; word-break: break-word;
  background: var(--dsw-alias-markdown-code-block, rgba(127,127,127,0.1)); font-size: 11px; }
.ai-inline-activities { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.ai-inline-activity { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3));
  border-radius: 10px; padding: 8px 10px; background: var(--dsw-alias-bg-base, transparent);
  min-width: 0; overflow: hidden; }
.ai-inline-toolbar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.ai-inline-title { font-weight: 600; font-size: 13px; }
.ai-inline-kind { opacity: 0.75; }
.ai-inline-interactive { color: var(--dsw-alias-state-business-primary, #2563eb); border-color: currentColor; }
.ai-inline-toolbar-spacer { flex: 1; }
.ai-inline-host { width: 100%; min-width: 0; }
.ai-inline-host .teaching-activity { border: 0; padding: 0; background: transparent; }
.ai-inline-host .teaching-activity-title { display: none; }
.ai-inline-activity iframe { height: 520px !important; width: 100% !important; max-width: 100%; }
.ai-inline-activity canvas { max-width: 100%; }
.ai-inline-source { margin-top: 6px; font-size: 11px; }
.ai-inline-source > summary { cursor: pointer; opacity: 0.75; }
.ai-inline-source pre { margin: 4px 0 0; padding: 6px; border-radius: 6px; max-height: 260px;
  overflow: auto; white-space: pre-wrap; word-break: break-word;
  background: var(--dsw-alias-markdown-code-block, rgba(127,127,127,0.1)); }
.ai-fullscreen-overlay { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center;
  justify-content: center; padding: 16px; background: rgba(0,0,0,0.55); }
.ai-fullscreen-panel { display: flex; flex-direction: column; width: 96vw; height: 94vh; max-width: 1500px;
  border-radius: 12px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.2));
  background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, inherit);
  box-shadow: 0 24px 80px rgba(0,0,0,0.45); overflow: hidden; }
.ai-fullscreen-head { display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25)); }
.ai-fullscreen-title { font-weight: 600; font-size: 14px; }
.ai-fullscreen-head .ai-muted { margin-left: 4px; }
.ai-fullscreen-head .ai-small-button { margin-left: auto; }
.ai-fullscreen-body { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; }
.ai-fullscreen-body .ai-inline-activity { height: 100%; overflow: auto; }
.ai-fullscreen-body .ai-inline-activity iframe,
.ai-fullscreen-body .ai-inline-activity canvas { height: calc(100vh - 140px) !important; width: 100% !important; }
.ai-fullscreen-body .ai-inline-activity svg { width: 100% !important; height: auto !important;
  max-height: calc(100vh - 280px); }
.ai-graphical-moved-note { border-radius: 8px; }
@media (max-width: 720px) {
  .ai-fullscreen-overlay { padding: 0; }
  .ai-fullscreen-panel { width: 100vw; height: 100vh; border-radius: 0; }
  .ai-inline-activity iframe { height: 380px !important; }
  .ai-fullscreen-body .ai-inline-activity iframe { height: calc(100vh - 120px) !important; }
}
.ai-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:60}
.ai-modal{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);border-radius:12px;padding:18px 20px;max-width:460px;width:calc(100vw - 48px);box-shadow:0 20px 60px rgba(0,0,0,.3)}
.ai-modal h3{margin:0 0 8px;font-size:15px}
.ai-modal .ai-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}


/* Materials sidebar: compact rows; missing CSS previously let browser buttons
   become huge pills in the narrow sidebar. */
.ai-materials-panel { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ai-materials-panel .ai-sidebar-heading-row { margin-bottom: 4px; }
.ai-materials-panel .ai-sidebar-heading-row .ai-small-button { flex: 0 0 auto; font-size: 11px; padding: 2px 6px; }
.ai-materials-list { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto; min-width: 0; }
.ai-material-row { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0;
  border: 1px solid transparent; border-radius: 7px; background: transparent; color: inherit;
  cursor: pointer; font: inherit; font-size: 12px; text-align: left; padding: 3px 4px; }
.ai-material-row:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
.ai-material-origin { flex: 0 0 auto; font-size: 10px; padding: 0 4px; line-height: 16px; }
.ai-material-origin[data-origin="web"] { color: var(--dsw-alias-state-business-primary, #2563eb); }
.ai-material-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-materials-more { margin-top: 2px; text-align: left; font-size: 11px; }
.ai-materials-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
.ai-materials-tabs .ai-small-button[data-active="true"] { border-color: var(--dsw-alias-state-business-primary, #2563eb);
  color: var(--dsw-alias-state-business-primary, #2563eb); background: var(--dsw-alias-bg-layer-1, rgba(37,99,235,0.12)); }
.ai-materials-tab { border: 1px solid transparent; border-radius: 6px; background: transparent; color: inherit;
  cursor: pointer; font: inherit; font-size: 12px; padding: 3px 10px; }
.ai-materials-tab[data-active="true"] { border-color: var(--dsw-alias-state-business-primary, #2563eb);
  color: var(--dsw-alias-state-business-primary, #2563eb); background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
.ai-materials-modal .ai-planning-field, .ai-materials-modal .ai-field { margin-bottom: 8px; }
.ai-materials-modal textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 12px; }

/* Planning interview: real selectable options (not text copied into a textarea). */
.ai-planning-option { display: flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); border-radius: 8px;
  background: transparent; color: inherit; cursor: pointer; font: inherit; font-size: 12px;
  padding: 6px 8px; margin: 3px 0; }
.ai-planning-option::before { content: "○"; flex: 0 0 auto; opacity: 0.65; }
.ai-planning-option:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
.ai-planning-option[data-active="true"] { border-color: var(--dsw-alias-state-business-primary, #2563eb);
  background: var(--dsw-alias-bg-layer-1, rgba(37,99,235,0.12)); }
.ai-planning-option[data-active="true"]::before { content: "●"; opacity: 1; color: var(--dsw-alias-state-business-primary, #2563eb); }
.ai-planning-option:disabled { opacity: 0.55; cursor: default; }
.ai-planning-answer-state { font-size: 11px; opacity: 0.72; margin: 4px 0; }
.ai-planning-custom-toggle { margin-top: 2px; }
.ai-plan-summary { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.28));
  border-radius: 10px; padding: 10px 12px; margin: 8px 0; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); }
.ai-plan-summary h4 { margin: 0 0 6px; font-size: 14px; }
.ai-plan-summary ul { margin: 4px 0 8px; padding-left: 18px; font-size: 12px; }
.ai-plan-summary .ai-plan-chapters { font-size: 12px; }
.ai-plan-summary .ai-plan-chapters li { margin: 2px 0; }
.ai-plan-advanced { margin-top: 10px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); padding-top: 8px; }



/* Planning wizard layout: fields previously used class names with no CSS, so
   labels, textareas and action buttons collided and candidate URLs ran together. */
.ai-planning-wizard { display: flex; flex-direction: column; gap: 10px; max-width: 920px; min-width: 0; margin: 0 auto; }
.ai-planning-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.ai-planning-title { margin: 0; font-size: 16px; }
.ai-planning-progress { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; opacity: 0.8; }
.ai-planning-bar { width: 90px; height: 5px; border-radius: 999px; overflow: hidden;
  background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.16)); }
.ai-planning-bar > span { display: block; height: 100%; background: var(--dsw-alias-state-business-primary, #2563eb); }
.ai-planning-card { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25));
  border-radius: 12px; padding: 14px 16px; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.04));
  min-width: 0; }
.ai-planning-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; min-width: 0; }
.ai-planning-field > span { font-size: 12px; font-weight: 600; opacity: 0.85; }
.ai-planning-field input, .ai-planning-field select, .ai-planning-field textarea,
.ai-planning-card > input, .ai-planning-card > textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 12px; }
.ai-planning-textarea { min-height: 96px; resize: vertical; padding: 6px 8px; border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); background: transparent; color: inherit; }
.ai-edit-title { padding: 6px 8px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3));
  background: transparent; color: inherit; }
.ai-planning-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px 12px; }
.ai-planning-questions { display: flex; flex-direction: column; gap: 12px; }
.ai-planning-question { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
  border-radius: 10px; padding: 10px 12px; margin: 0; min-width: 0; }
.ai-planning-question legend { font-weight: 600; font-size: 13px; padding: 0 4px; }
.ai-planning-question > .ai-muted { margin: 2px 0 8px; }
.ai-planning-options { display: flex; flex-direction: column; gap: 0; margin: 4px 0; }
.ai-planning-answer-state { font-size: 11px; opacity: 0.75; margin: 4px 0; }
.ai-planning-chapters { display: flex; flex-direction: column; gap: 8px; margin: 8px 0; }
.ai-planning-chapter { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2));
  border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.ai-planning-chapter textarea { min-height: 64px; }
.ai-warning-list { margin: 6px 0; padding-left: 18px; font-size: 11px; opacity: 0.8; }
.ai-planning-candidate-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0; }
.ai-planning-candidates { display: flex; flex-direction: column; gap: 8px; max-height: 460px; overflow-y: auto; padding-right: 2px; }
.ai-planning-candidate { display: flex; align-items: flex-start; gap: 8px; min-width: 0;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); border-radius: 10px;
  padding: 9px 10px; background: var(--dsw-alias-bg-base, transparent); }
.ai-planning-candidate[data-selected="true"] { border-color: var(--dsw-alias-state-business-primary, #2563eb);
  background: var(--dsw-alias-bg-layer-1, rgba(37,99,235,0.10)); }
.ai-planning-candidate > input { margin-top: 3px; flex: 0 0 auto; }
.ai-planning-candidate-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ai-planning-candidate-top { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.ai-planning-candidate-title { flex: 1 1 auto; min-width: 0; font-weight: 600; font-size: 13px;
  overflow-wrap: anywhere; }
.ai-planning-candidate-status { flex: 0 0 auto; font-size: 10px; border: 1px solid currentColor;
  border-radius: 999px; padding: 0 6px; opacity: 0.75; }
.ai-planning-candidate-status[data-status="failed"] { color: var(--dsw-alias-state-error-primary, #b91c1c); }
.ai-planning-candidate-status[data-status="fetched"] { color: var(--dsw-alias-state-success-primary, #15803d); }
.ai-planning-candidate-source { display: flex; align-items: baseline; gap: 6px; min-width: 0; font-size: 11px; }
.ai-planning-source-badge { flex: 0 0 auto; font-size: 10px; }
.ai-planning-candidate-url { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; color: var(--dsw-alias-link, #2563eb); }
.ai-planning-candidate-purpose { font-size: 11px; opacity: 0.85; overflow-wrap: anywhere; }
.ai-planning-candidate-snippet { font-size: 12px; opacity: 0.8; white-space: normal; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.ai-planning-candidate-snippet[data-expanded="true"] { display: block; -webkit-line-clamp: unset; overflow: visible; }
.ai-planning-candidate-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline; }
.ai-planning-candidate-actions .ai-link-button { font-size: 11px; }
.ai-planning-candidate-reason { font-size: 11px; opacity: 0.8; color: var(--dsw-alias-state-warn-primary, #b45309); }
@media (max-width: 760px) {
  .ai-planning-grid { grid-template-columns: minmax(0, 1fr); }
  .ai-planning-candidate-source { flex-wrap: wrap; }
  .ai-planning-candidate-url { white-space: normal; overflow-wrap: anywhere; }
}

`
