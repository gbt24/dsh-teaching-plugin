/**
 * Inline interaction runtime for the standalone offline HTML export.
 *
 * The export page is a single file created in Node; browser code cannot import
 * the TypeScript renderers, so interactivity is provided by this small vanilla
 * script. Rendering itself (Markdown, KaTeX, SVG graphs/figures, quiz shells,
 * derivation shell, code editor) is produced at export time by the real
 * `mountActivity` renderers; this runtime only re-attaches the behaviours that
 * would otherwise come from Host callbacks:
 *
 * - graph: parameter sliders redraw the series paths, play/pause animation;
 * - derivation: reveal steps one by one / reveal all and show the conclusion;
 * - quiz: submit a selection, show the answer, explanation and hint;
 * - proof/open tasks: hint, reference answer and rubric self-assessment;
 * - source chips: expand the recorded excerpt;
 * - prose answers: keep the text in the page and say that nothing is recorded.
 *
 * All graph maths is embedded from `graph-lib.ts` source text so the browser
 * runs the same evaluator the tests exercise. The script performs no network
 * request, imports nothing and touches no Host API.
 */
import {
  runtimeBuildSeriesPath, runtimeCompileExpression, runtimeEvaluateExpression, runtimeFormatNumber,
} from './graph-lib.ts'

