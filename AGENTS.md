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
  - `src/gantt.ts` — main visual rendering logic (~4 100 lines, the main file)
  - `src/interfaces.ts` — TypeScript interfaces for Task, GroupedTask, Layer, Milestone, etc.
  - `src/settings/cards/layoutCard.ts` — Layout formatting card (Stacked Bars toggle)
  - `src/settings/cards/milestonesCard.ts` — Milestones formatting card
  - `src/settings/ganttChartSettingsModels.ts` — top-level settings model, registers all cards
  - `src/columns.ts` — maps Power BI dataView columns to typed values
  - `capabilities.json` — defines data field buckets and formatting options
  - `pbiviz.json` — visual metadata (name, version, author)
- **Output:** `.pbiviz` file (packaged visual imported into Power BI)

## Completed Modifications

### ✅ Unique Visual Identity (Fork Separation from Microsoft Original)
- **Problem:** Our fork shared the same GUID (`Gantt1448688115699`) and package name as Microsoft's original Gantt visual. When Power BI restarted, it fell back to the Microsoft version and showed "too many columns in Milestones bucket" errors.
- **Fix:** Updated `pbiviz.json` to give the fork a unique identity:
  - `guid`: `Gantt1448688115699` → `lunikoGanttChart20250415`
  - `displayName`: `"Gantt 3.4.5.0"` → `"Gantt Chart by Luniko"`
  - `description`: Updated to describe the Luniko fork and its custom features
  - `author.name/email`: Updated to Luniko Consulting / dhruvsaikia@gmail.com
  - `gitHubUrl`: Updated to the fork repo URL
- **GUID scope:** The GUID only appears in `pbiviz.json` — no references exist in `src/`, `capabilities.json`, or any other file.
- **Assets:** Custom `assets/icon.png` and `assets/thumbnail.png` have been replaced with Luniko-branded versions.
- **Test builder GUID:** `test/visualBuilder.ts:45` — `super(width, height, "lunikoGanttChart20250415")` (previously `"Gantt1448688115699"`). This is required for unit tests to target the correct visual guid.
- **Files changed:** `pbiviz.json`, `assets/icon.png`, `assets/thumbnail.png`, `test/visualBuilder.ts`
- **Important:** When importing into Power BI, this visual now registers as a separate entry from Microsoft's Gantt. Both can coexist in the same Power BI environment. The `.pbiviz` in `dist/` is the file to import.

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

