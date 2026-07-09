const storageKey = "count-that-shi-counters";
const blockGroupStorageKey = "count-that-shi-block-groups";
const themeStorageKey = "count-that-shi-theme";
const viewStorageKey = "count-that-shi-view";
const defaultBlockGroupId = "default";
const defaultAccountType = "Weekly";
const mergedCategories = [
  "Images Quality mode",
  "Images Speed mode",
  "Image edits",
  "720p 6s",
  "720p 10s",
  "720p 15s",
  "720p extend 6s",
  "720p extend 10s",
  "480p 6s",
  "480p 10s",
  "480p 15s",
  "480p extend 6s",
  "480p extend 10s",
];
const mergedCategoryAliases = {
  "Extend 720p +10s": "720p extend 10s",
  "Extend 720p 10s": "720p extend 10s",
};

const els = {
  newCounterButton: document.querySelector("#newCounterButton"),
  newGroupButton: document.querySelector("#newGroupButton"),
  previewButton: document.querySelector("#previewButton"),
  themeToggleButton: document.querySelector("#themeToggleButton"),
  filterSelect: document.querySelector("#filterSelect"),
  sortSelect: document.querySelector("#sortSelect"),
  counterDialog: document.querySelector("#counterDialog"),
  counterForm: document.querySelector("#counterForm"),
  counterName: document.querySelector("#counterName"),
  counterGroup: document.querySelector("#counterGroup"),
  cancelDialogButton: document.querySelector("#cancelDialogButton"),
  copyDialog: document.querySelector("#copyDialog"),
  copyDetailsText: document.querySelector("#copyDetailsText"),
  importDialog: document.querySelector("#importDialog"),
  importForm: document.querySelector("#importForm"),
  importDetailsText: document.querySelector("#importDetailsText"),
  importError: document.querySelector("#importError"),
  cancelImportButton: document.querySelector("#cancelImportButton"),
  previewDialog: document.querySelector("#previewDialog"),
  previewAccountSelect: document.querySelector("#previewAccountSelect"),
  previewSummary: document.querySelector("#previewSummary"),
  previewTableBody: document.querySelector("#previewTableBody"),
  counterList: document.querySelector("#counterList"),
  emptyState: document.querySelector("#emptyState"),
};

let blockGroups = loadBlockGroups();
let blocks = loadBlocks();
let theme = localStorage.getItem(themeStorageKey) || "light";
let viewOptions = loadViewOptions();
let counterFeedback = null;
let draggedItem = null;
let pointerDrag = null;
let importTargetBlockId = null;

syncBlockGroups();
saveBlocks();

function loadBlocks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) ? saved.map(normalizeBlock) : [];
  } catch {
    return [];
  }
}

function normalizeBlock(item) {
  const groups = Array.isArray(item.groups)
    ? item.groups.map(normalizeGroup)
    : [
        {
          id: crypto.randomUUID(),
          name: "Sub-block 1",
          counters: Array.isArray(item.counters)
            ? item.counters.map(normalizeCounter)
            : [normalizeCounter(item)],
        },
      ];

  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || "Untitled block",
    accountType: normalizeAccountType(
      item.accountType || item.accountSystem || inferAccountType(item.name)
    ),
    blockGroupId: item.blockGroupId || defaultBlockGroupId,
    date: item.date || "",
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    usageStart: percentFromInput(item.usageStart),
    usageEnd: percentFromInput(item.usageEnd),
    collapsed: Boolean(item.collapsed),
    groups: groups.length ? groups : [createGroupData("Sub-block 1")],
  };
}

function loadBlockGroups() {
  try {
    const saved = JSON.parse(localStorage.getItem(blockGroupStorageKey) || "[]");
    return Array.isArray(saved) && saved.length
      ? saved.map(normalizeBlockGroup)
      : [createBlockGroupData("Main group", defaultBlockGroupId)];
  } catch {
    return [createBlockGroupData("Main group", defaultBlockGroupId)];
  }
}

function normalizeBlockGroup(group) {
  return {
    id: group.id || crypto.randomUUID(),
    name: group.name || "Untitled group",
    collapsed: Boolean(group.collapsed),
  };
}

function normalizeGroup(group) {
  return {
    id: group.id || crypto.randomUUID(),
    name: group.name || "Untitled sub-block",
    counters:
      Array.isArray(group.counters) && group.counters.length
        ? group.counters.map(normalizeCounter)
        : [createCounterData("Counter 1")],
  };
}

function normalizeCounter(counter) {
  const category = normalizeMergedCategory(
    counter.category || counter.mergedCategory || counter.name
  );
  return {
    id: counter.id || crypto.randomUUID(),
    name: category,
    category,
    value: numberFromInput(counter.value),
    moderated: Math.max(0, numberFromInput(counter.moderated)),
    includeInComparison: counter.includeInComparison !== false,
    multiplier: multiplierFromInput(counter.multiplier),
  };
}

function loadViewOptions() {
  try {
    const saved = JSON.parse(localStorage.getItem(viewStorageKey) || "{}");
    return {
      filter: saved.filter || "all",
      sort: saved.sort || "manual",
    };
  } catch {
    return { filter: "all", sort: "manual" };
  }
}

function createGroupData(name) {
  return {
    id: crypto.randomUUID(),
    name,
    counters: [createCounterData("Counter 1")],
  };
}

function createBlockGroupData(name, id = crypto.randomUUID()) {
  return {
    id,
    name,
    collapsed: false,
  };
}

function createCounterData(name) {
  const category = normalizeMergedCategory(name);
  return {
    id: crypto.randomUUID(),
    name: category,
    category,
    value: 0,
    usage: "",
    moderated: 0,
    includeInComparison: true,
    multiplier: 1,
  };
}

function saveBlocks() {
  localStorage.setItem(storageKey, JSON.stringify(blocks));
}

function saveBlockGroups() {
  localStorage.setItem(blockGroupStorageKey, JSON.stringify(blockGroups));
}

function inferAccountType(value) {
  const text = String(value || "");
  if (/account\s*2|acct\s*2/i.test(text)) return "Account2";
  if (/weekly|week/i.test(text)) return "Weekly";
  if (/daily|day/i.test(text)) return "Daily";
  return defaultAccountType;
}

function normalizeAccountType(value) {
  const trimmed = String(value || "").trim();
  return trimmed || defaultAccountType;
}

function getAccountTypes() {
  const accountTypes = blocks.map((block) => normalizeAccountType(block.accountType));
  return Array.from(new Set([defaultAccountType, ...accountTypes])).sort((left, right) =>
    left.localeCompare(right)
  );
}

function normalizeMergedCategory(value) {
  const normalized = mergedCategoryAliases[value] || value;
  return mergedCategories.includes(normalized) ? normalized : mergedCategories[0];
}

