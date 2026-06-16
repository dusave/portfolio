import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ROLES, QUALIFIERS, KEYS, KEYWORDS, AUTHORS, LABELS, SUGGEST_VALUES, site } from "../data/site";

const PINK = "#ff2d78";
const BLUE = "#2d6bff";
const PURPLE = "#a855f7";
const GREEN = "#3ddc97";
const RED = "#d98668";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ramp = (p, a, b) => clamp01((p - a) / (b - a));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const SECTION_HASHES = { production: 1, language: 2, record: 3, contact: 4 };

function getSectionScrollTarget(i, wrapper, vh, lastIndex) {
  if (!wrapper) return 0;
  if (i === 0) return 0;
  if (i === lastIndex) return wrapper.offsetTop + (wrapper.offsetHeight - vh);
  return wrapper.offsetTop + (wrapper.offsetHeight - vh) * 0.58;
}

function SectionTag({ hash, sectionIndex, color, onNavigate, children }) {
  return (
    <a
      href={hash ? `#${hash}` : "/"}
      className="section-tag"
      style={{ ...S.tag, color, display: "block" }}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(sectionIndex, hash);
      }}
    >
      {children}
    </a>
  );
}

// --------------------------- Filter demo (embedded) -------------------------
// Suggestion pools + qualifier rules live in src/data/site.ts

// tokenize: parens are their own tokens; everything else splits on whitespace
function tokenize(input) {
  return input.match(/\(|\)|[^\s()]+/g) || [];
}

function parse(input) {
  const raws = tokenize(input);
  let depth = 0;
  let unbalanced = false;
  const tokens = raws.map((raw) => {
    if (raw === "(") { depth++; return { raw, status: "paren" }; }
    if (raw === ")") { depth--; if (depth < 0) unbalanced = true; return { raw, status: "paren" }; }
    if (KEYWORDS.includes(raw)) return { raw, status: "keyword" };
    if (KEYWORDS.includes(raw.toUpperCase())) return { raw, status: "text", hint: `tip: keywords are uppercase — ${raw.toUpperCase()}` };
    const idx = raw.indexOf(":");
    if (idx === -1) return { raw, status: "text" };
    const key = raw.slice(0, idx).toLowerCase();
    const valuePart = raw.slice(idx + 1).replace(/^"|"$/g, "");
    if (!(key in QUALIFIERS)) return { raw, key, value: valuePart, status: "error", msg: `unknown qualifier "${key}"` };
    const allowed = QUALIFIERS[key];
    const values = splitQualifierValues(raw.slice(idx + 1));
    if (values.length === 0 || values.some((v) => v === "")) {
      return { raw, key, value: valuePart, values, status: "error", msg: `"${key}" needs a value` };
    }
    const bad = values.find((v) => allowed && !allowed.includes(v));
    if (bad) return { raw, key, value: bad, values, status: "error", msg: `"${bad}" not valid for ${key}` };
    return { raw, key, value: values[values.length - 1], values, status: "ok" };
  });
  if (depth !== 0) unbalanced = true;
  return { tokens, unbalanced };
}

const FILTER_VALUE = "#79c0ff";
const FILTER_WARN = "#e3b341";
const FILTER_INPUT = { fontSize: 13.5, lineHeight: 1.4, fontFamily: "inherit" };
const LABEL_HINTS = {
  bug: "Something isn't working",
  documentation: "Improvements or additions to documentation",
  dependencies: "Pull requests that update a dependency file",
  design: "Design-related issue",
  enhancement: "New feature or request",
};
const LABEL_COLORS = {
  bug: "#d73a4a",
  documentation: "#0075ca",
  dependencies: "#0366d6",
  design: "#d4c5f9",
  enhancement: "#a2eeef",
};

function splitQualifierValues(valuePart) {
  return valuePart.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
}

function formatQualifierValue(value) {
  return value.includes(" ") ? `"${value}"` : value;
}

function getInvalidHighlights(input) {
  const { tokens, unbalanced } = parse(input);
  const invalidValues = new Map();
  tokens.forEach((t) => {
    if (t.status !== "error" || !t.key) return;
    const idx = t.raw.indexOf(":");
    const valuesPart = t.raw.slice(idx + 1);
    const allowed = QUALIFIERS[t.key];
    const values = splitQualifierValues(valuesPart);
    const bad = new Set();
    if (!(t.key in QUALIFIERS)) {
      values.forEach((v) => { if (v) bad.add(v); });
    } else {
      values.forEach((v) => {
        if (v && allowed && !allowed.includes(v)) bad.add(v);
      });
    }
    if (bad.size) invalidValues.set(t.raw, bad);
  });
  return { invalidValues, unbalanced };
}

function filterHighlightParts(input) {
  const { invalidValues, unbalanced } = getInvalidHighlights(input);
  const parts = [];
  const re = /\(|\)|[^\s()]+|\s+/g;
  let m;
  while ((m = re.exec(input)) !== null) {
    const raw = m[0];
    if (/^\s+$/.test(raw)) { parts.push({ text: raw, kind: "space" }); continue; }
    if (raw === "(" || raw === ")") {
      parts.push({ text: raw, kind: unbalanced ? "warn" : "paren" });
      continue;
    }
    if (KEYWORDS.includes(raw)) { parts.push({ text: raw, kind: "keyword" }); continue; }
    const idx = raw.indexOf(":");
    if (idx !== -1) {
      parts.push({ text: raw.slice(0, idx + 1), kind: "key" });
      const invalidSet = invalidValues.get(raw);
      const valuesStr = raw.slice(idx + 1);
      if (valuesStr) {
        const vals = valuesStr.split(",");
        vals.forEach((val, i) => {
          if (i > 0) parts.push({ text: ",", kind: "sep" });
          if (val) {
            const clean = val.replace(/^"|"$/g, "");
            const isWarn = invalidSet?.has(clean) || invalidSet?.has(val);
            parts.push({ text: val, kind: isWarn ? "warn" : "value" });
          }
        });
      }
    } else {
      parts.push({ text: raw, kind: "plain" });
    }
  }
  return parts;
}

function highlightColor(kind) {
  if (kind === "value") return FILTER_VALUE;
  if (kind === "warn") return FILTER_WARN;
  if (kind === "keyword") return PURPLE;
  if (kind === "paren" || kind === "sep") return "#8c887d";
  return "#ece9e1";
}

function getValueSegments(valuesPart) {
  const segments = [];
  let segStart = 0;
  for (let i = 0; i <= valuesPart.length; i++) {
    if (i === valuesPart.length || valuesPart[i] === ",") {
      segments.push({ raw: valuesPart.slice(segStart, i), start: segStart, end: i });
      segStart = i + 1;
    }
  }
  return segments;
}