### ✅ Stacked Bars Mode
- **Implemented:** "Stacked Bars" toggle in a new **Layout** formatting card (`src/settings/cards/layoutCard.ts`). When ON, child tasks render as lanes inside their parent row instead of as separate rows below.
- **Behavior when ON:**
  - Child tasks are packed into horizontal lanes using a greedy interval-graph algorithm (non-overlapping tasks share a lane; overlapping tasks go to separate lanes)
  - Parent row expands vertically to accommodate all lanes
  - Each child bar displays its task name as centered, dark (`#222`) text inside the bar, truncated to fit
  - Resource/legend labels that normally appear to the right of bars are hidden for child tasks (they'd overlap adjacent bars)
  - Collapse/expand buttons are hidden (hierarchy is implicit in the stacked layout)
  - Milestone markers are collected from stacked children and still drawn
  - A thin 1px divider line appears between parent groups (between Boeing and Qatar, etc.) but NOT between child lanes within the same parent — the parent group looks like one unified tall row
- **Behavior when OFF:** identical to pre-existing behavior — no regressions
- **Files changed:** `src/settings/cards/layoutCard.ts` (new file), `src/settings/ganttChartSettingsModels.ts`, `capabilities.json`, `src/gantt.ts`
- **Key implementation details:**
  - `capabilities.json`: Added `layout` object with `stackedBars` bool property
  - `src/settings/ganttChartSettingsModels.ts`: Added `layout = new LayoutCardSettings()` and included in `cards[]`
  - `src/gantt.ts` (`buildStackedGroupedTasks`): New method — filters top-level tasks, lane-packs children per parent using pass-1 greedy interval algorithm, assigns `task.layer` and `task.index`, builds `GroupedTask.layers` map
  - `src/gantt.ts` (`getGroupTasks`): Calls `buildStackedGroupedTasks` when toggle is ON; returns normal grouped tasks otherwise
  - `src/gantt.ts` (`taskSelectionRectRender`): Passes `groupIdx` (D3 parent index) into each Layer object so divider logic knows which group a lane belongs to
  - `src/gantt.ts` (`renderGroupedTaskGridLines`): In stacked mode, only draws a divider for layer index 0 of non-first groups (`d.index === 0 && d.groupIndex > 0`); inner lanes (index ≥ 1) get no divider; always 1px in stacked mode regardless of the `displayGroupedTaskGridLines` setting
  - `src/gantt.ts` (`tasksAfterGrouping`): Uses `Array.from(t.layers.values()).flat()` when layers exist so real child dates are used for TimeScale/hasNotNullableDates calculation (critical — without this, parent placeholder tasks with null dates caused all bars to disappear)
  - `src/gantt.ts` (`renderStackedChildNames`): New method — D3 `.join("text")` to create/update/remove `.stacked-child-label` text elements inside each child task `<g>`; always called unconditionally from `renderTasks` so stale elements are cleaned up when toggling OFF
  - `src/gantt.ts` (`renderClickableAreas`): Hides collapse buttons and parent indentation when in stacked mode
  - `src/gantt.ts` (`taskResourceRender`): Data binding returns `[]` for child tasks when stacked mode is ON, causing D3 to remove their resource label elements
  - `src/gantt.ts` (`createMilestoneLine`): Collects milestone dates from stacked children in addition to top-level tasks
- **Known architectural detail:** `GroupedTask.tasks` always holds the parent placeholder task (with `children` populated, `parent: null`) so that the left-panel label renders correctly with parent styling. The actual dated child tasks live exclusively in `GroupedTask.layers`.

### ✅ Milestone Vertical Stacking (Both Modes)
- **Problem:** When a task has multiple milestones whose dates fall within ~20px of each other horizontally (same date, or consecutive days at typical zoom), the markers were drawn on top of each other and only the topmost was visible.
- **Fix:** Instead of collapsing same-date milestones into one marker, all milestones are now drawn separately and stacked vertically. A greedy slot-assignment algorithm assigns each milestone a `stackIndex` (0 = at bar top, 1 = one bar-height below, 2 = two bar-heights below, etc.).
- **Algorithm (20px proximity rule):** Milestones sorted left-to-right by pixel x position. For each milestone, find the first slot where the previous milestone in that slot is ≥ 20px away (no visual overlap). If no slot fits, open a new one. The slot index becomes `stackIndex`. This runs both in `MilestonesRender` (for visual placement) and in `computeMilestoneMaxStack` (for row-height planning).
- **Files changed:** `src/interfaces.ts`, `src/gantt.ts`
- **Key implementation details:**
  - `src/interfaces.ts`: Added `stackIndex?: number` to `MilestonePath`; added `milestoneSlots?: number` to `Task`; added `milestoneRows?: number` to `GroupedTask`; added `groupIndex?: number` to `Layer`
  - `src/gantt.ts` (`MilestonesRender`): Replaced `d3Nest` date-grouping (which hid all but one marker per date) with the slot-assignment algorithm; each `MilestonePath` now carries its `stackIndex`
  - `src/gantt.ts` (`transformForMilestone`): y-offset = `getTaskYCoordinateWithLayer(task) + stackIndex * barHeight`, so each stack level sits one bar-height below the previous
  - `src/gantt.ts` (`computeMilestoneMaxStack`): New private helper — given a sorted list of x-pixel positions, returns the number of vertical slots needed (= max simultaneous overlaps at any horizontal point). Used by both stacked-bars and normal-mode layout planning.

### ✅ Milestone-Aware Tall Bars — Stacked Bars Mode
- **Problem:** In stacked bars mode, when a child task had 3 milestones stacking vertically, the milestones spilled downward out of the bar and overlapped the next child's bar in the adjacent lane.
- **Fix:** The bar itself grows to `milestoneSlots × barHeight` tall, and the lane-packing algorithm treats tall bars as occupying multiple consecutive row slots, preventing other bars from being packed underneath.
- **Two-pass layout architecture:**
  - **Pass 1** (`buildStackedGroupedTasks`, called before TimeScale exists): Time-based greedy interval packing. Assigns each child to a lane (1 slot each). Sets initial `task.layer` and `task.index`.
  - **Pass 2** (`updateStackedGroupMilestoneRows`, called after TimeScale is set): Computes `task.milestoneSlots` for each child using pixel-based overlap detection. Re-runs a height-aware greedy packing: a child of height h searches for h consecutive available row slots. Rebuilds `group.layers` map with updated assignments. Sets `group.milestoneRows`.
  - **Re-indexing** (`reindexStackedGroups`): After pass-2, each group's start row may have shifted (a group that now needs 4 rows instead of 2 pushes the next group's start down). This method walks all groups in order and assigns sequential `group.index` and `task.index` values.