function optionMarkup(options, selectedValue) {
  return options
    .map(
      (option) =>
        `<option value="${escapeAttribute(option)}" ${option === selectedValue ? "selected" : ""}>${escapeAttribute(option)}</option>`
    )
    .join("");
}

function syncBlockGroups() {
  if (!blockGroups.length) {
    blockGroups = [createBlockGroupData("Main group", defaultBlockGroupId)];
  }

  const groupIds = new Set(blockGroups.map((group) => group.id));
  let changedBlocks = false;

  blocks = blocks.map((block) => {
    if (groupIds.has(block.blockGroupId)) return block;
    changedBlocks = true;
    return { ...block, blockGroupId: blockGroups[0].id };
  });

  if (changedBlocks) saveBlocks();
  saveBlockGroups();
}

function saveTheme() {
  localStorage.setItem(themeStorageKey, theme);
}

function saveViewOptions() {
  localStorage.setItem(viewStorageKey, JSON.stringify(viewOptions));
}

function createBlock(name, blockGroupId = blockGroups[0]?.id || defaultBlockGroupId) {
  const targetGroupId = blockGroups.some((group) => group.id === blockGroupId)
    ? blockGroupId
    : blockGroups[0]?.id || defaultBlockGroupId;

  blocks.unshift({
    id: crypto.randomUUID(),
    name,
    accountType: defaultAccountType,
    blockGroupId: targetGroupId,
    date: "",
    startTime: "",
    endTime: "",
    usageStart: "",
    usageEnd: "",
    collapsed: false,
    groups: [createGroupData("Sub-block 1")],
  });
  saveBlocks();
  render();
}

function populateNewBlockGroupSelect() {
  els.counterGroup.innerHTML = blockGroups
    .map(
      (group) =>
        `<option value="${escapeAttribute(group.id)}">${escapeAttribute(group.name)}</option>`
    )
    .join("");
}

function openNewBlockDialog(blockGroupId = blockGroups[0]?.id || defaultBlockGroupId) {
  els.counterName.value = "";
  populateNewBlockGroupSelect();
  els.counterGroup.value = blockGroups.some((group) => group.id === blockGroupId)
    ? blockGroupId
    : blockGroups[0]?.id || defaultBlockGroupId;
  els.counterDialog.showModal();
  els.counterName.focus();
}

function createBlockGroup(name) {
  blockGroups.push(createBlockGroupData(name));
  saveBlockGroups();
  render();
}

function updateBlockGroup(groupId, changes, shouldRender = true) {
  blockGroups = blockGroups.map((group) =>
    group.id === groupId ? { ...group, ...changes } : group
  );
  saveBlockGroups();
  if (shouldRender) render();
}

function removeBlockGroup(groupId) {
  if (blockGroups.length === 1) return;

  const fallbackGroup = blockGroups.find((group) => group.id !== groupId);
  blockGroups = blockGroups.filter((group) => group.id !== groupId);
  blocks = blocks.map((block) =>
    block.blockGroupId === groupId
      ? { ...block, blockGroupId: fallbackGroup.id }
      : block
  );
  saveBlockGroups();
  saveBlocks();
  render();
}

function moveBlockGroup(groupId, targetGroupId, placeAfter) {
  blockGroups = moveItem(blockGroups, groupId, targetGroupId, placeAfter);
  saveBlockGroups();
  render();
}

function updateBlock(blockId, changes, shouldRender = true) {
  blocks = blocks.map((block) =>
    block.id === blockId ? { ...block, ...changes } : block
  );
  saveBlocks();
  if (shouldRender) render();
}

function updateBlockName(blockId, value) {
  blocks = blocks.map((block) =>
    block.id === blockId ? { ...block, name: value } : block
  );
  saveBlocks();
}

function removeBlock(blockId) {
  blocks = blocks.filter((block) => block.id !== blockId);
  saveBlocks();
  render();
}

function addGroupToBlock(blockId) {
  blocks = blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          groups: [
            ...block.groups,
            createGroupData(`Sub-block ${block.groups.length + 1}`),
          ],
        }
      : block
  );
  saveBlocks();
  render();
}

function updateGroup(blockId, groupId, changes, shouldRender = true) {
  blocks = blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          groups: block.groups.map((group) =>
            group.id === groupId ? { ...group, ...changes } : group
          ),
        }
      : block
  );
  saveBlocks();
  if (shouldRender) render();
}

function removeGroup(blockId, groupId) {
  blocks = blocks.map((block) => {
    if (block.id !== blockId || block.groups.length === 1) return block;
    return {
      ...block,
      groups: block.groups.filter((group) => group.id !== groupId),
    };
  });
  saveBlocks();
  render();
}

function moveGroup(blockId, groupId, targetGroupId, placeAfter) {
  blocks = blocks.map((block) => {
    if (block.id !== blockId) return block;
    return { ...block, groups: moveItem(block.groups, groupId, targetGroupId, placeAfter) };
  });
  saveBlocks();
  render();
}

function addCounterToGroup(blockId, groupId) {
  blocks = blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          groups: block.groups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  counters: [
                    ...group.counters,
                    createCounterData(`Counter ${group.counters.length + 1}`),
                  ],
                }
              : group
          ),
        }
      : block
  );
  saveBlocks();
  render();
}

function updateCounter(
  blockId,
  groupId,
  counterId,
  changes,
  shouldRender = true,
  feedbackType = ""
) {
  blocks = blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          groups: block.groups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  counters: group.counters.map((counter) =>
                    counter.id === counterId
                      ? { ...counter, ...changes }
                      : counter
                  ),
                }
              : group
          ),
        }
      : block
  );
  saveBlocks();
  if (feedbackType) counterFeedback = { counterId, type: feedbackType };
  if (shouldRender) {
    render();
    counterFeedback = null;
  }
}

function removeCounter(blockId, groupId, counterId) {
  blocks = blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          groups: block.groups.map((group) => {
            if (group.id !== groupId || group.counters.length === 1) return group;
            return {
              ...group,
              counters: group.counters.filter(
                (counter) => counter.id !== counterId
              ),
            };
          }),
        }
      : block
  );
  saveBlocks();
  render();
}

function moveCounter(blockId, groupId, counterId, targetCounterId, placeAfter) {
  blocks = blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          groups: block.groups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  counters: moveItem(
                    group.counters,
                    counterId,
                    targetCounterId,
                    placeAfter
                  ),
                }
              : group
          ),
        }
      : block
  );
  saveBlocks();
  render();
}

function moveItem(items, itemId, targetId, placeAfter) {
  const next = [...items];
  const fromIndex = next.findIndex((item) => item.id === itemId);
  const targetIndex = next.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
    return items;
  }

  const [movedItem] = next.splice(fromIndex, 1);
  const adjustedTargetIndex = next.findIndex((item) => item.id === targetId);
  next.splice(adjustedTargetIndex + (placeAfter ? 1 : 0), 0, movedItem);
  return next;
}

