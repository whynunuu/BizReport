<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## User Preferences & Infrastructure Plan (Memory)
- **Workflow:** Hybrid development with seamless device switching (Home PC, mobile laptop, tablet) without re-configuring environments or losing work sessions.
- **VPS Central Hub:** Planning to use a central VPS (recommended: DigitalOcean Ubuntu Droplet in Singapore, or Hostinger KVM) as the single source of truth for repository, Docker, background services, and databases.
- **Multi-Agent Collaboration:** The VPS environment will be shared by **Antigravity**, **Claude (Claude Code CLI)**, and **Hermes**.
- **Remote Access & Version Control:** Connected via SSH, VS Code Remote - SSH, and Git.
- **OS & Guidance:** User is currently familiar with Windows and new to Linux/Ubuntu. Antigravity/Claude will guide and run terminal commands directly so the user doesn't have to memorize Linux commands.
- **Current Status:** In consideration / planning phase before provisioning.