- **Files changed:** `src/gantt.ts`
- **Key implementation details:**
  - `src/gantt.ts` (`updateStackedGroupMilestoneRows`): Per-group: collects all children, computes `milestoneSlots` per child, re-packs using height-aware greedy algorithm (tries h consecutive rows, falls back to appending new rows), rebuilds `group.layers`, sets `group.milestoneRows = rowEndTimes.length`
  - `src/gantt.ts` (`reindexStackedGroups`): Assigns sequential `group.index` and updates `task.index = group.index + task.layer` for all children; also resets parent placeholder index to `group.index`
  - `src/gantt.ts` (`drawTaskRect`): Height is now `Gantt.getBarHeight(taskConfigHeight) * Math.max(1, task.milestoneSlots ?? 1)` — bar grows for multi-slot tasks
  - `src/gantt.ts` (`taskDaysOffRender`): Days-off stripes also use effective bar height so they fill the full tall bar
  - `src/gantt.ts` (`setDimension`): Stacked-bars branch uses `group.milestoneRows ?? (group.layers.size || 1)` instead of just `layers.size`
  - `src/gantt.ts` (`renderTaskLabels`, `renderClickableAreas`): Both used `task.layers.size` for computing the group height for label/divider positioning; changed to `task.milestoneRows ?? (task.layers.size || 1)`. After re-packing, `layers` is a sparse map (keys could be 0, 3 rather than 0, 1, 2, 3) so `layers.size` no longer equals total rows
  - `src/gantt.ts` (update flow, line ~1941): Calls `updateStackedGroupMilestoneRows` then `reindexStackedGroups` after TimeScale is set, before `setDimension`