function clearDragTargets() {
  els.counterList
    .querySelectorAll(
      ".block-group-row.is-drag-over, .counter-row.is-drag-over, .sub-block.is-drag-over, .is-drop-after"
    )
    .forEach((row) => {
      row.classList.remove("is-drag-over", "is-drop-after");
    });
}

function getDragTargetFromPoint(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  if (!element || !draggedItem) return null;

  if (draggedItem.type === "blockGroup") {
    const blockGroupRow = element.closest(".block-group-row");
    if (
      !blockGroupRow ||
      blockGroupRow.dataset.blockGroupId === draggedItem.blockGroupId
    ) {
      return null;
    }
    const bounds = blockGroupRow.getBoundingClientRect();
    return {
      kind: "blockGroup",
      row: blockGroupRow,
      targetId: blockGroupRow.dataset.blockGroupId,
      placeAfter: clientY > bounds.top + bounds.height / 2,
    };
  }

  const blockRow = element.closest(".block-row");
  if (!blockRow || blockRow.dataset.blockId !== draggedItem.blockId) return null;

  if (draggedItem.type === "group") {
    const groupRow = element.closest(".sub-block");
    if (!groupRow || groupRow.dataset.groupId === draggedItem.groupId) return null;
    const bounds = groupRow.getBoundingClientRect();
    return {
      kind: "group",
      row: groupRow,
      targetId: groupRow.dataset.groupId,
      placeAfter: clientY > bounds.top + bounds.height / 2,
    };
  }

  const groupRow = element.closest(".sub-block");
  const counterRow = element.closest(".counter-row");
  if (
    !groupRow ||
    !counterRow ||
    groupRow.dataset.groupId !== draggedItem.groupId ||
    counterRow.dataset.counterId === draggedItem.counterId
  ) {
    return null;
  }

  const bounds = counterRow.getBoundingClientRect();
  return {
    kind: "counter",
    row: counterRow,
    targetId: counterRow.dataset.counterId,
    placeAfter: clientY > bounds.top + bounds.height / 2,
  };
}

function showDragTarget(clientX, clientY) {
  const target = getDragTargetFromPoint(clientX, clientY);
  clearDragTargets();
  if (!target) return null;
  target.row.classList.add("is-drag-over");
  target.row.classList.toggle("is-drop-after", target.placeAfter);
  return target;
}

function endPointerDrag() {
  pointerDrag = null;
  draggedItem = null;
  clearDragTargets();
  els.counterList
    .querySelectorAll(".is-dragging")
    .forEach((row) => row.classList.remove("is-dragging"));
  document.body.classList.remove("is-reordering");
}

function numberFromInput(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimalFromInput(value) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : "";
}

function percentFromInput(value) {
  const parsed = decimalFromInput(value);
  if (parsed === "") return "";
  return Math.max(0, Math.min(100, parsed));
}

function multiplierFromInput(value) {
  const parsed = numberFromInput(value);
  return parsed > 0 ? parsed : 1;
}

function safeDivide(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function formatNumber(value, maximumFractionDigits = 0) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatPercent(value) {
  return `${formatNumber(value * 100, 2)}%`;
}

function tooltip(value) {
  return escapeAttribute(value);
}

function getAccountType(block) {
  return normalizeAccountType(block.accountType);
}

function getBlockUsageDelta(block) {
  if (block.usageStart === "" || block.usageEnd === "") return 0;
  return Math.max(0, (block.usageEnd - block.usageStart) / 100);
}

function getBlockOutputTotal(block) {
  return block.groups.reduce(
    (blockTotal, group) =>
      blockTotal +
      group.counters.reduce((groupTotal, counter) => groupTotal + counter.value, 0),
    0
  );
}

function getRawPreviewRows() {
  return blocks.flatMap((block) => {
    const accountType = getAccountType(block);
    const usageDelta = getBlockUsageDelta(block);
    const blockTotalOutputs = getBlockOutputTotal(block);

    return block.groups.flatMap((group) =>
      group.counters.map((counter) => {
        const allocatedUsage = safeDivide(usageDelta * counter.value, blockTotalOutputs);

        return {
          blockId: block.id,
          blockName: block.name,
          accountType,
          date: block.date,
          startTime: block.startTime,
          endTime: block.endTime,
          originalCategory: counter.name,
          mergedCategory: counter.category || counter.name,
          totalOutputs: counter.value,
          moderatedOutputs: counter.moderated,
          includeInComparison: counter.includeInComparison,
          allocatedUsage,
        };
      })
    );
  });
}

function getPreviewMetrics(accountType = defaultAccountType) {
  const rows = getRawPreviewRows();
  const accountRows = rows.filter((row) => row.accountType === accountType);
  const includedRows = accountRows.filter((row) => row.includeInComparison);
  const accountUsageTotal = accountRows.reduce((sum, row) => sum + row.allocatedUsage, 0);
  const categories = new Map();

  accountRows.forEach((row) => {
    const key = row.mergedCategory || "Uncategorized";
    const current =
      categories.get(key) ||
      {
        category: key,
        combinedOutputs: 0,
        combinedModerated: 0,
        combinedUsage: 0,
      };
    current.combinedOutputs += row.totalOutputs;
    current.combinedModerated += row.moderatedOutputs;
    current.combinedUsage += row.allocatedUsage;
    categories.set(key, current);
  });

  const categoryRows = Array.from(categories.values())
    .map((row) => ({
      ...row,
      shareOfTrackedUsage: safeDivide(row.combinedUsage, accountUsageTotal),
      outputsPer1PctUsage: safeDivide(row.combinedOutputs, row.combinedUsage * 100),
      estimatedFullTwoAccountCap: safeDivide(row.combinedOutputs, accountUsageTotal),
      moderationRate: safeDivide(row.combinedModerated, row.combinedOutputs),
      avgOutputsIfOnlyThisCategory: safeDivide(row.combinedOutputs, row.combinedUsage),
    }))
    .sort((left, right) => right.combinedOutputs - left.combinedOutputs);

  return {
    rows,
    accountType,
    accountRows,
    categoryRows,
    accountOutputs: includedRows.reduce(
      (sum, row) => sum + row.totalOutputs,
      0
    ),
    accountModerated: includedRows.reduce(
      (sum, row) => sum + row.moderatedOutputs,
      0
    ),
    accountUsageTotal,
  };
}

function renderPreview() {
  const accountTypes = getAccountTypes();
  const selectedAccount = accountTypes.includes(els.previewAccountSelect.value)
    ? els.previewAccountSelect.value
    : defaultAccountType;
  els.previewAccountSelect.innerHTML = optionMarkup(accountTypes, selectedAccount);
  els.previewAccountSelect.value = selectedAccount;

  const metrics = getPreviewMetrics(selectedAccount);
  const projectedFullCap = safeDivide(metrics.accountOutputs, metrics.accountUsageTotal);

  els.previewSummary.innerHTML = `
    <div title="${tooltip(`Preview is filtered to account type: ${metrics.accountType}`)}"><strong>${escapeAttribute(metrics.accountType)}</strong><span>Account type</span></div>
    <div title="${tooltip(`Sum of outputs from included counters for ${metrics.accountType}.`)}"><strong>${formatNumber(metrics.accountOutputs)}</strong><span>Included outputs</span></div>
    <div title="${tooltip(`${formatNumber(metrics.accountOutputs)} outputs / ${formatPercent(metrics.accountUsageTotal)} tracked usage = ${formatNumber(projectedFullCap)} projected full cap.`)}"><strong>${formatNumber(projectedFullCap)}</strong><span>Projected full cap</span></div>
    <div title="${tooltip(`Total tracked usage from block usage start/end: ${formatPercent(metrics.accountUsageTotal)}.`)}"><strong>${formatPercent(metrics.accountUsageTotal)}</strong><span>Tracked usage</span></div>
  `;

  els.previewTableBody.innerHTML = metrics.categoryRows.length
    ? metrics.categoryRows
        .map(
          (row) => {
            const categoryUsagePoints = row.combinedUsage * 100;
            return `
            <tr>
              <td title="${tooltip(`Merged category: ${row.category}`)}">${escapeAttribute(row.category)}</td>
              <td title="${tooltip(`Sum of outputs in ${row.category}: ${formatNumber(row.combinedOutputs)}.`)}">${formatNumber(row.combinedOutputs)}</td>
              <td title="${tooltip(`Sum of moderated outputs in ${row.category}: ${formatNumber(row.combinedModerated)}.`)}">${formatNumber(row.combinedModerated)}</td>
              <td title="${tooltip(`Allocated usage for ${row.category}: ${formatPercent(row.combinedUsage)}.`)}">${formatPercent(row.combinedUsage)}</td>
              <td title="${tooltip(`${formatPercent(row.combinedUsage)} category usage / ${formatPercent(metrics.accountUsageTotal)} tracked usage = ${formatPercent(row.shareOfTrackedUsage)}.`)}">${formatPercent(row.shareOfTrackedUsage)}</td>
              <td title="${tooltip(`${formatNumber(row.combinedOutputs)} outputs / ${formatNumber(categoryUsagePoints, 2)} usage percentage points = ${formatNumber(row.outputsPer1PctUsage, 2)}.`)}">${formatNumber(row.outputsPer1PctUsage, 2)}</td>
              <td title="${tooltip(`${formatNumber(row.combinedOutputs)} outputs / ${formatPercent(metrics.accountUsageTotal)} tracked usage = ${formatNumber(row.estimatedFullTwoAccountCap)}.`)}">${formatNumber(row.estimatedFullTwoAccountCap)}</td>
              <td title="${tooltip(`${formatNumber(row.combinedModerated)} moderated / ${formatNumber(row.combinedOutputs)} outputs = ${formatPercent(row.moderationRate)}.`)}">${formatPercent(row.moderationRate)}</td>
              <td title="${tooltip(`${formatNumber(row.combinedOutputs)} outputs / ${formatPercent(row.combinedUsage)} category usage = ${formatNumber(row.avgOutputsIfOnlyThisCategory)} if 100% usage was this category.`)}">${formatNumber(row.avgOutputsIfOnlyThisCategory)}</td>
            </tr>
          `;
          }
        )
        .join("")
    : `<tr><td colspan="9">Add counters with merged categories to preview estimates.</td></tr>`;
}

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  els.themeToggleButton.textContent =
    theme === "dark" ? "Light mode" : "Dark mode";
}