/** The DOM-facing part of the offline runtime (plain ES2019, no imports). */
const DOM_RUNTIME = String.raw`
function toArray(collection) {
  return Array.prototype.slice.call(collection || []);
}

function byClass(root, name) {
  return toArray(root.getElementsByClassName(name));
}

function byTag(root, name) {
  return toArray(root.getElementsByTagName(name));
}

function firstByClass(root, name) {
  var list = byClass(root, name);
  return list.length > 0 ? list[0] : null;
}

function firstByTag(root, name) {
  var list = byTag(root, name);
  return list.length > 0 ? list[0] : null;
}

function buttonText(button) {
  return (button.textContent || '').replace(/\s+/g, ' ').trim();
}

function findButton(root, text) {
  var buttons = byTag(root, 'button');
  for (var index = 0; index < buttons.length; index += 1) {
    if (buttonText(buttons[index]) === text) return buttons[index];
  }
  return null;
}

function findButtonPrefix(root, prefix) {
  var buttons = byTag(root, 'button');
  for (var index = 0; index < buttons.length; index += 1) {
    if (buttonText(buttons[index]).indexOf(prefix) === 0) return buttons[index];
  }
  return null;
}

function showElement(element) {
  if (element) element.style.display = '';
}

function hideElement(element) {
  if (element) element.style.display = 'none';
}

function setStatus(wrapper, text) {
  var status = firstByClass(wrapper, 'teaching-offline-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'teaching-offline-status';
    wrapper.appendChild(status);
  }
  status.textContent = text;
}

function initGraph(wrapper, entry) {
  var payload = entry.payload || {};
  var layout = entry.layout && entry.layout.graph;
  var series = payload.series || [];
  var paramSpecs = payload.params || [];
  var svg = firstByTag(wrapper, 'svg');
  if (!layout || !svg) return;
  var paths = byTag(svg, 'path');
  var params = {};
  var stateParams = (entry.state && entry.state.params) || {};
  for (var index = 0; index < paramSpecs.length; index += 1) {
    var spec = paramSpecs[index];
    var override = stateParams[spec.name];
    params[spec.name] = typeof override === 'number' && isFinite(override) ? override : spec.value;
  }
  var plotWidth = layout.width - layout.padLeft - layout.padRight;
  var plotHeight = layout.height - layout.padTop - layout.padBottom;
  function projectX(x) {
    return layout.padLeft + ((x - layout.xFrom) / (layout.xTo - layout.xFrom)) * plotWidth;
  }
  function projectY(y) {
    return layout.padTop + ((layout.yTo - y) / (layout.yTo - layout.yFrom)) * plotHeight;
  }
  function redraw() {
    for (var seriesIndex = 0; seriesIndex < paths.length; seriesIndex += 1) {
      var seriesSpec = series[seriesIndex];
      if (!seriesSpec) continue;
      try {
        paths[seriesIndex].setAttribute('d', runtimeBuildSeriesPath(
          String(seriesSpec.expr), params, layout.xFrom, layout.xTo, projectX, projectY, 480,
        ));
      } catch (error) {
        paths[seriesIndex].setAttribute('d', '');
      }
    }
  }
  var rows = byClass(wrapper, 'teaching-graph-param');
  function syncSliders() {
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      var rowSpec = paramSpecs[rowIndex];
      if (!rowSpec) continue;
      var inputs = byTag(rows[rowIndex], 'input');
      var spans = byTag(rows[rowIndex], 'span');
      var slider = inputs.length > 0 ? inputs[0] : null;
      var readout = spans.length > 0 ? spans[spans.length - 1] : null;
      if (slider) slider.value = String(params[rowSpec.name]);
      if (readout) readout.textContent = runtimeFormatNumber(params[rowSpec.name], 3) + (rowSpec.unit || '');
    }
  }
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    (function bindRow(boundIndex) {
      var rowSpec = paramSpecs[boundIndex];
      if (!rowSpec) return;
      var inputs = byTag(rows[boundIndex], 'input');
      var spans = byTag(rows[boundIndex], 'span');
      var slider = inputs.length > 0 ? inputs[0] : null;
      var readout = spans.length > 0 ? spans[spans.length - 1] : null;
      if (!slider) return;
      slider.addEventListener('input', function () {
        var next = Number(slider.value);
        if (!isFinite(next)) return;
        params[rowSpec.name] = Math.min(rowSpec.max, Math.max(rowSpec.min, next));
        if (readout) readout.textContent = runtimeFormatNumber(params[rowSpec.name], 3) + (rowSpec.unit || '');
        redraw();
      });
    })(rowIndex);
  }
  var animation = payload.animation;
  var animationBox = firstByClass(wrapper, 'teaching-graph-animation');
  var playButton = animationBox ? firstByTag(animationBox, 'button') : null;
  if (animation && playButton) {
    var playing = false;
    var startedAt = null;
    var handle = null;
    var raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
      ? function (callback) { return window.requestAnimationFrame(callback); }
      : function (callback) { return setTimeout(function () { callback(Date.now()); }, 16); };
    var caf = (typeof window !== 'undefined' && window.cancelAnimationFrame)
      ? function (value) { window.cancelAnimationFrame(value); }
      : function (value) { clearTimeout(value); };
    var tick = function (now) {
      if (!playing) return;
      if (startedAt === null) startedAt = now;
      var progress = (now - startedAt) / Math.max(1, animation.durationMs);
      var cycle = animation.loop === true ? progress % 1 : Math.min(1, progress);
      params[animation.param] = animation.from + (animation.to - animation.from) * cycle;
      syncSliders();
      redraw();
      if (animation.loop !== true && cycle >= 1) {
        playing = false;
        playButton.textContent = '播放动画';
        return;
      }
      handle = raf(tick);
    };
    playButton.addEventListener('click', function () {
      if (playing) {
        playing = false;
        if (handle !== null) caf(handle);
        handle = null;
        playButton.textContent = '播放动画';
        return;
      }
      playing = true;
      startedAt = null;
      playButton.textContent = '暂停动画';
      handle = raf(tick);
    });
  }
  syncSliders();
  redraw();
  wrapper.setAttribute('data-teaching-enhanced', 'graph');
}

function initDerivation(wrapper, entry) {
  var payload = entry.payload || {};
  var steps = payload.steps || [];
  if (steps.length === 0) return;
  var items = byClass(wrapper, 'teaching-derivation-step');
  var conclusion = firstByClass(wrapper, 'teaching-derivation-conclusion');
  var nextButton = findButton(wrapper, '揭示下一步');
  var allButton = findButton(wrapper, '全部揭示');
  function revealedCount() {
    var count = 0;
    for (var index = 0; index < items.length; index += 1) {
      if (items[index].getAttribute('data-revealed') === 'true') count += 1;
    }
    return count;
  }
  function refresh() {
    var complete = revealedCount() >= steps.length;
    if (nextButton) nextButton.disabled = complete;
    if (allButton) allButton.disabled = complete;
    if (complete) showElement(conclusion);
  }
  function revealItem(item) {
    if (!item || item.getAttribute('data-revealed') === 'true') return false;
    var content = firstByClass(item, 'teaching-offline-step-content');
    var button = firstByTag(item, 'button');
    if (button) button.style.display = 'none';
    if (content) showElement(content);
    item.setAttribute('data-revealed', 'true');
    return true;
  }
  function revealNext() {
    for (var index = 0; index < items.length; index += 1) {
      if (revealItem(items[index])) { refresh(); return; }
    }
  }
  function revealAll() {
    for (var index = 0; index < items.length; index += 1) revealItem(items[index]);
    refresh();
  }
  if (nextButton) nextButton.addEventListener('click', revealNext);
  if (allButton) allButton.addEventListener('click', revealAll);
  wrapper.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || String(target.tagName || '').toLowerCase() !== 'button') return;
    if (buttonText(target).indexOf('揭示第 ') === 0) {
      var item = target;
      while (item && item !== wrapper && byClass(item, 'teaching-derivation-step').length === 0) item = item.parentNode;
      if (item && item !== wrapper) revealItem(item);
      refresh();
    }
  });
  refresh();
  wrapper.setAttribute('data-teaching-enhanced', 'derivation');
}

function initQuiz(wrapper, entry) {
  var payload = entry.payload || {};
  var correctIds = payload.correctOptionIds || [];
  var rows = byClass(wrapper, 'teaching-quiz-option');
  var feedback = firstByClass(wrapper, 'teaching-quiz-feedback');
  var explanation = firstByClass(wrapper, 'teaching-quiz-explanation');
  var hintBox = firstByClass(wrapper, 'teaching-quiz-hint');
  var hintButton = findButton(wrapper, '给提示');
  var revealButton = findButton(wrapper, '看完整答案');
  var submitButton = findButton(wrapper, '提交答案');
  function selectedIds() {
    var selected = [];
    var inputs = byTag(wrapper, 'input');
    for (var index = 0; index < inputs.length; index += 1) {
      if (inputs[index].checked) selected.push(inputs[index].value);
    }
    return selected;
  }
  function labelOf(optionId) {
    var options = payload.options || [];
    for (var index = 0; index < options.length; index += 1) {
      if (options[index].id === optionId) return options[index].label;
    }
    return optionId;
  }
  function paint(reveal) {
    var selected = selectedIds();
    for (var index = 0; index < rows.length; index += 1) {
      var inputs = byTag(rows[index], 'input');
      var spans = byTag(rows[index], 'span');
      var input = inputs.length > 0 ? inputs[0] : null;
      var suffix = spans.length > 0 ? spans[spans.length - 1] : null;
      if (!input) continue;
      var optionId = input.value;
      var correct = correctIds.indexOf(optionId) >= 0;
      var chosen = selected.indexOf(optionId) >= 0;
      if (!reveal) {
        rows[index].style.borderColor = '';
        if (suffix) suffix.textContent = '';
        continue;
      }
      rows[index].style.borderColor = correct ? '#16a34a' : (chosen ? '#dc2626' : '');
      if (suffix) suffix.textContent = correct ? '✓ 正确选项' : (chosen ? '✗ 你的选择不正确' : '');
    }
  }
  function submit() {
    var selected = selectedIds();
    if (selected.length === 0) {
      if (feedback) feedback.textContent = '请先选择至少一个选项。';
      return;
    }
    var allSelectedCorrect = true;
    for (var index = 0; index < selected.length; index += 1) {
      if (correctIds.indexOf(selected[index]) < 0) allSelectedCorrect = false;
    }
    var allCorrectSelected = selected.length === correctIds.length;
    for (var correctIndex = 0; correctIndex < correctIds.length; correctIndex += 1) {
      if (selected.indexOf(correctIds[correctIndex]) < 0) allCorrectSelected = false;
    }
    var correct = allSelectedCorrect && allCorrectSelected;
    if (feedback) {
      feedback.textContent = '离线页面：作答不会回传 Harness。'
        + (correct ? '你的选择与参考答案一致。' : '你的选择与参考答案不一致；可点「看完整答案」核对。');
    }
  }
  function revealAnswer() {
    paint(true);
    var labels = [];
    for (var index = 0; index < correctIds.length; index += 1) labels.push(labelOf(correctIds[index]));
    if (feedback) feedback.textContent = '正确答案：' + labels.join('、');
    showElement(explanation);
    hideElement(revealButton);
  }
  if (submitButton) submitButton.addEventListener('click', submit);
  if (revealButton) revealButton.addEventListener('click', revealAnswer);
  if (hintButton) {
    hintButton.addEventListener('click', function () {
      showElement(hintBox);
      hideElement(hintButton);
    });
  }
  wrapper.setAttribute('data-teaching-enhanced', 'quiz');
}

function appendRubricSelfCheck(wrapper) {
  var rubrics = byClass(wrapper, 'teaching-rubric');
  for (var rubricIndex = 0; rubricIndex < rubrics.length; rubricIndex += 1) {
    var lists = byTag(rubrics[rubricIndex], 'ul');
    if (lists.length === 0) continue;
    var items = byTag(lists[0], 'li');
    for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      (function bindItem(item) {
        var toggle = document.createElement('button');
        toggle.className = 'teaching-offline-selfcheck';
        toggle.setAttribute('type', 'button');
        toggle.textContent = '☐ 自评达成';
        toggle.addEventListener('click', function () {
          var active = toggle.getAttribute('data-checked') === 'true';
          toggle.setAttribute('data-checked', active ? 'false' : 'true');
          toggle.textContent = active ? '☐ 自评达成' : '☑ 自评达成';
        });
        item.appendChild(document.createTextNode(' '));
        item.appendChild(toggle);
      })(items[itemIndex]);
    }
    var note = document.createElement('div');
    note.className = 'teaching-offline-selfcheck-note';
    note.textContent = '离线自评只用于个人复盘，不会写入掌握记录。';
    rubrics[rubricIndex].appendChild(note);
  }
}

function initAnswerTask(wrapper) {
  var hintButton = findButton(wrapper, '给提示');
  var hintBox = firstByClass(wrapper, 'teaching-hint');
  if (hintButton) {
    hintButton.addEventListener('click', function () {
      showElement(hintBox);
      hideElement(hintButton);
    });
  }
  var revealButton = findButton(wrapper, '看完整答案');
  var referenceBox = firstByClass(wrapper, 'teaching-reference');
  if (revealButton) {
    revealButton.addEventListener('click', function () {
      showElement(referenceBox);
      hideElement(revealButton);
    });
  }
  var submitButton = findButton(wrapper, '提交回答');
  if (submitButton) {
    submitButton.addEventListener('click', function () {
      var textarea = firstByTag(wrapper, 'textarea');
      if (textarea && textarea.value.trim() === '') {
        setStatus(wrapper, '请先写下回答。');
        return;
      }
      setStatus(wrapper, '离线页面：回答不会回传 Harness；请自行保存或复制。');
    });
  }
  wrapper.setAttribute('data-teaching-enhanced', 'answer-task');
}

function initAnchorChips(root) {
  var chips = byClass(root, 'teaching-anchor-chip');
  for (var index = 0; index < chips.length; index += 1) {
    (function bindChip(chip) {
      chip.addEventListener('click', function () {
        var row = chip.parentNode;
        var existing = row ? row.getElementsByClassName('teaching-anchor-excerpt') : [];
        var wasOpen = existing.length > 0;
        for (var existingIndex = existing.length - 1; existingIndex >= 0; existingIndex -= 1) {
          existing[existingIndex].parentNode.removeChild(existing[existingIndex]);
        }
        if (wasOpen) return;
        var excerpt = document.createElement('div');
        excerpt.className = 'teaching-anchor-excerpt';
        var text = chip.getAttribute('title');
        excerpt.textContent = text && text !== '' ? '原文摘录：' + text : '（这份资料没有保存摘录）';
        if (row) row.appendChild(excerpt);
      });
    })(chips[index]);
  }
}

function initAll(root) {
  var data = (typeof window !== 'undefined' && window.__TEACHING_OFFLINE_DATA__) || { activities: [] };
  var entries = {};
  var list = data.activities || [];
  for (var index = 0; index < list.length; index += 1) entries[list[index].activityId] = list[index];
  var wrappers = byClass(root, 'teaching-activity');
  for (var wrapperIndex = 0; wrapperIndex < wrappers.length; wrapperIndex += 1) {
    var wrapper = wrappers[wrapperIndex];
    var entry = entries[wrapper.getAttribute('data-activity-id')];
    if (!entry) continue;
    try {
      if (entry.kind === 'graph') initGraph(wrapper, entry);
      else if (entry.kind === 'derivation') initDerivation(wrapper, entry);
      else if (entry.kind === 'quiz') initQuiz(wrapper, entry);
      else if (entry.kind === 'proof-task' || entry.kind === 'open-question') initAnswerTask(wrapper);
      else if (entry.kind === 'reading-task') initAnswerTask(wrapper);
    } catch (error) {
      wrapper.setAttribute('data-teaching-runtime-error', 'true');
    }
    appendRubricSelfCheck(wrapper);
  }
  initAnchorChips(root);
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-teaching-runtime-ready', 'true');
}

function boot() {
  initAll(document);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}

if (typeof window !== 'undefined') {
  window.__TeachingOfflineRuntime = {
    version: 1,
    initGraph: initGraph,
    initDerivation: initDerivation,
    initQuiz: initQuiz,
    initAnswerTask: initAnswerTask,
    initAll: initAll,
    boot: boot,
  };
}
`

/**
 * Build the inline `<script>` body for one exported page.
 *
 * The three graph functions are embedded as source text so they cannot drift
 * from the tested implementations. Everything else is plain ES2019 using only
 * `document`, `window.requestAnimationFrame` and `setTimeout`.
 */
export function buildOfflineRuntimeScript(): string {
  const embedded = [
    runtimeFormatNumber,
    runtimeCompileExpression,
    runtimeEvaluateExpression,
    runtimeBuildSeriesPath,
  ].map((fn) => fn.toString()).join('\n\n')
  return `(function () {\n'use strict';\n\n${embedded}\n${DOM_RUNTIME}\n})();\n`
}