function getCaretContext(input, caret) {
  const pos = Math.max(0, Math.min(caret ?? input.length, input.length));
  const atBoundary = (pos === 0 || /[\s(]/.test(input[pos - 1]))
    && (pos === input.length || /[\s)]/.test(input[pos]));
  if (atBoundary) {
    return { mode: "new", partial: "", start: pos, end: pos, anchorStart: pos };
  }

  let start = pos;
  while (start > 0 && !/[\s(]/.test(input[start - 1])) start--;
  let end = pos;
  while (end < input.length && !/[\s)]/.test(input[end])) end++;

  const token = input.slice(start, end);
  const colonIdx = token.indexOf(":");

  if (colonIdx !== -1 && pos > start + colonIdx) {
    const keyRaw = token.slice(0, colonIdx);
    const valuesPart = token.slice(colonIdx + 1);
    const valueOffset = pos - start - colonIdx - 1;
    const segments = getValueSegments(valuesPart);
    const activeIdx = segments.findIndex((s) => valueOffset >= s.start && valueOffset <= s.end);
    const idx = activeIdx === -1 ? Math.max(0, segments.length - 1) : activeIdx;
    const activeSeg = segments[idx];
    const offsetInSeg = valueOffset - activeSeg.start;
    const partial = activeSeg.raw.slice(0, offsetInSeg).replace(/^"|"$/g, "");
    const excluded = segments
      .filter((_, i) => i !== idx)
      .map((s) => s.raw.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
    return {
      mode: "value",
      partial,
      start,
      end,
      keyRaw,
      key: keyRaw.toLowerCase(),
      excluded,
      anchorStart: start + colonIdx + 1 + activeSeg.start,
      activeIdx: idx,
      segments,
      valuesPart,
    };
  }

  const partial = input.slice(start, pos);
  return { mode: "key", partial, start, end, anchorStart: start, token };
}

function getSuggestionAnchorText(input, caret) {
  const ctx = getCaretContext(input, caret);
  return input.slice(0, ctx.anchorStart);
}

function shouldShowSuggestions(suggestions, ctx) {
  if (suggestions.length === 0) return false;
  if (suggestions.length !== 1) return true;
  const s = suggestions[0];
  if (ctx.mode === "value") {
    return !(s.value && s.value.toLowerCase() === ctx.partial.toLowerCase());
  }
  if (ctx.mode === "key" || ctx.mode === "new") {
    const partial = ctx.partial.toLowerCase();
    const text = s.text.toLowerCase();
    if (s.kind === "key") return text !== `${partial}:`;
    return text !== partial;
  }
  return true;
}

function buildValueToken(ctx, pickedValue) {
  const fmt = formatQualifierValue(pickedValue);
  const segments = ctx.segments.map((s, i) => (i === ctx.activeIdx ? fmt : s.raw));
  return `${ctx.keyRaw}:${segments.join(",")}`;
}

function applyFilterSuggestion(input, caret, suggestion) {
  const ctx = getCaretContext(input, caret);
  if (ctx.mode === "value") {
    const picked = suggestion.value ?? suggestion.text.split(":").pop()?.replace(/^"|"$/g, "");
    const newToken = buildValueToken(ctx, picked);
    const rest = input.slice(ctx.end);
    const space = rest === "" && !suggestion.text.endsWith(":") && !suggestion.text.endsWith(",") ? " " : "";
    return input.slice(0, ctx.start) + newToken + rest + space;
  }
  const trail = input.slice(caret);
  const space = trail === "" && !suggestion.text.endsWith(":") ? " " : "";
  return input.slice(0, ctx.start) + suggestion.text + trail + space;
}

function getFilterSuggestions(input, caret = input.length) {
  const ctx = getCaretContext(input, caret);
  let suggestions = [];

  if (ctx.mode === "value") {
    const { keyRaw, key, partial, excluded } = ctx;
    const pool = SUGGEST_VALUES[key] || [];
    const excludedSet = new Set(excluded);
    suggestions = pool
      .filter((a) => a.toLowerCase().startsWith(partial.toLowerCase()) && !excludedSet.has(a))
      .map((a) => {
        const fmt = formatQualifierValue(a);
        return {
          text: buildValueToken(ctx, a),
          kind: ctx.activeIdx > 0 ? "commaValue" : "value",
          meta: key,
          value: a,
          display: fmt,
        };
      });
    if (key === "label") {
      suggestions = [
        { text: "no:label", kind: "meta", meta: "No label", icon: "○" },
        { text: "has:label", kind: "meta", meta: "Has label", icon: "●" },
        ...suggestions,
      ];
    }
  } else if (ctx.partial) {
    suggestions = [
      ...KEYS.filter((k) => k.startsWith(ctx.partial.toLowerCase())).map((k) => ({
        text: k + ":", kind: "key", meta: "qualifier", display: k.charAt(0).toUpperCase() + k.slice(1) + ":",
      })),
      ...KEYWORDS.filter((k) => k.startsWith(ctx.partial.toUpperCase())).map((k) => ({ text: k, kind: "keyword", meta: "operator" })),
    ];
  } else {
    suggestions = KEYS.map((k) => ({
      text: k + ":", kind: "key", meta: "qualifier", display: k.charAt(0).toUpperCase() + k.slice(1) + ":",
    })).concat(KEYWORDS.map((k) => ({ text: k, kind: "keyword", meta: "operator" })));
  }

  return { suggestions, ctx };
}

function SuggestionText({ text, kind, display }) {
  if (kind === "key") {
    return <span style={{ color: "#ece9e1" }}>{display || text}</span>;
  }
  if (kind === "commaValue") {
    return <span style={{ color: FILTER_VALUE }}>{display || text}</span>;
  }
  if (kind === "value") {
    const colon = text.indexOf(":");
    return (
      <>
        <span style={{ color: "#ece9e1" }}>{text.slice(0, colon + 1)}</span>
        <span style={{ color: FILTER_VALUE }}>{text.slice(colon + 1)}</span>
      </>
    );
  }
  if (kind === "meta") {
    const colon = text.indexOf(":");
    if (colon === -1) return <span style={{ color: "#ece9e1" }}>{text}</span>;
    return (
      <>
        <span style={{ color: "#ece9e1" }}>{text.slice(0, colon + 1)}</span>
        <span style={{ color: FILTER_VALUE }}>{text.slice(colon + 1)}</span>
      </>
    );
  }
  const color = kind === "keyword" ? PURPLE : kind === "key" ? "#ece9e1" : "#ece9e1";
  return <span style={{ color }}>{text}</span>;
}

function FilterValidationIcon({ mode }) {
  const warnOn = mode === "warning";
  const checkOn = mode === "check";
  return (
    <span className="filter-val-icon-wrap">
      <svg className={`filter-val-icon filter-val-icon--warn${warnOn ? "" : " filter-val-icon--off"}`} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 110 2 1 1 0 010-2z" />
      </svg>
      <svg className={`filter-val-icon filter-val-icon--check${checkOn ? "" : " filter-val-icon--off"}`} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
      </svg>
    </span>
  );
}

function FilterValidationControl({ issues }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const isWarning = issues.length > 0;
  const iconMode = isWarning ? "warning" : "check";

  useEffect(() => {
    if (!isWarning) setOpen(false);
  }, [isWarning]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className={`filter-val-btn ${isWarning ? "filter-val-btn--warn" : "filter-val-btn--valid"}`}
        aria-label={isWarning ? `${issues.length} validation issue${issues.length > 1 ? "s" : ""}` : "Query valid"}
        aria-expanded={isWarning ? open : undefined}
        disabled={!isWarning}
        onClick={isWarning ? () => setOpen((o) => !o) : undefined}
      >
        <FilterValidationIcon mode={iconMode} />
      </button>
      {open && isWarning && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            zIndex: 35,
            minWidth: 240,
            maxWidth: 300,
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.45)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 12px", fontSize: 11.5, color: FILTER_WARN, borderBottom: "1px solid #21262d" }}>
            {issues.length} issue{issues.length > 1 ? "s" : ""}
          </div>
          {issues.map((msg, i) => (
            <div
              key={i}
              style={{
                padding: "9px 12px",
                fontSize: 12,
                color: "#b9a08f",
                lineHeight: 1.5,
                borderBottom: i < issues.length - 1 ? "1px solid #21262d" : "none",
              }}
            >
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterHighlightedText({ input, showCaret }) {
  const parts = filterHighlightParts(input);
  return (
    <span style={{ ...FILTER_INPUT, whiteSpace: "nowrap", display: "inline-block" }}>
      {parts.map((p, i) => (
        <span key={i} style={{ color: highlightColor(p.kind) }}>{p.text}</span>
      ))}
      {!input && "\u00a0"}
      {showCaret && (
        <span style={{ borderLeft: "1.5px solid " + BLUE, marginLeft: 1, animation: "blink 1s step-end infinite" }} />
      )}
    </span>
  );
}

function FilterScrollInput({ input, interactive = true, showCaret = false, onChange, onKeyDown, inputRef, onScrollChange, onFocusChange, onCaretChange, spellCheck, ariaLabel }) {
  const containerRef = useRef(null);
  const highlightRef = useRef(null);
  const mirrorRef = useRef(null);
  const localInputRef = useRef(null);

  const updateScroll = useCallback(() => {
    const container = containerRef.current;
    const highlightEl = highlightRef.current;
    const mirror = mirrorRef.current;
    if (!container || !highlightEl) return;

    let scroll = 0;
    if (interactive && localInputRef.current && mirror) {
      const inputEl = localInputRef.current;
      const sel = inputEl.selectionStart ?? input.length;
      mirror.textContent = inputEl.value.slice(0, sel) || "\u00a0";
      const caretX = mirror.offsetWidth;
      const viewWidth = container.clientWidth;
      scroll = highlightEl.scrollLeft;
      if (caretX > scroll + viewWidth) scroll = caretX - viewWidth;
      else if (caretX < scroll) scroll = Math.max(0, caretX);
      inputEl.scrollLeft = scroll;
    } else {
      scroll = Math.max(0, highlightEl.scrollWidth - container.clientWidth);
    }
    highlightEl.scrollLeft = scroll;
    onScrollChange?.(scroll);
  }, [input, interactive, onScrollChange]);

  useEffect(() => {
    updateScroll();
  }, [input, updateScroll]);

  const assignInputRef = (el) => {
    localInputRef.current = el;
    if (typeof inputRef === "function") inputRef(el);
    else if (inputRef) inputRef.current = el;
  };

  const bumpCaret = () => {
    const pos = localInputRef.current?.selectionStart ?? input.length;
    onCaretChange?.(pos);
    requestAnimationFrame(updateScroll);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, minHeight: 20, minWidth: 0, overflow: "hidden" }}>
      <span
        ref={mirrorRef}
        aria-hidden
        style={{ position: "absolute", visibility: "hidden", whiteSpace: "pre", pointerEvents: "none", ...FILTER_INPUT }}
      />
      <div
        ref={highlightRef}
        aria-hidden
        style={{ overflow: "hidden", whiteSpace: "nowrap", width: "100%", ...FILTER_INPUT }}
      >
        <FilterHighlightedText input={input} showCaret={showCaret && !interactive} />
      </div>
      {interactive && (
        <input
          ref={assignInputRef}
          value={input}
          onChange={(e) => { onChange?.(e); bumpCaret(); }}
          onKeyDown={onKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onSelect={bumpCaret}
          onClick={bumpCaret}
          onKeyUp={bumpCaret}
          spellCheck={spellCheck}
          aria-label={ariaLabel}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            background: "transparent", border: "none", outline: "none",
            color: "transparent", caretColor: "#ece9e1",
            fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.4,
            padding: 0, margin: 0, overflow: "hidden",
          }}
        />
      )}
    </div>
  );
}

function FilterSuggestions({ input, caret, active, onPick, onActive, interactive, scrollLeft = 0 }) {
  const mirrorRef = useRef(null);
  const anchorText = getSuggestionAnchorText(input, caret);
  const anchorKey = `${anchorText}|${caret}|${scrollLeft}`;
  const [anchor, setAnchor] = useState({ key: "", left: null });
  const { suggestions } = getFilterSuggestions(input, caret);
  const visible = suggestions.slice(0, 6);

  useLayoutEffect(() => {
    setAnchor({ key: anchorKey, left: mirrorRef.current?.offsetWidth ?? 0 });
  }, [anchorKey]);

  const isPositioned = anchor.key === anchorKey && anchor.left !== null;

  if (visible.length === 0) return null;

  return (
    <>
      <span
        ref={mirrorRef}
        aria-hidden
        style={{ position: "absolute", visibility: "hidden", whiteSpace: "pre", pointerEvents: "none", ...FILTER_INPUT }}
      >
        {anchorText}
      </span>
      {isPositioned && (
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: Math.max(14, 37 + anchor.left - scrollLeft),
          marginTop: 4,
          zIndex: 30,
          minWidth: 220,
          maxWidth: 280,
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,.45)",
          overflow: "hidden",
          pointerEvents: interactive ? "auto" : "none",
        }}
      >
        {visible.map((s, idx) => {
          const labelValue = s.kind === "value" ? s.value : null;
          const dotColor = s.kind === "keyword" ? PURPLE
            : s.kind === "key" ? BLUE
              : labelValue && LABEL_COLORS[labelValue] ? LABEL_COLORS[labelValue]
                : s.kind === "value" ? FILTER_VALUE : "#8c887d";
          return (
            <button
              key={s.text}
              type="button"
              onClick={interactive ? () => onPick?.(s.text) : undefined}
              onMouseEnter={interactive ? () => onActive?.(idx) : undefined}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                width: "100%",
                textAlign: "left",
                background: idx === active ? "#21262d" : "transparent",
                border: "none",
                borderBottom: "1px solid #21262d",
                color: "#ece9e1",
                fontFamily: "inherit",
                fontSize: 13,
                padding: "9px 12px",
                cursor: interactive ? "pointer" : "default",
              }}
            >
              {s.kind === "meta" ? (
                <span style={{ width: 14, textAlign: "center", color: "#8c887d", flexShrink: 0, marginTop: 2 }}>{s.icon}</span>
              ) : (
                <span style={{
                  width: 10, height: 10, borderRadius: s.meta === "label" ? 2 : "50%",
                  background: dotColor, flexShrink: 0, marginTop: 4,
                }} />
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 500, lineHeight: 1.3 }}>
                  <SuggestionText text={s.text} kind={s.kind} display={s.display} />
                </span>
                {labelValue && LABEL_HINTS[labelValue] && (
                  <span style={{ display: "block", fontSize: 11.5, color: "#8b949e", marginTop: 2, lineHeight: 1.35 }}>
                    {LABEL_HINTS[labelValue]}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      )}
    </>
  );
}

// AND binds tighter than OR — same precedence as the production filter.
function buildFilterAst(raws) {
  let i = 0;
  const peek = () => raws[i];
  const take = () => raws[i++];

  function parseExpr() {
    let node = parseAnd();
    while (peek() === "OR") {
      const opIdx = i;
      take();
      node = { kind: "op", op: "OR", opIdx, left: node, right: parseAnd() };
    }
    return node;
  }
  function parseAnd() {
    let node = parsePrimary();
    while (peek() === "AND") {
      const opIdx = i;
      take();
      node = { kind: "op", op: "AND", opIdx, left: node, right: parsePrimary() };
    }
    return node;
  }
  function parsePrimary() {
    if (peek() === "(") {
      const openIdx = i;
      take();
      const expr = parseExpr();
      let closeIdx = null;
      if (peek() === ")") { closeIdx = i; take(); }
      return { kind: "group", openIdx, closeIdx, expr };
    }
    if (peek() === undefined) return null;
    const idx = i;
    return { kind: "leaf", raw: take(), idx };
  }

  if (!raws.length) return null;
  return parseExpr();
}

function flattenAst(node, depth = 0, rows = []) {
  if (!node) return rows;
  if (node.kind === "op") {
    rows.push({ kind: "op", op: node.op, depth, revealAt: node.opIdx });
    flattenAst(node.left, depth + 1, rows);
    flattenAst(node.right, depth + 1, rows);
    return rows;
  }
  if (node.kind === "group") {
    rows.push({ kind: "paren", raw: "(", depth, revealAt: node.openIdx });
    flattenAst(node.expr, depth + 1, rows);
    if (node.closeIdx != null) rows.push({ kind: "paren", raw: ")", depth, revealAt: node.closeIdx });
    return rows;
  }
  rows.push({ kind: "leaf", raw: node.raw, depth, revealAt: node.idx });
  return rows;
}

const FILTER_MOBILE_QUERY = "is:open AND (label:bug OR label:design)";
const FILTER_MOBILE_AST = buildFilterAst(tokenize(FILTER_MOBILE_QUERY));
const FILTER_MOBILE_AST_ROWS = flattenAst(FILTER_MOBILE_AST);
const FILTER_FOOTER_NOTE = "mock suggestion data · production runs against live repo metadata";

function FilterAstTree({ tokenCount }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minHeight: 180, justifyContent: "flex-start" }}>
      {FILTER_MOBILE_AST_ROWS.map((row, i) => {
        const revealed = tokenCount > row.revealAt;
        const pad = 10 + row.depth * 14;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingLeft: pad,
              minHeight: 22,
              opacity: revealed ? 1 : 0,
              transition: "opacity .18s ease-out",
              fontSize: 12.5,
              fontFamily: "inherit",
            }}
          >
            {row.depth > 0 && (
              <span style={{ color: "#3a4258", fontSize: 10, width: 10, flexShrink: 0 }}>└</span>
            )}
            {row.kind === "leaf" ? (
              (() => {
                const colon = row.raw.indexOf(":");
                if (colon === -1) return <span style={{ color: "#ece9e1" }}>{row.raw}</span>;
                return (
                  <>
                    <span style={{ color: "#ece9e1" }}>{row.raw.slice(0, colon + 1)}</span>
                    <span style={{ color: FILTER_VALUE }}>{row.raw.slice(colon + 1)}</span>
                  </>
                );
              })()
            ) : row.kind === "op" ? (
              <span style={{ color: PURPLE, fontWeight: 500 }}>{row.op}</span>
            ) : (
              <span style={{ color: "#8c887d" }}>{row.raw}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FilterDemo() {
  const [input, setInput] = useState("is:open AND (label:bug OR label:design)");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(true);
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(input.length);
  const [inputScrollLeft, setInputScrollLeft] = useState(0);
  const { tokens, unbalanced } = parse(input);
  const errors = tokens.filter((t) => t.status === "error");
  const hint = tokens.find((t) => t.hint)?.hint;
  const { suggestions, ctx } = getFilterSuggestions(input, caret);
  const visible = suggestions.slice(0, 6);
  const showDrop = focused && open && shouldShowSuggestions(suggestions, ctx);

  const apply = (text) => {
    const el = inputRef.current;
    const pos = el?.selectionStart ?? caret;
    const match = visible.find((s) => s.text === text) || suggestions.find((s) => s.text === text);
    if (!match) return;
    setInput(applyFilterSuggestion(input, pos, match));
    setActive(0);
    setOpen(true);
  };

  const onChange = (e) => {
    setInput(e.target.value);
    setCaret(e.target.selectionStart ?? e.target.value.length);
    setActive(0);
    setOpen(true);
  };

  useEffect(() => { setActive(0); }, [caret]);

  const inputRef = useRef(null);
  const onKeyDown = (e) => {
    if (e.key === "(") {
      e.preventDefault();
      const el = e.target;
      const a = el.selectionStart, b = el.selectionEnd;
      const next = input.slice(0, a) + "()" + input.slice(b);
      setInput(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 1; });
      return;
    }
    if (!showDrop) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % visible.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + visible.length) % visible.length); }
    else if (e.key === "Enter" || e.key === "Tab") {
      if (visible[active]) { e.preventDefault(); apply(visible[active].text); }
    }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  };

  const issues = [];
  errors.forEach((e) => issues.push(e.msg));
  if (unbalanced) issues.push("Unbalanced parentheses");
  const okCount = tokens.filter((t) => t.status === "ok").length;

  return (
    <div style={{ border: "1px solid #273048", borderRadius: 8, background: "#0a0d18", maxWidth: 620, position: "relative", overflow: "visible" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #273048", minHeight: 45, zIndex: 31 }}>
        <span style={{ color: "#5d6680", fontSize: 13, flexShrink: 0 }}>⌕</span>
        <FilterScrollInput
          input={input}
          onChange={onChange}
          onKeyDown={onKeyDown}
          inputRef={inputRef}
          onScrollChange={setInputScrollLeft}
          onFocusChange={setFocused}
          onCaretChange={setCaret}
          spellCheck={false}
          ariaLabel="Try the filter syntax"
        />
        <FilterValidationControl issues={issues} />
        {showDrop && (
          <FilterSuggestions
            input={input}
            caret={caret}
            active={active}
            onPick={apply}
            onActive={setActive}
            interactive
            scrollLeft={inputScrollLeft}
          />
        )}
      </div>
      <div style={{ borderTop: "1px solid #273048", padding: "10px 14px 12px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#5d6680" }}>parsed as</p>
        <FilterAstTree tokenCount={tokens.length} />
      </div>
      <div style={{ borderTop: "1px solid #273048", padding: "8px 14px", fontSize: 11, color: "#5d6680" }}>
        {hint || `${okCount} qualifier(s) valid · ${FILTER_FOOTER_NOTE}`}
      </div>
    </div>
  );
}

// ------------------------------- main page ----------------------------------
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px), (pointer: coarse)");
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

// Mobile: the Filter is desktop-only to play with, so we auto-perform it —
// a non-interactive "dramatic reenactment" that types itself, plus a note.
function FilterMobile() {
  const [len, setLen] = useState(0);
  const [active, setActive] = useState(0);
  const [inputScrollLeft, setInputScrollLeft] = useState(0);
  useEffect(() => {
    let i = 0, raf, last = 0;
    const step = (ts) => {
      raf = requestAnimationFrame(step);
      if (ts - last < 80) return;
      last = ts;
      i = i >= FILTER_MOBILE_QUERY.length + 22 ? 0 : i + 1;
      setLen(Math.min(i, FILTER_MOBILE_QUERY.length));
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  const input = FILTER_MOBILE_QUERY.slice(0, len);
  const caret = len;
  const { tokens } = parse(input);
  const { suggestions, ctx } = getFilterSuggestions(input, caret);
  const showDrop = shouldShowSuggestions(suggestions, ctx);

  useEffect(() => {
    if (!showDrop) return;
    const id = setInterval(() => setActive((a) => (a + 1) % Math.min(suggestions.length, 6)), 900);
    return () => clearInterval(id);
  }, [showDrop, suggestions.length]);

  return (
    <div style={{ border: "1px solid #273048", borderRadius: 8, background: "#0a0d18", overflow: "visible", maxWidth: 620, position: "relative" }}>
      <div style={{ position: "relative", borderBottom: "1px solid #273048", zIndex: 31 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", minHeight: 45 }}>
          <span style={{ color: "#5d6680", fontSize: 13, flexShrink: 0 }}>⌕</span>
          <FilterScrollInput
            input={input}
            interactive={false}
            showCaret
            onScrollChange={setInputScrollLeft}
          />
        </div>
        {showDrop && (
          <FilterSuggestions input={input} caret={caret} active={active} interactive={false} scrollLeft={inputScrollLeft} />
        )}
      </div>
      <div style={{ borderTop: "1px solid #273048", padding: "10px 14px 12px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#5d6680" }}>parsed as</p>
        <FilterAstTree tokenCount={tokens.length} />
      </div>
      <div style={{ borderTop: "1px solid #273048", padding: "10px 14px", fontSize: 11.5, color: "#8c887d", lineHeight: 1.6 }}>
        Same sample, auto-played for your viewport.
      </div>
    </div>
  );
}


// "target?.value" — indices 6,7 are the ?. ; everything else fades toward
// its outer edge so the language feature is the focal point.
const CODE = "target?.value";
const CODE_FADE = CODE.split("").map((_, i) => {
  if (i === 6 || i === 7) return 1;
  if (i < 6) return 0.2 + (i / 5) * 0.45;        // t..t brighten toward ?.
  return 0.65 - ((i - 8) / 4) * 0.45;             // v..e fade away from ?.
});

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function MotionSite() {
  const wrappers = useRef([]);
  const scenes = useRef([]);
  const inners = useRef([]);
  const els = useRef({});
  const progressBar = useRef(null);
  const reduce = useRef(false);

  const E = (name) => (el) => { if (el) els.current[name] = el; };
  const isMobile = useIsMobile();

  const scrollToSectionIndex = useCallback((idx) => {
    const vh = scenes.current[0]?.offsetHeight || window.innerHeight;
    const w = wrappers.current[idx];
    const last = wrappers.current.length - 1;
    window.scrollTo(0, getSectionScrollTarget(idx, w, vh, last));
  }, []);

  const navigateToSection = useCallback((idx, hash) => {
    scrollToSectionIndex(idx);
    history.pushState(null, "", hash ? `#${hash}` : window.location.pathname + window.location.search);
  }, [scrollToSectionIndex]);

  useLayoutEffect(() => {
    const go = (hash) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!hash) {
          scrollToSectionIndex(0);
          return;
        }
        const idx = SECTION_HASHES[hash];
        if (idx !== undefined) scrollToSectionIndex(idx);
      }));
    };
    const pending = document.documentElement.getAttribute("data-initial-hash");
    if (pending) {
      document.documentElement.removeAttribute("data-initial-hash");
      go(pending);
      history.replaceState(null, "", `#${pending}`);
    } else {
      go(window.location.hash.slice(1));
    }
    const onHashChange = () => go(window.location.hash.slice(1));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [scrollToSectionIndex]);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf;

    // --- soft snap state ---
    let lastY = window.scrollY;
    let lastDir = 0;
    let idleFrames = 0;
    let userActive = 0;
    let snap = null; // { from, to, start }
    const backOut = (t) => { const c = 0.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const onUser = () => { userActive = performance.now(); snap = null; };
    window.addEventListener("wheel", onUser, { passive: true });
    window.addEventListener("touchstart", onUser, { passive: true });
    window.addEventListener("touchmove", onUser, { passive: true });
    window.addEventListener("keydown", onUser);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      // Use the pinned scene's own height (set in svh = stable) rather than
      // window.innerHeight, which jumps as the mobile address bar shows/hides.
      const vh = scenes.current[0]?.offsetHeight || window.innerHeight;
      const y = window.scrollY;
      const x = els.current;

      const total = document.documentElement.scrollHeight - vh;
      if (progressBar.current) {
        const p = total > 0 ? y / total : 0;
        progressBar.current.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`;
      }

      // --- soft elastic snap: when scrolling settles near a scene's hold
      // point, ease into it with a slight overshoot. weighted toward the
      // direction of travel; any input cancels.
      if (!reduce.current) {
        if (snap) {
          const t = clamp01((performance.now() - snap.start) / 600);
          window.scrollTo(0, snap.from + (snap.to - snap.from) * backOut(t));
          if (t >= 1) snap = null;
        } else {
          const delta = y - lastY;
          const moving = Math.abs(delta) > 0.6;
          if (moving) lastDir = Math.sign(delta);
          if (!moving && performance.now() - userActive > 200) idleFrames++;
          else idleFrames = 0;
          if (idleFrames > 10) {
            idleFrames = 0;
            const last = wrappers.current.length - 1;
            let best = null;
            wrappers.current.forEach((w, i) => {
              if (!w) return;
              const target = getSectionScrollTarget(i, w, vh, last);
              const d = target - y;
              if (Math.abs(d) <= 6 || Math.abs(d) >= vh * 0.55) return;
              // against-the-grain targets must be much closer to win
              const score = Math.abs(d) * (lastDir !== 0 && Math.sign(d) !== lastDir ? 2.6 : 1);
              if (!best || score < best.score) best = { target, score };
            });
            if (best) snap = { from: y, to: best.target, start: performance.now() };
          }
        }
        lastY = y;
      }

      const P = wrappers.current.map((w) =>
        w ? clamp01((y - w.offsetTop) / (w.offsetHeight - vh)) : 0
      );

      if (reduce.current) {
        scenes.current.forEach((s) => s && (s.style.clipPath = "none", s.style.transform = "none"));
        inners.current.forEach((el) => el && (el.style.transform = "none"));
        (els.current.codeChars || []).forEach((el, i) => {
          if (el) { el.style.display = "inline"; el.style.opacity = CODE_FADE[i]; }
        });
        return;
      }

      // Outgoing scenes: subtle scale pull on CONTENT only — the scene's
      // background stays full-bleed so no gap opens at the edges.
      const pull = (i, start = 0.62, end = 1) => {
        const exit = ramp(P[i], start, end);
        const inner = inners.current[i];
        if (inner) inner.style.transform = `scale(${1 - exit * 0.045})`;
      };

      // SCENE 1 — HERO (respond to scroll immediately so "you're driving" feels true)
      {
        const p = P[0];
        const exit = easeOut(ramp(p, 0.08, 0.88));
        pull(0, 0.08, 0.88);
        const early = easeOut(ramp(p, 0, 0.22));
        if (x.heroScrollHint) {
          x.heroScrollHint.style.opacity = 1 - early;
          x.heroScrollHint.style.transform = `translateY(${early * 14}px)`;
        }
        if (x.heroLine1) x.heroLine1.style.transform = `translateY(${-exit * 50 - early * 10}px)`;
        if (x.heroSub) x.heroSub.style.transform = `translateY(${exit * 30 + early * 8}px)`;
      }

      // SCENE 2 — WORK (diagonal wipe in, live Filter inside)
      {
        const p = P[1];
        const inP = easeInOut(ramp(p, 0, 0.4));
        pull(1);
        const s = scenes.current[1];
        if (s) {
          const t = inP * 320 - 60;
          s.style.clipPath = `polygon(-200% 0%, ${t + 60}% 0%, ${t - 60}% 100%, -200% 100%)`;
        }
        if (x.blade) {
          x.blade.style.opacity = inP > 0.01 && inP < 0.99 ? 1 : 0;
          x.blade.style.transform = `translateX(${inP * 320 - 60}vw) rotate(18deg)`;
        }
        const c1 = easeOut(ramp(p, 0.16, 0.45));
        const c2 = easeOut(ramp(p, 0.24, 0.52));
        if (x.workTitle) { x.workTitle.style.opacity = c1; x.workTitle.style.transform = `translateY(${(1 - c1) * 26}px)`; }
        if (x.workCard) { x.workCard.style.opacity = c2; x.workCard.style.transform = `translateY(${(1 - c2) * 30}px)`; }
        if (x.stat) {
          const f = easeOut(ramp(p, 0.18, 0.5));
          x.stat.textContent = f >= 1 ? "500,000+" : Math.round(f * 500000).toLocaleString();
        }
      }

      // SCENE 3 — TC39 (iris reveal; `target?.value` typed by scroll)
      {
        const p = P[2];
        const inP = easeInOut(ramp(p, 0, 0.4));
        pull(2);
        const s = scenes.current[2];
        if (s) s.style.clipPath = `circle(${inP * 135}% at 30% 45%)`;
        // scrubbed typing — edges fade, the ?. stays lit
        const typed = Math.min(CODE.length, Math.floor(ramp(p, 0.08, 0.44) * (CODE.length + 0.999)));
        (els.current.codeChars || []).forEach((el, i) => {
          if (!el) return;
          const on = i < typed;
          el.style.display = on ? "inline" : "none";
          el.style.opacity = on ? CODE_FADE[i] : 0;
        });
        if (x.caret) x.caret.style.opacity = p > 0.04 && p < 0.95 ? 1 : 0;
        const c = easeOut(ramp(p, 0.28, 0.55));
        if (x.tcBody) { x.tcBody.style.opacity = c; x.tcBody.style.transform = `translateY(${(1 - c) * 26}px)`; }
      }

      // SCENE 4 — RECORD (slot reveal)
      {
        const p = P[3];
        const inP = easeInOut(ramp(p, 0, 0.4));
        pull(3);
        const s = scenes.current[3];
        if (s) {
          const open = (1 - inP) * 50;
          s.style.clipPath = `inset(${open}% 0 ${open}% 0)`;
        }
        if (x.slotTop) x.slotTop.style.transform = `translateY(${-inP * 49}vh)`;
        if (x.slotBot) x.slotBot.style.transform = `translateY(${inP * 49}vh)`;
        (els.current.rows || []).forEach((row, i) => {
          const c = easeOut(ramp(p, 0.14 + i * 0.018, 0.36 + i * 0.018));
          row.style.opacity = c;
          row.style.transform = `translateX(${(1 - c) * (i % 2 ? 36 : -36)}px)`;
        });
      }

      // SCENE 5 — CONTACT (curtain + letter springs)
      {
        const p = P[4];
        const inP = easeInOut(ramp(p, 0, 0.45));
        const s = scenes.current[4];
        if (s) s.style.clipPath = `inset(${(1 - inP) * 100}% 0 0 0)`;
        (els.current.letters || []).forEach((el, i) => {
          const c = easeOut(ramp(p, 0.22 + i * 0.015, 0.5 + i * 0.015));
          el.style.opacity = c;
          el.style.transform = `translateY(${(1 - c) * 44}px) rotate(${(1 - c) * (i % 2 ? 7 : -7)}deg)`;
        });
        const c2 = easeOut(ramp(p, 0.58, 0.82));
        if (x.outro) { x.outro.style.opacity = c2; x.outro.style.transform = `translateY(${(1 - c2) * 18}px)`; }
      }
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onUser);
      window.removeEventListener("touchstart", onUser);
      window.removeEventListener("touchmove", onUser);
      window.removeEventListener("keydown", onUser);
    };
  }, []);

  const wrap = (i) => (el) => (wrappers.current[i] = el);
  const scene = (i) => (el) => (scenes.current[i] = el);
  const innerRef = (i) => (el) => (inners.current[i] = el);
  const rowRef = (i) => (el) => {
    els.current.rows = els.current.rows || [];
    if (el) els.current.rows[i] = el;
  };
  const letterRef = (i) => (el) => {
    els.current.letters = els.current.letters || [];
    if (el) els.current.letters[i] = el;
  };
  const charRef = (i) => (el) => {
    els.current.codeChars = els.current.codeChars || [];
    if (el) els.current.codeChars[i] = el;
  };

  const EMAIL = site.email;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');
        body { margin: 0; background: #0d0a14; }
        @keyframes introUp { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: none; } }
        .intro { opacity: 0; animation: introUp .9s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .caret { animation: blink 1s step-end infinite; }
        .lk { color: #ece9e1; text-decoration: none; border-bottom: 1px solid #3a3450; transition: color .25s, border-color .25s; }
        .lk:hover { color: ${PINK}; border-color: ${PINK}; }
        .filter-val-icon-wrap {
          position: relative;
          display: inline-flex;
          width: 16px;
          height: 16px;
        }
        .filter-val-icon {
          position: absolute;
          inset: 0;
          width: 16px;
          height: 16px;
          transition: opacity .35s ease, transform .35s cubic-bezier(.2,.7,.2,1);
        }
        .filter-val-icon--warn { color: ${FILTER_WARN}; }
        .filter-val-icon--check { color: ${GREEN}; }
        .filter-val-icon--off {
          opacity: 0;
          transform: scale(0.72);
          pointer-events: none;
        }
        .filter-val-icon--warn:not(.filter-val-icon--off) {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
        .filter-val-icon--check:not(.filter-val-icon--off) {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
        .filter-val-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid #273048;
          border-radius: 6px;
          background: transparent;
          transition: border-color .35s ease, background .35s ease, box-shadow .35s ease, transform .2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .filter-val-btn--valid {
          border-color: ${GREEN}44;
          background: ${GREEN}11;
          cursor: default;
        }
        .filter-val-btn:disabled {
          opacity: 1;
        }
        .filter-val-btn--warn:hover:not(:disabled) {
          border-color: ${FILTER_WARN};
          background: ${FILTER_WARN}14;
        }
        .filter-val-btn--warn:active:not(:disabled) {
          transform: scale(0.96);
        }
        .changelog-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          grid-template-areas:
            "company when"
            "role role";
          gap: 6px 14px;
          align-items: baseline;
          border-top: 1px solid #232c2e;
          padding: 12px 0;
        }
        .changelog-co { grid-area: company; font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 19px; }
        .changelog-role { grid-area: role; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: #8c887d; margin: 0; }
        .changelog-when { grid-area: when; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: #ece9e1; margin: 0; justify-self: end; white-space: nowrap; }
        @media (min-width: 701px) {
          .changelog-row {
            grid-template-columns: auto auto 1fr;
            grid-template-areas: "company role when";
            grid-template-rows: auto;
            gap: 14px;
          }
        }
        .contact-email {
          display: inline-block;
          margin-top: 18px;
          padding: 10px 14px;
          border-bottom: none;
          -webkit-tap-highlight-color: transparent;
        }
        .contact-outro {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-top: 26px;
        }
        .contact-note {
          font-size: 11px;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #8c887d;
          margin: 0;
        }
        .contact-icons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        .contact-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          color: #ece9e1;
          text-decoration: none;
          border: 1px solid #3a3450;
          border-radius: 8px;
          background: #1a1220;
          transition: color .25s, border-color .25s, background .25s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .contact-icon svg {
          width: 22px;
          height: 22px;
        }
        .contact-icon:hover,
        .contact-icon:focus-visible {
          color: ${PINK};
          border-color: ${PINK};
          background: #221428;
        }
        .section-tag {
          text-decoration: none;
          cursor: pointer;
          transition: opacity .25s;
          -webkit-tap-highlight-color: transparent;
        }
        .section-tag:hover,
        .section-tag:focus-visible {
          opacity: 0.72;
        }
      `}</style>

      <div style={S.progressTrack}><div ref={progressBar} style={S.progressFill} /></div>

      {/* SCENE 1 — HERO */}
      <div ref={wrap(0)} style={{ ...S.wrapper, zIndex: 1 }}>
        <div ref={scene(0)} style={{ ...S.scene, background: "#0d0a14" }}>
          <div ref={innerRef(0)} style={S.inner}>
            <p className="intro" style={{ ...S.tag, color: PINK, animationDelay: ".1s" }}>
              dustin savery · staff frontend engineer · snohomish, wa
            </p>
            <h1 style={S.h1}>
              <span ref={E("heroLine1")} className="intro" style={{ display: "block", animationDelay: ".22s" }}>Interfaces with</span>
              <span className="intro" style={{ display: "block", animationDelay: ".34s" }}>
                <em style={S.em}>intent</em><span style={{ color: PINK }}>.</span>
              </span>
            </h1>
            <p ref={E("heroSub")} className="intro" style={{ ...S.sub, animationDelay: ".5s" }}>
              Twenty years building React component infrastructure, design systems, and
              the occasional JavaScript language feature.
            </p>
            <p ref={E("heroScrollHint")} className="intro" style={{ ...S.tag, marginTop: 50, animationDelay: ".75s" }}>↓ scroll — you're driving</p>
          </div>
        </div>
      </div>

      {/* SCENE 2 — WORK */}
      <div ref={wrap(1)} id="production" style={{ ...S.wrapper, zIndex: 2, marginTop: "-100svh" }}>
        <div ref={scene(1)} style={{ ...S.scene, background: "#0e1020", clipPath: "inset(0 100% 0 0)" }}>
          <div ref={E("blade")} style={S.blade} />
          <div ref={innerRef(1)} style={S.inner}>
            <div ref={E("workTitle")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <SectionTag hash="production" sectionIndex={1} color={BLUE} onNavigate={navigateToSection}>
                  01 — production
                </SectionTag>
                <a
                  href="https://github.com/facebook/react/issues"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", border: "1px solid #273048", borderRadius: 6, color: "#aeb6cc", textDecoration: "none", fontSize: 11.5, letterSpacing: ".04em", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.color = "#ece9e1"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#273048"; e.currentTarget.style.color = "#aeb6cc"; }}
                >
                  Try the real one on GitHub ↗
                </a>
              </div>
              <h2 style={S.h2}>The Filter Component<span style={{ color: BLUE }}>.</span></h2>
              <p style={S.body}>
                Query &amp; validation machinery at GitHub — designed, built, and maintained solo.{" "}
                {isMobile
                  ? "Same sample, auto-played for your viewport:"
                  : "This sample uses the same syntax with mock data — try it:"}
              </p>
            </div>
            <div ref={E("workCard")} style={{ marginTop: 20 }}>
              {isMobile ? <FilterMobile /> : <FilterDemo />}
              <p style={{ ...S.stat, color: BLUE }}>
                <span ref={E("stat")}>0</span>
                <span style={{ ...S.tag, marginLeft: 12 }}>queries / day in production</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SCENE 3 — TC39 */}
      <div ref={wrap(2)} id="language" style={{ ...S.wrapper, zIndex: 3, marginTop: "-100svh" }}>
        <div ref={scene(2)} style={{ ...S.scene, background: "#150e24", clipPath: "circle(0% at 30% 45%)" }}>
          <div ref={innerRef(2)} style={S.inner}>
            <SectionTag hash="language" sectionIndex={2} color={PURPLE} onNavigate={navigateToSection}>
              02 — language
            </SectionTag>
            <h2 style={S.h2}>Shipped in ES2020<span style={{ color: PURPLE }}>.</span></h2>
            <div style={S.codeLine}>
              <span>
                {CODE.split("").map((ch, i) => (
                  <span
                    key={i}
                    ref={charRef(i)}
                    style={{
                      display: "none",
                      color: i === 6 || i === 7 ? PURPLE : "#8c887d",
                      opacity: 0,
                      textShadow: i === 6 || i === 7 ? `0 0 30px ${PURPLE}88` : "none",
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </span>
              <span ref={E("caret")} className="caret" style={{ color: PURPLE }}>▌</span>
            </div>
            <p ref={E("tcBody")} style={S.body}>
              Helped shape, pitch, and land Optional Chaining and Nullish Coalescing at TC39.
              Installed base: every JavaScript runtime on earth. You've probably already typed it today.
            </p>
          </div>
        </div>
      </div>

      {/* SCENE 4 — RECORD */}
      <div ref={wrap(3)} id="record" style={{ ...S.wrapper, zIndex: 4, marginTop: "-100svh" }}>
        <div ref={scene(3)} style={{ ...S.scene, background: "#0d1418", clipPath: "inset(50% 0 50% 0)" }}>
          <div ref={E("slotTop")} style={{ ...S.slotLine, top: "50%" }} />
          <div ref={E("slotBot")} style={{ ...S.slotLine, top: "50%" }} />
          <div ref={innerRef(3)} style={S.inner}>
            <SectionTag hash="record" sectionIndex={3} color={GREEN} onNavigate={navigateToSection}>
              03 — record
            </SectionTag>
            <h2 style={{ ...S.h2, fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(26px, 4.5vw, 44px)", letterSpacing: "-0.01em" }}>
              CHANGELOG<span style={{ color: GREEN }}>.md</span>
            </h2>
            <div style={{ marginTop: 20 }}>
              {ROLES.map(([co, role, when], i) => (
                <div key={co} ref={rowRef(i)} className="changelog-row">
                  <span className="changelog-co">{co}</span>
                  <span className="changelog-role">{role}</span>
                  <span className="changelog-when">{when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SCENE 5 — CONTACT */}
      <div ref={wrap(4)} id="contact" style={{ ...S.wrapper, height: "200svh", zIndex: 5, marginTop: "-100svh" }}>
        <div ref={scene(4)} style={{ ...S.scene, background: "#160d18", clipPath: "inset(100% 0 0 0)" }}>
          <div style={{ ...S.inner, textAlign: "center" }}>
            <SectionTag hash="contact" sectionIndex={4} color={PINK} onNavigate={navigateToSection}>
              04 — contact
            </SectionTag>
            <a className="contact-email lk" href={`mailto:${EMAIL}`}>
              <span style={{ ...S.serif, fontSize: "clamp(28px, 6vw, 78px)", display: "inline-flex", flexWrap: "wrap", justifyContent: "center" }}>
                {EMAIL.split("").map((ch, i) => (
                  <span key={i} ref={letterRef(i)} style={{ display: "inline-block", whiteSpace: "pre" }}>{ch}</span>
                ))}
              </span>
            </a>
            <div ref={E("outro")} className="contact-outro">
              <p className="contact-note">résumé on request</p>
              <div className="contact-icons">
                <a className="contact-icon" href={site.github} target="_blank" rel="noreferrer" aria-label="GitHub">
                  <GitHubIcon />
                </a>
                <a className="contact-icon" href={site.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                  <LinkedInIcon />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  root: { fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#ece9e1", background: "#0d0a14" },
  progressTrack: { position: "fixed", left: 0, top: 0, bottom: 0, width: 3, background: "#1a1526", zIndex: 50 },
  progressFill: { width: "100%", height: "100%", background: `linear-gradient(to bottom, ${PINK}, ${BLUE})`, clipPath: "inset(0 0 100% 0)" },
  wrapper: { position: "relative", height: "165svh", pointerEvents: "none" },
  scene: {
    position: "sticky", top: 0, height: "100svh", overflow: "hidden",
    display: "flex", alignItems: "center", willChange: "clip-path, transform",
    pointerEvents: "auto",
  },
  inner: { position: "relative", zIndex: 2, maxWidth: 860, margin: "0 auto", padding: "0 clamp(20px, 5vw, 38px)", width: "100%" },
  blade: {
    position: "absolute", top: "-20%", left: 0, width: 4, height: "140%",
    background: `linear-gradient(${PINK}, ${BLUE})`, boxShadow: `0 0 24px ${BLUE}`,
    zIndex: 3, opacity: 0, pointerEvents: "none",
  },
  slotLine: { position: "absolute", left: 0, right: 0, height: 1, background: "#3ddc9744", zIndex: 3, pointerEvents: "none" },
  codeLine: { fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(30px, 6.5vw, 80px)", lineHeight: 1.15, margin: "30px 0 8px", whiteSpace: "nowrap" },
  serif: { fontFamily: "'Instrument Serif', serif", fontWeight: 400 },
  em: { fontFamily: "'Instrument Serif', serif", fontStyle: "italic" },
  tag: { fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#8c887d", margin: 0 },
  h1: { fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: "clamp(54px, 10vw, 120px)", lineHeight: 0.98, margin: "26px 0 0" },
  h2: { fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: "clamp(34px, 5.5vw, 58px)", lineHeight: 1, margin: "14px 0 0" },
  sub: { color: "#8c887d", maxWidth: 500, lineHeight: 1.75, fontSize: 14.5, marginTop: 28 },
  body: { color: "#8c887d", maxWidth: 540, lineHeight: 1.75, fontSize: 13.5, marginTop: 14 },
  stat: { fontFamily: "'Instrument Serif', serif", fontSize: "clamp(30px, 4.5vw, 48px)", margin: "18px 0 0", lineHeight: 1 },
};