function applyViewControls() {
  els.filterSelect.value = viewOptions.filter;
  els.sortSelect.value = viewOptions.sort;
}

function getVisibleBlocks() {
  return blocks
    .filter(matchesFilter)
    .map((block, index) => ({ block, index }))
    .sort(compareBlocks)
    .map((item) => item.block);
}

function matchesFilter(block) {
  if (viewOptions.filter === "dated") return Boolean(block.date);
  if (viewOptions.filter === "undated") return !block.date;
  if (viewOptions.filter === "timed") return Boolean(block.startTime || block.endTime);
  if (viewOptions.filter === "today") return block.date === getLocalDateValue();
  return true;
}

function getLocalDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareBlocks(left, right) {
  if (viewOptions.sort === "name") {
    return left.block.name.localeCompare(right.block.name);
  }
  if (viewOptions.sort === "date") {
    return compareOptionalValues(left.block.date, right.block.date);
  }
  if (viewOptions.sort === "startTime") {
    return compareOptionalValues(left.block.startTime, right.block.startTime);
  }
  return left.index - right.index;
}

function compareOptionalValues(left, right) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
}

function formatBlockDetails(block) {
  const lines = [
    block.name || "Untitled block",
    `Account: ${block.accountType}`,
    `Date: ${block.date || "Not set"}`,
    `Time: ${formatTimeRange(block)}`,
    `Usage: ${block.usageStart === "" ? "Not set" : `${block.usageStart}%`} - ${block.usageEnd === "" ? "Not set" : `${block.usageEnd}%`}`,
    "",
    "Sub-blocks:",
  ];

  block.groups.forEach((group, groupIndex) => {
    lines.push(`  ${indexToLetters(groupIndex)}. ${group.name || "Untitled sub-block"}`);
    group.counters.forEach((counter, counterIndex) => {
      lines.push(
        `     ${counterIndex + 1}. ${counter.name || "Untitled counter"}: ${counter.value} | Category: ${counter.category || counter.name || "Uncategorized"} | Moderated: ${counter.moderated} | Include: ${counter.includeInComparison ? "Y" : "N"}`
      );
    });
  });

  return lines.join("\n");
}

function indexToLetters(index) {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }

  return label;
}

function formatTimeRange(block) {
  if (block.startTime && block.endTime) return `${block.startTime} - ${block.endTime}`;
  if (block.startTime) return `from ${block.startTime}`;
  if (block.endTime) return `until ${block.endTime}`;
  return "Not set";
}

