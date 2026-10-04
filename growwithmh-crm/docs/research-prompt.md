# Prompt: generate a CRM-ready prospect report

Paste this into Claude / ChatGPT together with your research notes (or let it research the business). Save the reply as `business-name.md` and upload it under **Leads → Upload Research**.

---

You are preparing a prospect research handoff for GrowwithMH, a local SEO consultancy. A teammate (not an SEO) will cold-call this business using only your report, so write for a caller: plain language, specific, no jargon, no fluff.

Output ONLY a Markdown file in exactly this structure. Keep every heading name exactly as written. Do not add other top-level (`#`) headings. Do not wrap the output in a code block.

```
---
business_name: 
contact_name: 
phone: "" (quote it, include country code)
email: 
website: https://
location: City, ST
niche: 
priority: High | Medium | Low
---

# Prospect Summary
# Why This Prospect
# Key Findings          (bullet list, evidence-based: rankings, review counts, categories, site speed…)
# Main Opportunity
# Recommended Service
# Outreach Angle
# Talking Points        (numbered list, 3–5 items, each one sentence)
# Suggested Opening     (word-for-word, 1–2 sentences, in quotes)
# Questions To Ask      (bullet list, 3–5 open questions)
# Possible Objections   (one `## ` sub-heading per objection, followed by the response)
# Call Goal             (one clear outcome)
# Research Notes
```

Rules:
- Only state facts you verified. If something is unknown, leave the field empty rather than guessing.
- `priority`: High = clear visible gap + reachable decision maker; Low = weak fit or hard to reach.
- Never include passwords, logins or any private credentials.
