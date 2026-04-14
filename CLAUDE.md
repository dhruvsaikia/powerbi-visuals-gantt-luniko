# Custom Power BI Gantt Visual — Project Brief

## Overview

This project is a fork of Microsoft's open-source Power BI Gantt chart visual (`microsoft/powerbi-visuals-gantt`), being customized for **Luniko Consulting** — a pre-seed consulting/tech startup serving an **aerospace manufacturing client**. The goal is to build a tailored Gantt visual for PMO-level project tracking across 10+ programs (e.g., one per airline customer), each with sub-sheets for Engineering, Certification, etc.

The data source is **Smartsheet**, and the visual will be used in **Power BI dashboards**.

## Why a Custom Visual

The free Gantt visuals on AppSource don't meet the client's needs. The closest visual — **GANTT by Lingaro** — is proprietary (no source code access, license prohibits modification). The Microsoft Gantt is open source (MIT license) and serves as the best base to fork and customize.

## Tech Stack

- **Language:** TypeScript
- **Rendering:** D3.js (SVG)
- **Build tool:** Power BI Visuals SDK (`pbiviz` CLI)
- **Key files:**
  - `src/gantt.ts` — main visual rendering logic
  - `src/settings.ts` — formatting pane settings/properties
  - `capabilities.json` — defines data field buckets and formatting options
  - `pbiviz.json` — visual metadata (name, version, author)
- **Output:** `.pbiviz` file (packaged visual imported into Power BI)

## Planned Modifications (Priority Order)

### 1. Milestone Vertical Lines Toggle (REFERENCE IMPLEMENTATION EXISTS)
- **Problem:** When milestones are added, dotted vertical lines extend from each milestone diamond through the entire chart, making it unreadable with many milestones across 10+ programs.
- **Solution:** Add a "Show vertical lines" boolean toggle under the Milestones section of the formatting pane.
- **Reference:** PR #373 by user `luizzappa` (April 2025) implements this exact feature: +41 lines, -23 lines across 3 files. The PR has not been merged due to merge conflicts, but a working `.pbiviz` was produced and confirmed working by multiple users.
- **GitHub issue:** #250 — "How can I add option to remove the grey dotted lines that come with milestones in the Power Bi Gantt 2.2.3"
- **Earlier workaround by NeilGreenhorn-Proteus:** Changed milestone line color to `#00FFFFFF` (transparent) — hacky but functional.
- **Note:** One user reported that luizzappa's version also hides the "Today" line — verify this doesn't happen and fix if needed.

### 2. Wider Task Label Area / Non-Truncated Labels
- **Problem:** Task names are truncated ("Design Rev...", "Tooling Fa...") in the narrow left label area.
- **Goal:** Make the label column wider or auto-sizing so full task names are visible, similar to how Lingaro displays full task names in a table-like left panel.

### 3. Extra Columns (Data Grid on Left Side)
- **Problem:** Microsoft Gantt only shows the task name on the left. Lingaro supports an "Extra Columns" field bucket to show additional data columns (e.g., status, owner, dates) next to task names before the timeline starts.
- **Goal:** Add an "Extra Columns" data role in `capabilities.json` and render additional columns in the left panel area.
- **Complexity:** Medium-high — requires modifying data binding, SVG layout, and formatting options.

### 4. Status-Based Bar Coloring
- **Problem:** Microsoft Gantt colors bars by a Legend category field. Lingaro supports computed status coloring: Milestone, Completed, On Track, Slightly Behind, Behind, Overdue, Future Task — each with a different color.
- **Goal:** Support conditional bar coloring based on task status relative to dates.
- **Approach options:**
  - DAX-based: Create a calculated column in Power BI that computes status, then use it as the Legend field. This requires no code changes to the visual.
  - Code-based: Build status logic into the visual itself. More work but cleaner UX.
- **Recommendation:** Start with the DAX approach (no visual code changes needed), then consider code-based if the DAX approach is insufficient.

### 5. Hierarchical View Improvements
- **Goal:** Cleaner collapse/expand icons, timeline rollup when programs are collapsed (showing aggregated bars at the program level), support for 3 hierarchy levels (Portfolio → Program → Task).
- **Reference:** Lingaro supports "Roll up the timeline when aggregating items (i.e., into projects, programs, and portfolios) in the hierarchical view."

## Key Context

### Milestones in This Domain
- In aerospace project management, milestones are zero-duration events marking key dates: PDR Complete, FAI Complete, Type Certificate, Delivery, etc.
- In Smartsheet, milestones have Start Date = End Date (zero duration).
- In the Power BI Gantt visual, there is a "Milestones" field bucket. Tasks with zero duration render as diamond shapes.
- The dotted vertical line problem occurs when data is placed in the Milestones field bucket.

### Lingaro Visual (Inspiration, NOT a base)
- GANTT by Lingaro is the visual the client previously used and liked.
- It is NOT open source — license explicitly forbids modifying source code.
- It is not Microsoft-certified (can't export to PowerPoint).
- It has been removed from or is hard to find in AppSource.
- Features to study and replicate: hierarchical view (3 levels), extra columns, status-based coloring, adjustable row height, timeline rollup, phases field bucket, sort-by field bucket.

### Data Structure
The aerospace client has Smartsheet data structured as:
- **PMO level:** 10+ program sheets (one per airline/customer)
- **Per program:** Additional sheets for Engineering-Design, Certification, etc.
- Each sheet has: Task name, Start Date, End Date, Duration, % Complete, Resource, Milestone flag/name

### Testing
- Use Power BI Desktop to test.
- Import the custom `.pbiviz` via Visualizations pane → "..." → "Import a visual from a file."
- Enable Developer Mode: File → Options → Report Settings → Developer Mode (resets each session).
- For live development: `pbiviz start` launches a dev server at https://localhost:8080 and the "Developer Visual" in Power BI auto-refreshes on save.

## Build & Package Commands
```bash
npm install              # Install dependencies
pbiviz start             # Start dev server for live testing
pbiviz package           # Build .pbiviz file in dist/ folder
```

## Open Source Contribution Notes
- Only Microsoft maintainers can merge PRs into the official repo.
- PR #373 (milestone toggle) has been open since April 2025 with no Microsoft review.
- Microsoft responded in May 2024 saying they would add milestone line formatting settings "in the next release" — this has not happened as of April 2026.
- For Luniko's purposes, this fork is an internal/organizational visual, not intended for AppSource submission.