function parseBlockDetails(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("Paste block details copied from this app.");
  }

  const subBlockIndex = lines.findIndex((line) => line.trim() === "Sub-blocks:");

  if (subBlockIndex === -1) {
    throw new Error("Missing Sub-blocks section.");
  }

  const groups = [];
  let currentGroup = null;
  const accountLine = lines.find((line) => line.startsWith("Account:"));
  const accountType = accountLine
    ? normalizeAccountType(accountLine.replace("Account:", "").trim())
    : inferAccountType(lines[0]);
  const usageLine = lines.find((line) => line.startsWith("Usage:"));
  const usageMatch = usageLine?.match(/Usage:\s*([^-\s]+|Not set)\s*-\s*([^-\s]+|Not set)/i);

  lines.slice(subBlockIndex + 1).forEach((line) => {
    const groupMatch = line.match(/^\s*[A-Z]+[.)-]\s+(.+)$/i);
    const counterMatch = line.match(/^\s+\d+\.\s+(.+?):\s*(-?\d+)(?:\s*\|\s*Category:\s*(.+?))?(?:\s*\|\s*Moderated:\s*(-?\d+))?(?:\s*\|\s*Include:\s*([YN]))?\s*$/i);

    if (counterMatch && currentGroup) {
      const name = counterMatch[1].trim() || "Untitled counter";
      currentGroup.counters.push({
        id: crypto.randomUUID(),
        name,
        category: normalizeMergedCategory(counterMatch[3]?.trim() || name),
        value: numberFromInput(counterMatch[2]),
        moderated: Math.max(0, numberFromInput(counterMatch[4])),
        includeInComparison: (counterMatch[5] || "Y").toUpperCase() === "Y",
        multiplier: 1,
      });
      return;
    }

    if (groupMatch) {
      currentGroup = {
        id: crypto.randomUUID(),
        name: groupMatch[1].trim() || "Untitled sub-block",
        counters: [],
      };
      groups.push(currentGroup);
    }
  });

  if (!groups.length) {
    throw new Error("No sub-blocks found.");
  }

  groups.forEach((group) => {
    if (!group.counters.length) {
      group.counters.push(createCounterData("Counter 1"));
    }
  });

  return {
    accountType,
    usageStart:
      usageMatch && usageMatch[1] !== "Not set"
        ? percentFromInput(usageMatch[1].replace("%", ""))
        : "",
    usageEnd:
      usageMatch && usageMatch[2] !== "Not set"
        ? percentFromInput(usageMatch[2].replace("%", ""))
        : "",
    groups,
  };
}

function importBlockDetails(blockId, details) {
  blocks = blocks.map((block) =>
    block.id === blockId ? { ...block, ...details } : block
  );
  saveBlocks();
  render();
}

async function copyText(text) {
  const fallbackCopied = copyTextWithTextarea(text);
  if (fallbackCopied) return true;

  if (navigator.clipboard?.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) =>
          window.setTimeout(() => reject(new Error("clipboard timeout")), 500)
        ),
      ]);
      return true;
    } catch {
      // Fall through to the textarea copy path below.
    }
  }

  return copyTextWithTextarea(text);
}

function copyTextWithTextarea(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function showCopyFeedback(button, copied = true) {
  const originalText = button.textContent;
  button.textContent = copied ? "Copied" : "Copy failed";
  button.classList.toggle("is-copied", copied);
  button.classList.toggle("is-copy-failed", !copied);
  window.setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove("is-copied");
    button.classList.remove("is-copy-failed");
  }, 1000);
}

function showCopyFallback(text) {
  els.copyDetailsText.value = text;
  els.copyDialog.showModal();
  els.copyDetailsText.focus();
  els.copyDetailsText.select();
}

function render() {
  els.counterList.innerHTML = "";
  const visibleBlocks = getVisibleBlocks();
  els.emptyState.classList.toggle("is-visible", blocks.length === 0);
  els.emptyState.textContent =
    blocks.length === 0
      ? "No blocks yet. Create one to start tracking."
      : "No blocks match the current filter.";

  blockGroups.forEach((group) => {
    const groupBlocks = visibleBlocks.filter((block) => block.blockGroupId === group.id);
    els.counterList.append(renderBlockGroup(group, groupBlocks));
  });
}

function renderBlockGroup(group, groupBlocks) {
  const groupRow = document.createElement("section");
  groupRow.className = group.collapsed
    ? "block-group-row is-collapsed"
    : "block-group-row";
  groupRow.dataset.blockGroupId = group.id;
  groupRow.innerHTML = `
    <div class="block-group-header">
      <button class="block-group-drag-handle" type="button" aria-label="Drag ${escapeAttribute(group.name)} group" title="Drag group">::</button>
      <button class="ghost-button icon-button" type="button" data-action="toggle-block-group" aria-label="${group.collapsed ? "Expand group" : "Minimize group"}" title="${group.collapsed ? "Expand group" : "Minimize group"}">
        <span class="button-icon ${group.collapsed ? "icon-expand" : "icon-collapse"}" aria-hidden="true"></span>
      </button>
      <input class="block-group-name-input" type="text" aria-label="Group name">
      <span class="block-group-count">${groupBlocks.length} ${groupBlocks.length === 1 ? "block" : "blocks"}</span>
      <button class="ghost-button" type="button" data-action="add-block-to-group" title="Add a block to this group">Add block</button>
      <button class="subtle-remove-button icon-button" type="button" data-action="remove-block-group" aria-label="Remove group" title="Remove group" ${blockGroups.length === 1 ? "disabled" : ""}>
        <span class="button-icon icon-delete" aria-hidden="true"></span>
      </button>
    </div>
    <div class="block-group-list"></div>
  `;

  groupRow.querySelector(".block-group-name-input").value = group.name;
  const list = groupRow.querySelector(".block-group-list");

  if (!group.collapsed) {
    if (groupBlocks.length) {
      groupBlocks.forEach((block) => {
        list.append(renderBlock(block));
      });
    } else {
      const emptyGroup = document.createElement("p");
      emptyGroup.className = "block-group-empty";
      emptyGroup.textContent = "No blocks in this group.";
      list.append(emptyGroup);
    }
  }

  return groupRow;
}

