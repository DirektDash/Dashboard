# Dashboard Project — Claude Code Instructions

## Large file writes (> ~300 lines)

- Go directly to the `Write` tool. Do NOT output file contents as conversation text first.
- Do NOT narrate or preview the content before writing.
- If a full rewrite is needed and the file exceeds ~500 lines, delegate to a worktree-isolated subagent:
  ```
  Agent(subagent_type="general-purpose", isolation="worktree", prompt="...")
  ```
  This keeps generation out of the main context window entirely.

## Multi-step tasks (5+ steps)

- Call `TaskCreate` at the start with all steps listed.
- Call `TaskUpdate(status="completed")` after each step so compaction preserves progress checkpoints.
- Never batch multiple steps in one turn if each step produces significant output.

## Context management

- Before beginning any task expected to produce > 500 lines of new/changed code, issue `/compact` to flush prior conversation context, then proceed immediately.
- Prefer `Edit` over `Write` when changing existing files — it only sends the diff and uses far fewer tokens.
- When exploring code for context, use the `Explore` subagent rather than reading files inline — it runs in a separate context window.

## Project conventions

- Stack: plain HTML/CSS/JS files (no build step), Supabase for cloud sync via `app_state` table.
- Supabase URL: `https://midyjdjkqorcxhdnjanh.supabase.co`
- Supabase key: `sb_publishable_wsfPg84TDDlqqQk-WO887Q_j0Sa5x4p`
- Existing localStorage sync pattern is in `sync.js` — reuse it rather than writing new sync code.
- All pages share the topbar/bottombar from `topbar.js` (injected automatically — do not add manually).
- Color tokens live in `:root` CSS vars (`--bg`, `--bg-card`, `--text-1..4`, `--good`, `--warn`, `--bad`, `--border`).
