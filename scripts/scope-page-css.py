#!/usr/bin/env python3
"""
Scope each page CSS by prefixing every top-level selector with a page wrapper class.
This prevents CSS leaks across React Router pages (Vite injects each CSS globally and
never removes it). Conflicting selectors (.content, .header, .back-btn, etc.) were
leaking between pages after navigation, collapsing layouts.

Usage:
    python3 scripts/scope-page-css.py

The script:
  - Prefixes every top-level rule's selector list with `<prefix> ` (e.g. `.scan-page `).
  - Recurses into @media / @supports (prefixes inner selectors).
  - Leaves @keyframes / @font-face / @page / @charset alone.
  - Leaves :root, html, body, *, @import alone.
  - Splits comma-separated selector lists at top level only.
  - Idempotent: skips a file if it already starts with the wrapper class prefix marker.

⚠️ CONVENTION DESIGN SYSTEM:
  The `.rv-*` prefix is reserved for the global design system
  (src/styles/components/*.css). It MUST NOT appear in any src/pages/*.css file
  — if it did, this scoper would prefix it to `.page-name .rv-card`, breaking
  the intended global semantics. Always reference DS classes directly from JSX,
  never re-style them in page-scoped CSS.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "src" / "pages"

# Pages that need scoping (have generic class names that conflict).
# Page CSS file => wrapper class to prefix with.
SCOPING = {
    "Home.css":       ".home-page",
    "Scan.css":       ".scan-page",
    "Cours.css":      ".cours-page",
    "Profile.css":    ".profile-page",
    "Quiz.css":       ".quiz-page",
    "Resume.css":     ".resume-page",
    "Analyse.css":    ".analyse-page",
    "Flashcards.css": ".flashcards-page",
    "Mindmap.css":    ".mindmap-page",
    "Onboarding.css": ".onboarding-page",
}

MARKER = "/* CSS scoped to page wrapper — see scripts/scope-page-css.py */"

# Selectors that should NEVER be prefixed (they target global elements).
GLOBAL_SELECTORS = (":root", "html", "body", "*", "::backdrop", "::selection",
                    "::-webkit-scrollbar", "::-moz-")

# At-rules where inner content should NOT be prefixed (selectors inside are
# keyframe percentages or descriptor blocks, not real selectors).
NO_PREFIX_AT = {"@keyframes", "@-webkit-keyframes", "@-moz-keyframes",
                "@font-face", "@page", "@property", "@counter-style"}

# At-rules whose inner content IS a list of rules (so we recurse and prefix).
NESTED_AT = {"@media", "@supports", "@container", "@layer"}


def find_block_end(s, start):
    """Given s[start] == '{', return index of matching '}'."""
    depth = 0
    i = start
    n = len(s)
    while i < n:
        c = s[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        elif c in '"\'':
            # skip string
            j = i + 1
            while j < n and s[j] != c:
                if s[j] == '\\':
                    j += 2
                    continue
                j += 1
            i = j
        elif c == '/' and i + 1 < n and s[i + 1] == '*':
            end = s.find('*/', i + 2)
            if end < 0:
                return n - 1
            i = end + 1
        i += 1
    return n - 1


def split_top_level_commas(s):
    """Split a selector list by commas not inside () or []."""
    parts = []
    depth = 0
    start = 0
    i = 0
    while i < len(s):
        c = s[i]
        if c in '([':
            depth += 1
        elif c in ')]':
            depth -= 1
        elif c == ',' and depth == 0:
            parts.append(s[start:i])
            start = i + 1
        i += 1
    parts.append(s[start:])
    return parts


def prefix_selector_list(sel_text, prefix):
    """Prefix each selector in a comma-separated list."""
    out_parts = []
    for part in split_top_level_commas(sel_text):
        m = re.match(r'^(\s*)(.*?)(\s*)$', part, re.DOTALL)
        ws_before, body, ws_after = m.group(1), m.group(2), m.group(3)
        if not body:
            out_parts.append(part)
            continue
        # Skip selectors that target global elements.
        if any(body.startswith(g) for g in GLOBAL_SELECTORS):
            out_parts.append(part)
            continue
        # Skip if already prefixed (idempotency).
        if body.startswith(prefix):
            out_parts.append(part)
            continue
        out_parts.append(f"{ws_before}{prefix} {body}{ws_after}")
    return ','.join(out_parts)


def process(css, prefix, start=0, end=None, allow_prefix=True):
    """Process a CSS string slice; return new CSS."""
    if end is None:
        end = len(css)
    out = []
    i = start
    while i < end:
        c = css[i]
        # Whitespace passthrough
        if c in ' \t\n\r':
            out.append(c)
            i += 1
            continue
        # Comment
        if c == '/' and i + 1 < end and css[i + 1] == '*':
            close = css.find('*/', i + 2)
            if close < 0 or close > end:
                out.append(css[i:end])
                return ''.join(out)
            out.append(css[i:close + 2])
            i = close + 2
            continue
        # At-rule
        if c == '@':
            m = re.match(r'@[\w-]+', css[i:end])
            at_name = m.group(0) if m else '@'
            # Find next ';' or '{' at this nesting depth (none, since we're at top of a rule).
            j = i + len(at_name)
            while j < end:
                cj = css[j]
                if cj == '{':
                    block_end = find_block_end(css, j)
                    out.append(css[i:j + 1])
                    if at_name in NO_PREFIX_AT:
                        out.append(css[j + 1:block_end])
                    else:
                        # Nested at-rule (media/supports/etc.) OR unknown — prefix inner rules.
                        inner = process(css, prefix, j + 1, block_end, allow_prefix)
                        out.append(inner)
                    out.append('}')
                    i = block_end + 1
                    break
                if cj == ';':
                    out.append(css[i:j + 1])
                    i = j + 1
                    break
                if cj in '"\'':
                    e = css.find(cj, j + 1)
                    j = (e if e >= 0 else end) + 1
                    continue
                j += 1
            else:
                out.append(css[i:end])
                return ''.join(out)
            continue
        # Regular rule: read selector text until '{'
        sel_start = i
        j = i
        while j < end:
            cj = css[j]
            if cj == '{':
                break
            if cj in '"\'':
                e = css.find(cj, j + 1)
                j = (e if e >= 0 else end) + 1
                continue
            if cj == '/' and j + 1 < end and css[j + 1] == '*':
                e = css.find('*/', j + 2)
                j = (e if e >= 0 else end) + 2
                continue
            j += 1
        if j >= end:
            out.append(css[i:end])
            return ''.join(out)
        sel_text = css[sel_start:j]
        block_end = find_block_end(css, j)
        block_text = css[j:block_end + 1]
        if allow_prefix:
            out.append(prefix_selector_list(sel_text, prefix))
        else:
            out.append(sel_text)
        out.append(block_text)
        i = block_end + 1
    return ''.join(out)


def main():
    args = sys.argv[1:]
    only = None
    if "--only" in args:
        idx = args.index("--only")
        only = args[idx + 1] if idx + 1 < len(args) else None
    for filename, prefix in SCOPING.items():
        if only and filename != only:
            continue
        path = PAGES_DIR / filename
        if not path.exists():
            print(f"  ! missing {path}", file=sys.stderr)
            continue
        original = path.read_text(encoding="utf-8")
        if original.lstrip().startswith(MARKER):
            print(f"  = {filename}: already scoped, skipping")
            continue
        new_css = process(original, prefix)
        new_css = f"{MARKER}\n/* Wrapper: {prefix} */\n\n{new_css}"
        path.write_text(new_css, encoding="utf-8")
        print(f"  ✓ {filename}: scoped under '{prefix}'")


if __name__ == "__main__":
    main()