function renderBlock(block) {
  const blockRow = document.createElement("article");
  blockRow.className = block.collapsed ? "block-row is-collapsed" : "block-row";
  blockRow.dataset.blockId = block.id;
  blockRow.innerHTML = `
      <div class="block-header">
        <input class="block-name-input" type="text" aria-label="Block name" title="Block name">
        <input class="block-account-input" type="text" aria-label="Account type" title="Account type used by the preview selector" placeholder="Weekly">
        <select class="block-group-select" aria-label="Block group" title="Block group"></select>
        <input class="block-date-input" type="date" aria-label="Block date" title="Block date">
        <div class="block-time-range">
          <input class="block-time-input" type="time" step="60" aria-label="From time" title="Start time">
          <input class="block-time-input" type="time" step="60" aria-label="To time" title="End time">
        </div>
        <div class="block-usage-range">
          <input class="block-usage-input" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="Use start %" aria-label="Usage start percent" title="Usage percent at block start">
          <input class="block-usage-input" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="Use end %" aria-label="Usage end percent" title="Usage percent at block end">
        </div>
        <div class="block-actions">
          <button class="ghost-button icon-button" type="button" data-action="toggle-block" aria-label="${block.collapsed ? "Expand block" : "Minimize block"}" title="${block.collapsed ? "Expand block" : "Minimize block"}">
            <span class="button-icon ${block.collapsed ? "icon-expand" : "icon-collapse"}" aria-hidden="true"></span>
          </button>
          <button class="ghost-button" type="button" data-action="add-group" title="Add a sub-block">Add sub-block</button>
          <button class="ghost-button copy-button" type="button" data-action="copy-details" title="Export this block">Export</button>
          <button class="ghost-button" type="button" data-action="import-details" title="Import into this block">Import</button>
          <button class="remove-button icon-button" type="button" data-action="remove-block" aria-label="Remove block" title="Remove block">
            <span class="button-icon icon-delete" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="block-counter-list"></div>
    `;

  blockRow.querySelector(".block-name-input").value = block.name;
  blockRow.querySelector(".block-account-input").value = block.accountType;
  const groupSelect = blockRow.querySelector(".block-group-select");
  groupSelect.innerHTML = blockGroups
    .map(
      (group) =>
        `<option value="${escapeAttribute(group.id)}">${escapeAttribute(group.name)}</option>`
    )
    .join("");
  groupSelect.value = block.blockGroupId;
  blockRow.querySelector(".block-date-input").value = block.date;
  const timeInputs = blockRow.querySelectorAll(".block-time-input");
  timeInputs[0].value = block.startTime;
  timeInputs[1].value = block.endTime;
  const usageInputs = blockRow.querySelectorAll(".block-usage-input");
  usageInputs[0].value = block.usageStart;
  usageInputs[1].value = block.usageEnd;

  const groupList = blockRow.querySelector(".block-counter-list");
  if (!block.collapsed) {
    block.groups.forEach((group) => {
      groupList.append(renderGroup(block, group));
    });
  }

  return blockRow;
}

function renderGroup(block, group) {
  const groupRow = document.createElement("section");
  groupRow.className = "sub-block";
  groupRow.dataset.groupId = group.id;
  groupRow.innerHTML = `
    <div class="sub-block-header">
      <button class="group-drag-handle" type="button" aria-label="Drag ${escapeAttribute(group.name)}" title="Drag sub-block">::</button>
      <input class="group-name-input" type="text" aria-label="Sub-block name">
      <div class="group-actions">
        <button class="ghost-button" type="button" data-action="add-counter" title="Add a counter to this sub-block">Add counter</button>
        <button class="subtle-remove-button icon-button" type="button" data-action="remove-group" aria-label="Remove sub-block" title="Remove sub-block">
          <span class="button-icon icon-delete" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <div class="sub-block-counter-list"></div>
  `;

  groupRow.querySelector(".group-name-input").value = group.name;
  const counterList = groupRow.querySelector(".sub-block-counter-list");
  group.counters.forEach((counter) => {
    counterList.append(renderCounter(block, group, counter));
  });
  return groupRow;
}

function renderCounter(block, group, counter) {
  const counterRow = document.createElement("div");
  const feedbackType =
    counterFeedback?.counterId === counter.id ? counterFeedback.type : "";
  counterRow.className = feedbackType
    ? `counter-row has-counter-feedback is-${feedbackType}`
    : "counter-row";
  counterRow.dataset.counterId = counter.id;
  counterRow.innerHTML = `
    <button class="drag-handle" type="button" aria-label="Drag ${escapeAttribute(counter.name)}" title="Drag to reorder">::</button>
    <select class="counter-category-select" aria-label="${escapeAttribute(counter.name)} merged category" title="Merged category used in preview formulas">
      ${optionMarkup(mergedCategories, counter.category)}
    </select>
    <div class="counter-main">
      <input class="counter-multiplier" type="number" min="1" step="1" inputmode="numeric" placeholder="x" aria-label="${escapeAttribute(counter.name)} multiplier" title="Amount added or removed by the +/- buttons">
      <div class="counter-controls">
        <button class="counter-button" type="button" data-action="decrement" aria-label="Decrease ${escapeAttribute(counter.name)}" title="Decrease counter">-</button>
        <button class="counter-button" type="button" data-action="increment" aria-label="Increase ${escapeAttribute(counter.name)}" title="Increase counter">+</button>
      </div>
      <input class="counter-value${feedbackType ? ` is-${feedbackType}` : ""}" type="number" inputmode="numeric" aria-label="${escapeAttribute(counter.name)} value" title="Total outputs">
    </div>
    <input class="counter-moderated" type="number" min="0" step="1" inputmode="numeric" placeholder="Mod" aria-label="${escapeAttribute(counter.name)} moderated outputs" title="Moderated outputs">
    <label class="counter-include" title="Include this counter in the preview">
      <input class="counter-include-input" type="checkbox" aria-label="${escapeAttribute(counter.name)} include in comparison" title="Include this counter in the preview">
      <span>Y</span>
    </label>
    <div class="counter-actions">
      <button class="ghost-button icon-button" type="button" data-action="clear-counter" aria-label="Clear counter" title="Clear counter">
        <span class="button-icon icon-refresh" aria-hidden="true"></span>
      </button>
      <button class="subtle-remove-button icon-button" type="button" data-action="remove-counter" aria-label="Remove counter" title="Remove counter">
        <span class="button-icon icon-delete" aria-hidden="true"></span>
      </button>
    </div>
  `;

  counterRow.querySelector(".counter-multiplier").value = multiplierFromInput(counter.multiplier);
  counterRow.querySelector(".counter-value").value = counter.value;
  counterRow.querySelector(".counter-moderated").value = counter.moderated;
  counterRow.querySelector(".counter-include-input").checked = counter.includeInComparison;
  return counterRow;
}

function refreshCounterLabels(counterRow, name) {
  const labelName = name.trim() || "Untitled counter";
  counterRow
    .querySelector('[data-action="decrement"]')
    ?.setAttribute("aria-label", `Decrease ${labelName}`);
  counterRow
    .querySelector('[data-action="increment"]')
    ?.setAttribute("aria-label", `Increase ${labelName}`);
  counterRow
    .querySelector(".counter-value")
    ?.setAttribute("aria-label", `${labelName} value`);
  counterRow
    .querySelector(".counter-multiplier")
    ?.setAttribute("aria-label", `${labelName} multiplier`);
  counterRow
    .querySelector(".counter-category-select")
    ?.setAttribute("aria-label", `${labelName} merged category`);
  counterRow
    .querySelector(".counter-moderated")
    ?.setAttribute("aria-label", `${labelName} moderated outputs`);
  counterRow
    .querySelector(".counter-include-input")
    ?.setAttribute("aria-label", `${labelName} include in comparison`);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function confirmDelete(label) {
  return window.confirm(`Delete ${label}? This cannot be undone.`);
}

els.newCounterButton.addEventListener("click", () => {
  openNewBlockDialog();
});

els.newGroupButton.addEventListener("click", () => {
  const name = window.prompt("Group name");
  if (!name?.trim()) return;
  createBlockGroup(name.trim());
});

els.previewButton.addEventListener("click", () => {
  renderPreview();
  els.previewDialog.showModal();
});

els.previewAccountSelect.addEventListener("change", () => {
  renderPreview();
});

els.themeToggleButton.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  saveTheme();
  applyTheme();
});