### ✅ Milestone-Aware Tall Bars — Normal Mode
- **Problem:** In normal mode (stacked bars OFF, group tasks OFF), when a task had multiple close milestones, they stacked vertically using `stackIndex` offsets but spilled out of the fixed-height row into the adjacent task's row below.
- **Fix:** Applied the same milestone slot computation to normal mode. A task with `milestoneSlots=3` now has a bar 3× the normal height and its row is 3× taller, pushing all subsequent tasks down accordingly.
- **Files changed:** `src/gantt.ts`
- **Key implementation details:**
  - `src/gantt.ts` (`updateNormalModeMilestoneRows`): New method — for each group (each group = one task in normal mode), computes `task.milestoneSlots` from pixel x positions and sets `group.milestoneRows = task.milestoneSlots`
  - `src/gantt.ts` (`reindexNormalModeGroups`): New method — walks groups in order, assigns sequential `group.index` and `task.index`, advancing by `milestoneRows` per group instead of always 1
  - `src/gantt.ts` (update flow): Calls `updateNormalModeMilestoneRows` + `reindexNormalModeGroups` when `!stackedBars && !groupTasks && hasNotNullableDates` (after TimeScale, before `setDimension`)
  - `src/gantt.ts` (`setDimension`): Normal-mode branch changed from `totalRows++` to `totalRows += group.milestoneRows ?? 1`
  - `src/gantt.ts` (`createMilestoneLine`): Fixed `tasksTotal` for normal mode — was `tasks.length` (group count, no longer equals row count when tasks grow), now `lastTaskGroup.index + (lastTaskGroup.milestoneRows ?? 1)` so dotted lines extend to the full chart height
  - `drawTaskRect` and `taskDaysOffRender` already use `task.milestoneSlots` so they work automatically once it's populated

### ✅ Timeline Zoom (Ctrl + Mouse Wheel)
- **Implemented:** Cursor-anchored horizontal zoom on the timeline axis. Hold Ctrl and scroll the mouse wheel over the Gantt chart to zoom in/out. The date under the cursor stays fixed.
- **Behavior:**
  - Min zoom 0.25x, max 8x
  - Each wheel tick multiplies zoom by 1.15 (up) or 1/1.15 (down)
  - Zoom factor persists within the session; resets to 1x on visual reload (not persisted to settings)
  - Cursor-anchored: the date under the mouse stays visually fixed through the zoom (mouseX inverted to date before zoom, then re-scrolled after re-render)
  - Only vertical scroll (`deltaY`) is read; horizontal scroll isn't zoom-ified
