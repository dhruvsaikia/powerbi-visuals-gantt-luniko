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

## Completed Modifications

### ✅ Milestone Vertical Lines Toggle
- **Implemented:** Boolean "Show vertical lines" toggle in the Milestones formatting card (under the Line group).
- **Behavior:** When off, the dotted vertical lines that span the full chart height are hidden. The "Today" line is unaffected.
- **Files changed:** `src/settings/cards/milestonesCard.ts`, `src/gantt.ts`, `capabilities.json`
- **Reference:** Based on PR #373 by `luizzappa`.

### ✅ Multiple Milestone Date Columns
- **Implemented:** The Milestones data role now accepts up to 10 date columns (was 1 string column).
- **New behavior:**
  - Drop any date columns (e.g., PDR Date, CDR Date, FAI Date) into the Milestones bucket
  - Each column's date value determines where the milestone marker is drawn on that task's row
  - Markers overlay on top of the task bar — bars do NOT disappear
  - Each column name appears as a separate entry in the Milestones formatting card's "Apply settings to" dropdown, with independent color and shape controls
  - Resource labels still show on tasks that have milestone markers
- **Power BI note:** When dragging date columns into the Milestones bucket, Power BI may default to "Date Hierarchy". Right-click the field and select the raw date column, OR disable the global setting: File → Options → Current File → Data Load → uncheck "Auto date/time"
- **Files changed:** `capabilities.json`, `src/columns.ts`, `src/gantt.ts`
- **Key implementation details:**
  - `capabilities.json`: Milestones max raised to 10 in all 4 dataViewMapping conditions
  - `src/columns.ts` (`getCategoricalValues`): Milestones role now returns `{ "Col Name": Date[] }` dict (same pattern as ExtraInformation)
  - `src/gantt.ts` (`createMilestones`): Iterates over all Milestones-role category columns; creates one `MilestoneDataPoint` per column using `withCategory(category, 0)` for the identity selector
  - `src/gantt.ts` (`createTask`): Builds `Milestone[]` from the dict — one entry per column that has a valid date at that row index
  - `src/gantt.ts` (`getTaskRectWidth`): Removed `lodashIsEmpty(task.Milestones)` guard so bars always render
  - `src/gantt.ts` (`addTooltipInfoForCollapsedTasks`): Tooltip now uses `milestone.start` (actual milestone date) instead of `task.start`

### ✅ Per-Milestone Independent Color and Shape Formatting
- **Implemented:** Each milestone column (PDR Date, CDR Date, FAI Date, etc.) now has fully independent color and shape settings in the Format pane. Changing PDR Date to red/diamond only affects PDR Date markers.
- **Root cause of the previous bug:** Power BI's composite row identities are shared across all Grouping-role category columns. `withCategory(pdrCol, rowIndex)` and `withCategory(cdrCol, rowIndex)` produce identical selectors, so Power BI broadcasted any write to all milestone categories simultaneously.
- **Fix approach:** Global (null-selector) properties with unique index-based names (`fill_0`…`fill_9`, `shapeType_0`…`shapeType_9`). Each milestone column gets its own independent slot in `dataView.metadata.objects.milestones`. No row identity involved — no cross-column contamination.
- **Files changed:** `capabilities.json`, `src/settings/cards/milestonesCard.ts`, `src/gantt.ts`
- **Key implementation details:**
  - `capabilities.json`: Added `fill_0`…`fill_9` (fill/solid/color type) and `shapeType_0`…`shapeType_9` (text type) as declared properties on the `milestones` object
  - `src/settings/cards/milestonesCard.ts` (`MilestoneContainerItem`): Now takes `milestoneIndex: number`; ColorPicker uses `name: fill_${milestoneIndex}`, ItemDropdown uses `name: shapeType_${milestoneIndex}`, both with `selector: null`
  - `src/settings/cards/milestonesCard.ts` (`populateMilestones`): Passes array index to `MilestoneContainerItem` constructor
  - `src/gantt.ts` (`createMilestones`): Reads `dataView.metadata.objects?.milestones?.[fill_${i}]` and `[shapeType_${i}]` for each milestone column; falls back to `persistSettings` state (for View mode) then color palette default

### ✅ Milestone Markers Suppressed on Parent/Header Rows
- **Problem:** Program-level parent rows (Air Canada 787, Lufthansa A350, etc.) were showing milestone markers even though they are header/grouping rows, not actual task rows.
- **Root cause:** `addTaskToParentTask` in `src/gantt.ts` was creating the parent `Task` object with `Milestones: milestones || []`, inheriting the first child task's milestone data.
- **Fix:** Changed to `Milestones: []` — parent rows are always created with an empty milestone list.
- **Files changed:** `src/gantt.ts` (`addTaskToParentTask`, line ~1385)

## Planned Modifications (Priority Order)

### 1. Milestone Vertical Dotted Lines — Further Refinement (if needed)
- The toggle exists. Outstanding concern: with multiple milestone columns, each unique date still gets a full-height dotted line. Consider whether the user wants dotted lines per milestone column, or one line per unique date across all columns (current behavior).

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
- In aerospace project management, milestones are key gate dates per task: PDR Complete, CDR Complete, FAI Complete, Type Certificate, Delivery, etc.
- In Smartsheet, these are date columns on each task row (not zero-duration tasks).
- In our custom visual, the Milestones bucket accepts **multiple date columns** (up to 10). Each column represents one milestone type. The date value in that column positions the marker on the timeline for that task row.
- Milestone markers (diamond/square/circle) overlay on top of the task bar — the bar remains visible.
- The dotted vertical lines that span the full chart height can be toggled off in the Milestones formatting card.
- **Important:** Avoid the original Microsoft Gantt "milestone task" pattern (single string column, marker at task start). That design is superseded by the multi-column date approach above.

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
- This fork diverges significantly from upstream (multi-column milestones, vertical line toggle) — it is not intended to be upstreamed.
- For Luniko's purposes, this fork is an internal/organizational visual, not intended for AppSource submission.