els.filterSelect.addEventListener("change", () => {
  viewOptions = { ...viewOptions, filter: els.filterSelect.value };
  saveViewOptions();
  render();
});

els.sortSelect.addEventListener("change", () => {
  viewOptions = { ...viewOptions, sort: els.sortSelect.value };
  saveViewOptions();
  render();
});

els.cancelDialogButton.addEventListener("click", () => {
  els.counterDialog.close();
});

els.cancelImportButton.addEventListener("click", () => {
  els.importDialog.close();
});

els.importForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!importTargetBlockId) return;

  try {
    const details = parseBlockDetails(els.importDetailsText.value);
    importBlockDetails(importTargetBlockId, details);
    importTargetBlockId = null;
    els.importDialog.close();
  } catch (error) {
    els.importError.textContent = error.message;
  }
});

els.counterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.counterName.value.trim();
  if (!name) {
    els.counterName.focus();
    return;
  }
  createBlock(name, els.counterGroup.value);
  els.counterDialog.close();
});

els.counterList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const blockGroupRow = event.target.closest(".block-group-row");
  if (button && blockGroupRow) {
    const blockGroupId = blockGroupRow.dataset.blockGroupId;
    const blockGroup = blockGroups.find((item) => item.id === blockGroupId);

    if (button.dataset.action === "toggle-block-group" && blockGroup) {
      updateBlockGroup(blockGroupId, { collapsed: !blockGroup.collapsed });
      return;
    }

    if (button.dataset.action === "add-block-to-group") {
      openNewBlockDialog(blockGroupId);
      return;
    }

    if (button.dataset.action === "remove-block-group") {
      if (!blockGroup || !confirmDelete(`group "${blockGroup.name || "Untitled group"}"`)) return;
      removeBlockGroup(blockGroupId);
      return;
    }
  }

  const blockRow = event.target.closest(".block-row");
  const groupRow = event.target.closest(".sub-block");
  const counterRow = event.target.closest(".counter-row");
  if (!button || !blockRow) return;

  const blockId = blockRow.dataset.blockId;
  const groupId = groupRow?.dataset.groupId;
  const counterId = counterRow?.dataset.counterId;
  const block = blocks.find((item) => item.id === blockId);
  const group = block?.groups.find((item) => item.id === groupId);
  const counter = group?.counters.find((item) => item.id === counterId);

  if (button.dataset.action === "copy-details" && block) {
    const details = formatBlockDetails(block);
    copyText(details).then((copied) => {
      showCopyFeedback(button, copied);
      if (!copied) showCopyFallback(details);
    });
  }
  if (button.dataset.action === "import-details" && block) {
    importTargetBlockId = block.id;
    els.importDetailsText.value = "";
    els.importError.textContent = "";
    els.importDialog.showModal();
    els.importDetailsText.focus();
  }
  if (button.dataset.action === "toggle-block" && block) {
    updateBlock(blockId, { collapsed: !block.collapsed });
    return;
  }
  if (button.dataset.action === "add-group") addGroupToBlock(blockId);
  if (button.dataset.action === "remove-block" && block) {
    if (!confirmDelete(`block "${block.name || "Untitled block"}"`)) return;
    removeBlock(blockId);
  }
  if (button.dataset.action === "add-counter" && group) {
    addCounterToGroup(blockId, group.id);
  }
  if (button.dataset.action === "remove-group" && group) {
    if (!confirmDelete(`sub-block "${group.name || "Untitled sub-block"}"`)) return;
    removeGroup(blockId, group.id);
  }
  if (!counter || !group) return;

  if (button.dataset.action === "increment") {
    updateCounter(
      blockId,
      group.id,
      counter.id,
      { value: counter.value + multiplierFromInput(counter.multiplier) },
      true,
      "increase"
    );
  }
  if (button.dataset.action === "decrement") {
    updateCounter(
      blockId,
      group.id,
      counter.id,
      { value: counter.value - multiplierFromInput(counter.multiplier) },
      true,
      "decrease"
    );
  }
  if (button.dataset.action === "remove-counter") {
    if (!confirmDelete(`counter "${counter.name || "Untitled counter"}"`)) return;
    removeCounter(blockId, group.id, counter.id);
  }
  if (button.dataset.action === "clear-counter") {
    updateCounter(blockId, group.id, counter.id, { value: 0 }, true, "decrease");
  }
});

els.counterList.addEventListener("pointerdown", (event) => {
  const blockGroupRow = event.target.closest(".block-group-row");
  const blockGroupHandle = event.target.closest(".block-group-drag-handle");
  if (blockGroupRow && blockGroupHandle && event.button === 0) {
    event.preventDefault();
    draggedItem = {
      type: "blockGroup",
      blockGroupId: blockGroupRow.dataset.blockGroupId,
    };
    pointerDrag = { pointerId: event.pointerId };
    blockGroupRow.classList.add("is-dragging");
    document.body.classList.add("is-reordering");
    event.target.setPointerCapture?.(event.pointerId);
    return;
  }

  const blockRow = event.target.closest(".block-row");
  const groupRow = event.target.closest(".sub-block");
  const counterRow = event.target.closest(".counter-row");
  if (!blockRow || !groupRow || event.button !== 0) return;

  const groupHandle = event.target.closest(".group-drag-handle");
  const counterHandle = event.target.closest(".drag-handle");
  if (!groupHandle && !counterHandle) return;

  event.preventDefault();
  draggedItem = groupHandle
    ? {
        type: "group",
        blockId: blockRow.dataset.blockId,
        groupId: groupRow.dataset.groupId,
      }
    : {
        type: "counter",
        blockId: blockRow.dataset.blockId,
        groupId: groupRow.dataset.groupId,
        counterId: counterRow.dataset.counterId,
      };

  pointerDrag = { pointerId: event.pointerId };
  (groupHandle ? groupRow : counterRow).classList.add("is-dragging");
  document.body.classList.add("is-reordering");
  event.target.setPointerCapture?.(event.pointerId);
});

window.addEventListener("pointermove", (event) => {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
  event.preventDefault();
  showDragTarget(event.clientX, event.clientY);
});

window.addEventListener("pointerup", (event) => {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
  const target = showDragTarget(event.clientX, event.clientY);
  if (target && draggedItem?.type === "blockGroup") {
    moveBlockGroup(draggedItem.blockGroupId, target.targetId, target.placeAfter);
  }
  if (target && draggedItem?.type === "group") {
    moveGroup(draggedItem.blockId, draggedItem.groupId, target.targetId, target.placeAfter);
  }
  if (target && draggedItem?.type === "counter") {
    moveCounter(
      draggedItem.blockId,
      draggedItem.groupId,
      draggedItem.counterId,
      target.targetId,
      target.placeAfter
    );
  }
  endPointerDrag();
});