- **Files changed:** `src/gantt.ts`
- **Key implementation details:**
  - New instance fields (near line 385):
    - `zoomFactor: number = 1` — current multiplier applied to axis length
    - `_lastOptions: VisualUpdateOptions = null` — cached so the wheel handler can re-trigger `updateInternal`
    - `_pendingZoomAnchor: { cursorDate: Date; mouseXInChart: number } = null` — hands the cursor anchor from wheel handler into the next `updateInternal` pass
  - `update()` stores `this._lastOptions = options;` before the try block
  - `updateInternal` applies `axisLength *= this.zoomFactor;` right after the first `scaleAxisLength` call
  - `createViewport` attaches a native `addEventListener("wheel", ..., { passive: false })` on `this.ganttDiv.node()` (NOT D3's `.on()` — we need `{ passive: false }` to call `event.preventDefault()`). The handler:
    1. Returns early if `!event.ctrlKey`
    2. Computes `mouseXInChart = event.clientX - ganttDivRect.left - (taskLabelsWidth + margin.left + SubtasksLeftMargin)`
    3. `cursorDate = Gantt.TimeScale.invert(mouseXInChart + scrollLeft)`
    4. Updates `this.zoomFactor` clamped to [0.25, 8]
    5. Stores anchor, calls `this.updateInternal(this._lastOptions)`
  - Tail of `updateInternal` replaces unconditional `scrollToMilestoneLine`:
    ```ts
    if (this._pendingZoomAnchor !== null) {
        const anchor = this._pendingZoomAnchor;
        this._pendingZoomAnchor = null;
        this.ganttDiv.node().scrollLeft = Gantt.TimeScale(anchor.cursorDate) - anchor.mouseXInChart;
    } else if (this.formattingSettings.general.scrollToCurrentTime.value && this.hasNotNullableDates) {
        this.scrollToMilestoneLine(axisLength);
    }
    ```

## ✅ Resolved Debugging Session — Milestone Marker Tooltips (resolved 2026-04-20)

### Goal
When hovering a milestone marker (diamond/circle/square inside `<g class="task-milestone">`), show milestone-specific tooltip content such as `FAI Date: 2025-02-23` and `Task: Design Review`, instead of the task bar tooltip.

### Final root cause
This was primarily an **SVG render-order / hit-testing issue**, not a Power BI tooltip-service issue.

- The milestone tooltip content itself was already correct once `milestone.tooltipInfo` was set in `addTooltipInfoForCollapsedTasks`.
- The milestone path tooltip wiring in `MilestonesRender` was also basically correct once it used `tooltipServiceWrapper.addTooltip(..., null)` and `pointerover/pointermove/pointerout` stopPropagation handlers.
- The real problem was that the milestone group was being rendered too early relative to the bar overlays (`taskProgressRender`, `taskDaysOffRender`). When the milestone sat **on top of the bar**, the bar layer won hit-testing, so the parent task tooltip showed.
- When a milestone was moved **outside** the bar for testing, the milestone tooltip worked immediately. That was the key proof that the issue was layering, not tooltip content.

### Final working fix
The minimal working fix in `src/gantt.ts` was:

1. Keep milestone-specific tooltip content:
   ```ts
   milestone.tooltipInfo = [
       { displayName: milestone.type, value: dateFormatted },
       { displayName: "Task", value: task.name }
   ];
   ```
2. In `renderTasks`, move `MilestonesRender(taskSelection, taskConfigHeight)` to run **after** `taskProgressRender(...)` and `taskDaysOffRender(...)`.
3. In `MilestonesRender`, call:
   ```ts
   taskMilestonesMerged.raise();
   ```
   so the milestone group is explicitly brought to the front even on update passes where D3 reuses existing DOM nodes.

### Important implementation note
`taskMilestonesMerged.raise()` mattered because simply changing call order is not always enough once nodes already exist. D3 `merge()` reuses DOM nodes, and `raise()` guarantees the `<g class="task-milestone">` container becomes the last child in its parent `<g class="task">`, so milestone paths win hit-testing over the bar overlays.

### What was tried but not needed in the final fix
- Temporary debug `console.log` / native `pointerover` listeners
- Extra invisible milestone hit-area rects
- Broad `pointer-events: none` changes on unrelated background / line elements

Those experiments were useful for diagnosis but are **not part of the final minimal fix**.

### How to validate
- Package the visual with `pbiviz package`
- Re-import into Power BI Desktop
- Hover a milestone marker that overlaps a task bar
- Expected: the milestone tooltip shows milestone info, not task-bar info

No Power BI Service publish / F12 debugging is required for normal validation once this fix is in place.

### Environment facts
- User is on Windows, Power BI Desktop installed via Microsoft Store (MSIX), running in WebView2.
- Successful validation happened in Power BI Desktop after packaging and re-importing the visual.

### Session working rules (established by user this session)
- **No `git commit`, `git add`, or `git push`** without explicit approval.
- **No new branches.**
- **No `pbiviz package` until explicitly asked** (`go run pbiviz package`).
- **Show diffs and wait for approval** after each logical chunk.

## Planned Modifications (Priority Order)

### 1. Wider Task Label Area / Non-Truncated Labels
- **Problem:** Task names are truncated ("Design Rev...", "Tooling Fa...") in the narrow left label area.
- **Goal:** Make the label column wider or auto-sizing so full task names are visible, similar to how Lingaro displays full task names in a table-like left panel.

### 2. Extra Columns (Data Grid on Left Side)
- **Problem:** Microsoft Gantt only shows the task name on the left. Lingaro supports an "Extra Columns" field bucket to show additional data columns (e.g., status, owner, dates) next to task names before the timeline starts.
- **Goal:** Add an "Extra Columns" data role in `capabilities.json` and render additional columns in the left panel area.
- **Complexity:** Medium-high — requires modifying data binding, SVG layout, and formatting options.

### 3. Status-Based Bar Coloring
- **Problem:** Microsoft Gantt colors bars by a Legend category field. Lingaro supports computed status coloring: Milestone, Completed, On Track, Slightly Behind, Behind, Overdue, Future Task — each with a different color.
- **Goal:** Support conditional bar coloring based on task status relative to dates.
- **Approach options:**
  - DAX-based: Create a calculated column in Power BI that computes status, then use it as the Legend field. This requires no code changes to the visual.
  - Code-based: Build status logic into the visual itself. More work but cleaner UX.
- **Recommendation:** Start with the DAX approach (no visual code changes needed), then consider code-based if the DAX approach is insufficient.

### 4. Hierarchical View Improvements
- **Goal:** Cleaner collapse/expand icons, timeline rollup when programs are collapsed (showing aggregated bars at the program level), support for 3 hierarchy levels (Portfolio → Program → Task).
- **Reference:** Lingaro supports "Roll up the timeline when aggregating items (i.e., into projects, programs, and portfolios) in the hierarchical view."

### 5. Milestone Vertical Dotted Lines — Further Refinement (if needed)
- The toggle exists. Outstanding concern: with multiple milestone columns, each unique date still gets a full-height dotted line. Consider whether the user wants dotted lines per milestone column, or one line per unique date across all columns (current behavior).

## Key Context

### Milestones in This Domain
- In aerospace project management, milestones are key gate dates per task: PDR Complete, CDR Complete, FAI Complete, Type Certificate, Delivery, etc.
- In Smartsheet, these are date columns on each task row (not zero-duration tasks).
- In our custom visual, the Milestones bucket accepts **multiple date columns** (up to 10). Each column represents one milestone type. The date value in that column positions the marker on the timeline for that task row.
- Milestone markers (diamond/square/circle) overlay on top of the task bar — the bar remains visible.
- When multiple milestones are within ~20px of each other horizontally, they stack vertically inside the bar. The bar and its row grow tall enough to contain all stacked milestones. This works in both normal mode and stacked bars mode.
- The dotted vertical lines that span the full chart height can be toggled off in the Milestones formatting card.
- **Important:** Avoid the original Microsoft Gantt "milestone task" pattern (single string column, marker at task start). That design is superseded by the multi-column date approach above.

### Stacked Bars Mode — Architecture Summary
For new sessions: the stacked bars layout is a significant departure from the standard rendering. Key things to know:
- `GroupedTask.tasks` = array containing the **parent placeholder task** (no dates, has `children`). Used for left-panel label rendering only.
- `GroupedTask.layers` = Map of `laneIndex → Task[]` containing the **actual dated child tasks**. This is what gets rendered as bars.
- Layout runs in **two passes**: pass-1 (time-based, `buildStackedGroupedTasks`) before TimeScale exists; pass-2 (pixel-based milestone stacking, `updateStackedGroupMilestoneRows`) after TimeScale is set. `reindexStackedGroups` re-numbers rows sequentially after pass-2 changes group sizes.
- `task.milestoneSlots` (set in pass-2) = number of vertical stack slots this task's milestones need = the bar's height multiplier.
- `group.milestoneRows` = total rows this group occupies in the SVG = used by `setDimension`, `renderTaskLabels`, `renderClickableAreas`, and `createMilestoneLine`.
- `group.layers` after pass-2 is **sparse**: keys are the actual row offsets (e.g., {0: [A], 3: [B]} for a 4-row group where A is 3 rows tall). Do NOT use `group.layers.size` for row counts — use `group.milestoneRows`.

### Normal Mode — Architecture Summary
- Each task is its own `GroupedTask` with `group.tasks = [task]` and `group.layers = new Map()` (empty).
- After TimeScale: `updateNormalModeMilestoneRows` computes `task.milestoneSlots` and `group.milestoneRows` for each group. `reindexNormalModeGroups` reassigns sequential indices so tall tasks push subsequent tasks down.
- `setDimension` uses `group.milestoneRows ?? 1` (not a hardcoded `++`).
- `drawTaskRect` uses `task.milestoneSlots` for bar height in both modes — no mode-specific logic needed there.

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
