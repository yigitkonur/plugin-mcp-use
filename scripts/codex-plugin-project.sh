#!/usr/bin/env bash
# codex-plugin-project.sh on|off|global-on|global-off <plugin@marketplace> [project-dir] [--trust]
# Codex has no `plugin enable/disable`; this edits the config files by hand.
#   on / off          <project>/.codex/config.toml   [plugins."<id>"] enabled = true|false   (per project)
#   global-on / -off  $CODEX_HOME/config.toml         same section, user level (default ~/.codex)
# Codex ignores a project's .codex/config.toml unless the project is trusted in the user config:
#   [projects."<abs path>"] trust_level = "trusted"
# --trust adds that block, or flips an existing "untrusted" one (trusting a project also enables its hooks and rules, so it is opt-in).
# Tables are matched by their parsed key path, so [plugins."x"], [plugins.'x'] and an indented header are the same table.
set -eu
mode="${1:?usage: $0 on|off|global-on|global-off <plugin@marketplace> [project-dir] [--trust]}"; id="${2:?plugin@marketplace}"; shift 2
dir="$PWD"; trust=0
for a in "$@"; do case "$a" in --trust) trust=1 ;; *) dir="$a" ;; esac; done
case "$mode" in on|global-on) val=true ;; off|global-off) val=false ;; *) echo "bad mode: $mode" >&2; exit 2 ;; esac
dir="$(cd "$dir" && pwd -P)"; home="${CODEX_HOME:-$HOME/.codex}"
python3 -I - "$id" "$val" "$dir" "$home" "$trust" "$mode" <<'PY'
import os, re, sys
pid, val, d, home, trust, mode = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] == "1", sys.argv[6]
glob = mode.startswith("global")

def parse_key(text):
    """Dotted TOML key -> list of segments (bare, "basic" or 'literal'), or None if it is not a plain key path."""
    segs, i, n = [], 0, len(text)
    while i < n:
        while i < n and text[i] in " \t": i += 1
        if i >= n: return None
        c = text[i]
        if c == '"':
            i += 1; buf = ""
            while i < n and text[i] != '"':
                if text[i] == "\\" and i + 1 < n: buf += text[i + 1]; i += 2
                else: buf += text[i]; i += 1
            if i >= n: return None
            i += 1
        elif c == "'":
            j = text.find("'", i + 1)
            if j < 0: return None
            buf = text[i + 1:j]; i = j + 1
        else:
            m = re.match(r"[A-Za-z0-9_-]+", text[i:])
            if not m: return None
            buf = m.group(0); i += len(buf)
        segs.append(buf)
        while i < n and text[i] in " \t": i += 1
        if i < n:
            if text[i] != ".": return None
            i += 1
    return segs or None

HDR = re.compile(r"^[ \t]*\[(?!\[)(.*?)\][ \t]*(#.*)?$")  # non-greedy: a "]" inside a trailing comment is not part of the key
def table_range(lines, path):
    """(header index, end index) of the [path] table, or None. The body ends at the next header of any kind."""
    for i, ln in enumerate(lines):
        m = HDR.match(ln.rstrip("\n"))
        if m and parse_key(m.group(1)) == path:
            j = i + 1
            while j < len(lines) and not re.match(r"^[ \t]*\[", lines[j]): j += 1
            return i, j
    return None

def q(x): return '"' + x.replace("\\", "\\\\").replace('"', '\\"') + '"'

ASSIGN = re.compile(r"""^([ \t]*)("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)[ \t]*=[ \t]*(.*?)[ \t]*(#.*)?$""")
def find_assign(i, j, key):
    """(line index, match) of `key = ...` in lines i+1..j-1; the key may be bare or quoted. group(1) indent, group(3) value."""
    for k in range(i + 1, j):
        m = ASSIGN.match(lines[k].rstrip("\n"))
        if m and parse_key(m.group(2)) == [key]: return k, m
    return None, None

def set_in_table(path, key, value, create_if_missing=True, only_if=None):
    """Make `key = value` true in table `path` of file `p`; returns the old value (or None)."""
    global lines
    r = table_range(lines, path)
    if not r:
        if not create_if_missing: return None
        if lines and not lines[-1].endswith("\n"): lines[-1] += "\n"
        if lines and lines[-1].strip(): lines.append("\n")
        lines += ["[" + ".".join(q(x) if not re.fullmatch(r"[A-Za-z0-9_-]+", x) else x for x in path) + "]\n", "%s = %s\n" % (key, value)]
        return None
    i, j = r
    k, m = find_assign(i, j, key)
    if m:
        old = m.group(3)
        if only_if is None or only_if(old): lines[k] = "%s%s = %s\n" % (m.group(1), key, value)
        return old
    at = j
    while at > i + 1 and not lines[at - 1].strip(): at -= 1
    if lines[at - 1].endswith("\n") is False: lines[at - 1] += "\n"
    lines.insert(at, "%s = %s\n" % (key, value))
    return None

def load(path):
    return open(path).read().splitlines(True) if os.path.exists(path) else []

p = os.path.join(home, "config.toml") if glob else os.path.join(d, ".codex", "config.toml")
os.makedirs(os.path.dirname(p), exist_ok=True)
lines = load(p)
set_in_table(["plugins", pid], "enabled", val)
open(p, "w").write("".join(lines))
print("wrote", p, '-> [plugins."%s"] enabled = %s' % (pid, val))
if glob:
    sys.exit(0)

cfg = os.path.join(home, "config.toml")
lines = load(cfg)
path = ["projects", d]
if table_range(lines, path):
    if trust:
        old = set_in_table(path, "trust_level", q("trusted"), only_if=lambda v: v != q("trusted"))
        open(cfg, "w").write("".join(lines))
        print("project already listed in %s; trust_level was %s, now trusted" % (cfg, old) if old and old != q("trusted") else "project already trusted in " + cfg if old else "trusted %s in %s" % (d, cfg))
    else:
        r = table_range(lines, path); _, m = find_assign(r[0], r[1], "trust_level")
        if not (m and m.group(3) == q("trusted")):
            print("NOTE: %s is listed in %s but not trusted, so Codex ignores this file. Re-run with --trust." % (d, cfg))
        else:
            print("project is already trusted in", cfg)
elif trust:
    set_in_table(path, "trust_level", q("trusted"))
    open(cfg, "w").write("".join(lines))
    print("trusted", d, "in", cfg)
else:
    print("NOTE: %s is not trusted, so Codex ignores this file. Re-run with --trust or add:\n  [projects.%s]\n  trust_level = \"trusted\"" % (d, q(d)))
PY
