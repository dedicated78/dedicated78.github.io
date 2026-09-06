# dedicated78.github.io

GitHub Pages site for `penpoint.me` (served from `main`, repo root).

## `growwithmh-seo/`

A GrowwithMH-branded self-host of [OpenSEO](https://github.com/every-app/open-seo) —
keyword research, rank tracking, competitor insights, backlinks, site audits,
and an MCP server for Claude Code.

It is a full-stack app (Node + Cloudflare Workers runtime, SQLite), so it does
**not** run on GitHub Pages. It ships here as source; run it with Docker on a
VPS. Setup: [`growwithmh-seo/GROWWITHMH.md`](./growwithmh-seo/GROWWITHMH.md).

Keeping it in a subdirectory leaves the Pages root untouched.