window.addEventListener("pointercancel", (event) => {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
  endPointerDrag();
});

els.counterList.addEventListener("change", (event) => {
  const blockRow = event.target.closest(".block-row");
  if (!blockRow) return;

  if (event.target.classList.contains("block-group-select")) {
    updateBlock(blockRow.dataset.blockId, { blockGroupId: event.target.value });
    return;
  }

  if (event.target.classList.contains("block-date-input")) {
    updateBlock(blockRow.dataset.blockId, { date: event.target.value }, false);
    return;
  }
  if (event.target.classList.contains("block-time-input")) {
    const timeInputs = blockRow.querySelectorAll(".block-time-input");
    updateBlock(blockRow.dataset.blockId, {
      startTime: timeInputs[0].value,
      endTime: timeInputs[1].value,
    }, false);
    return;
  }
  if (event.target.classList.contains("block-usage-input")) {
    const usageInputs = blockRow.querySelectorAll(".block-usage-input");
    updateBlock(blockRow.dataset.blockId, {
      usageStart: percentFromInput(usageInputs[0].value),
      usageEnd: percentFromInput(usageInputs[1].value),
    }, false);
    return;
  }

  const groupRow = event.target.closest(".sub-block");
  const counterRow = event.target.closest(".counter-row");
  if (event.target.classList.contains("counter-category-select") && groupRow && counterRow) {
    const category = normalizeMergedCategory(event.target.value);
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { name: category, category },
      false
    );
    refreshCounterLabels(counterRow, category);
    return;
  }

  if (event.target.classList.contains("counter-value") && groupRow && counterRow) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { value: numberFromInput(event.target.value) }
    );
    return;
  }

  if (event.target.classList.contains("counter-multiplier") && groupRow && counterRow) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { multiplier: multiplierFromInput(event.target.value) }
    );
    return;
  }

  if (event.target.classList.contains("counter-moderated") && groupRow && counterRow) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { moderated: Math.max(0, numberFromInput(event.target.value)) }
    );
    return;
  }

  if (event.target.classList.contains("counter-include-input") && groupRow && counterRow) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { includeInComparison: event.target.checked },
      false
    );
  }
});

els.counterList.addEventListener("input", (event) => {
  const blockGroupRow = event.target.closest(".block-group-row");
  if (event.target.classList.contains("block-group-name-input") && blockGroupRow) {
    updateBlockGroup(
      blockGroupRow.dataset.blockGroupId,
      { name: event.target.value },
      false
    );
    return;
  }

  const blockRow = event.target.closest(".block-row");
  if (!blockRow) return;

  if (event.target.classList.contains("block-name-input")) {
    updateBlockName(blockRow.dataset.blockId, event.target.value);
    return;
  }

  if (event.target.classList.contains("block-account-input")) {
    updateBlock(
      blockRow.dataset.blockId,
      { accountType: event.target.value },
      false
    );
    return;
  }

  if (event.target.classList.contains("block-date-input")) {
    updateBlock(blockRow.dataset.blockId, { date: event.target.value }, false);
    return;
  }

  if (event.target.classList.contains("block-time-input")) {
    const timeInputs = blockRow.querySelectorAll(".block-time-input");
    updateBlock(
      blockRow.dataset.blockId,
      {
        startTime: timeInputs[0].value,
        endTime: timeInputs[1].value,
      },
      false
    );
    return;
  }
  if (event.target.classList.contains("block-usage-input")) {
    const usageInputs = blockRow.querySelectorAll(".block-usage-input");
    updateBlock(
      blockRow.dataset.blockId,
      {
        usageStart: percentFromInput(usageInputs[0].value),
        usageEnd: percentFromInput(usageInputs[1].value),
      },
      false
    );
    return;
  }

  const groupRow = event.target.closest(".sub-block");
  if (!groupRow) return;

  if (event.target.classList.contains("group-name-input")) {
    updateGroup(blockRow.dataset.blockId, groupRow.dataset.groupId, { name: event.target.value }, false);
    return;
  }

  const counterRow = event.target.closest(".counter-row");
  if (!counterRow) return;

  if (event.target.classList.contains("counter-multiplier")) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { multiplier: multiplierFromInput(event.target.value) },
      false
    );
    return;
  }

  if (event.target.classList.contains("counter-moderated")) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { moderated: Math.max(0, numberFromInput(event.target.value)) },
      false
    );
  }

});

els.counterList.addEventListener("focusout", (event) => {
  const blockGroupRow = event.target.closest(".block-group-row");
  if (event.target.classList.contains("block-group-name-input") && blockGroupRow) {
    updateBlockGroup(blockGroupRow.dataset.blockGroupId, {
      name: event.target.value.trim() || "Untitled group",
    });
    return;
  }

  const blockRow = event.target.closest(".block-row");
  if (!blockRow) return;

  if (event.target.classList.contains("block-name-input")) {
    updateBlock(blockRow.dataset.blockId, {
      name: event.target.value.trim() || "Untitled block",
    });
    return;
  }

  if (event.target.classList.contains("block-account-input")) {
    updateBlock(blockRow.dataset.blockId, {
      accountType: normalizeAccountType(event.target.value),
    });
    return;
  }

  if (event.target.classList.contains("block-date-input")) {
    updateBlock(blockRow.dataset.blockId, { date: event.target.value });
    return;
  }

  if (event.target.classList.contains("block-time-input")) {
    const timeInputs = blockRow.querySelectorAll(".block-time-input");
    updateBlock(blockRow.dataset.blockId, {
      startTime: timeInputs[0].value,
      endTime: timeInputs[1].value,
    });
    return;
  }
  if (event.target.classList.contains("block-usage-input")) {
    const usageInputs = blockRow.querySelectorAll(".block-usage-input");
    updateBlock(blockRow.dataset.blockId, {
      usageStart: percentFromInput(usageInputs[0].value),
      usageEnd: percentFromInput(usageInputs[1].value),
    });
    return;
  }

  const groupRow = event.target.closest(".sub-block");
  if (event.target.classList.contains("group-name-input") && groupRow) {
    updateGroup(blockRow.dataset.blockId, groupRow.dataset.groupId, {
      name: event.target.value.trim() || "Untitled sub-block",
    });
    return;
  }

  const counterRow = event.target.closest(".counter-row");
  if (!groupRow || !counterRow) {
    return;
  }
});

els.counterList.addEventListener("keydown", (event) => {
  const isEditableName =
    event.target.classList.contains("block-group-name-input") ||
    event.target.classList.contains("block-name-input") ||
    event.target.classList.contains("block-account-input") ||
    event.target.classList.contains("group-name-input");
  if (event.key === "Enter" && isEditableName) event.target.blur();
});

applyTheme();
applyViewControls();
render();
