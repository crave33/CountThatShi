const storageKey = "count-that-shi-counters";
const blockGroupStorageKey = "count-that-shi-block-groups";
const themeStorageKey = "count-that-shi-theme";
const viewStorageKey = "count-that-shi-view";
const defaultBlockGroupId = "default";

const els = {
  newCounterButton: document.querySelector("#newCounterButton"),
  newGroupButton: document.querySelector("#newGroupButton"),
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
    blockGroupId: item.blockGroupId || defaultBlockGroupId,
    date: item.date || "",
    startTime: item.startTime || "",
    endTime: item.endTime || "",
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
  return {
    id: counter.id || crypto.randomUUID(),
    name: counter.name || "Untitled counter",
    value: numberFromInput(counter.value),
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
  return {
    id: crypto.randomUUID(),
    name,
    value: 0,
    multiplier: 1,
  };
}

function saveBlocks() {
  localStorage.setItem(storageKey, JSON.stringify(blocks));
}

function saveBlockGroups() {
  localStorage.setItem(blockGroupStorageKey, JSON.stringify(blockGroups));
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
    blockGroupId: targetGroupId,
    date: "",
    startTime: "",
    endTime: "",
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
      ".counter-row.is-drag-over, .sub-block.is-drag-over, .is-drop-after"
    )
    .forEach((row) => {
      row.classList.remove("is-drag-over", "is-drop-after");
    });
}

function getDragTargetFromPoint(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  if (!element || !draggedItem) return null;

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

function multiplierFromInput(value) {
  const parsed = numberFromInput(value);
  return parsed > 0 ? parsed : 1;
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
    `Date: ${block.date || "Not set"}`,
    `Time: ${formatTimeRange(block)}`,
    "",
    "Sub-blocks:",
  ];

  block.groups.forEach((group, groupIndex) => {
    lines.push(`  ${indexToLetters(groupIndex)}. ${group.name || "Untitled sub-block"}`);
    group.counters.forEach((counter, counterIndex) => {
      lines.push(
        `     ${counterIndex + 1}. ${counter.name || "Untitled counter"}: ${counter.value}`
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

  lines.slice(subBlockIndex + 1).forEach((line) => {
    const groupMatch = line.match(/^\s*[A-Z]+[.)-]\s+(.+)$/i);
    const counterMatch = line.match(/^\s+\d+\.\s+(.+):\s*(-?\d+)\s*$/);

    if (counterMatch && currentGroup) {
      currentGroup.counters.push({
        id: crypto.randomUUID(),
        name: counterMatch[1].trim() || "Untitled counter",
        value: numberFromInput(counterMatch[2]),
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
      <button class="ghost-button icon-button" type="button" data-action="toggle-block-group" aria-label="${group.collapsed ? "Expand group" : "Minimize group"}" title="${group.collapsed ? "Expand group" : "Minimize group"}">
        <span class="button-icon ${group.collapsed ? "icon-expand" : "icon-collapse"}" aria-hidden="true"></span>
      </button>
      <input class="block-group-name-input" type="text" aria-label="Group name">
      <span class="block-group-count">${groupBlocks.length} ${groupBlocks.length === 1 ? "block" : "blocks"}</span>
      <button class="ghost-button" type="button" data-action="add-block-to-group">Add block</button>
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
        <input class="block-name-input" type="text" aria-label="Block name">
        <select class="block-group-select" aria-label="Block group"></select>
        <input class="block-date-input" type="date" aria-label="Block date">
        <div class="block-time-range">
          <input class="block-time-input" type="time" step="60" aria-label="From time">
          <input class="block-time-input" type="time" step="60" aria-label="To time">
        </div>
        <div class="block-actions">
          <button class="ghost-button icon-button" type="button" data-action="toggle-block" aria-label="${block.collapsed ? "Expand block" : "Minimize block"}" title="${block.collapsed ? "Expand block" : "Minimize block"}">
            <span class="button-icon ${block.collapsed ? "icon-expand" : "icon-collapse"}" aria-hidden="true"></span>
          </button>
          <button class="ghost-button" type="button" data-action="add-group">Add sub-block</button>
          <button class="ghost-button copy-button" type="button" data-action="copy-details">Export</button>
          <button class="ghost-button" type="button" data-action="import-details">Import</button>
          <button class="remove-button icon-button" type="button" data-action="remove-block" aria-label="Remove block" title="Remove block">
            <span class="button-icon icon-delete" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="block-counter-list"></div>
    `;

  blockRow.querySelector(".block-name-input").value = block.name;
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
        <button class="ghost-button" type="button" data-action="add-counter">Add counter</button>
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
    <input class="counter-name-input" type="text" aria-label="Counter name">
    <div class="counter-main">
      <input class="counter-multiplier" type="number" min="1" step="1" inputmode="numeric" placeholder="x" aria-label="${escapeAttribute(counter.name)} multiplier">
      <div class="counter-controls">
        <button class="counter-button" type="button" data-action="decrement" aria-label="Decrease ${escapeAttribute(counter.name)}">-</button>
        <button class="counter-button" type="button" data-action="increment" aria-label="Increase ${escapeAttribute(counter.name)}">+</button>
      </div>
      <input class="counter-value${feedbackType ? ` is-${feedbackType}` : ""}" type="number" inputmode="numeric" aria-label="${escapeAttribute(counter.name)} value">
    </div>
    <div class="counter-actions">
      <button class="ghost-button icon-button" type="button" data-action="clear-counter" aria-label="Clear counter" title="Clear counter">
        <span class="button-icon icon-refresh" aria-hidden="true"></span>
      </button>
      <button class="subtle-remove-button icon-button" type="button" data-action="remove-counter" aria-label="Remove counter" title="Remove counter">
        <span class="button-icon icon-delete" aria-hidden="true"></span>
      </button>
    </div>
  `;

  counterRow.querySelector(".counter-name-input").value = counter.name;
  counterRow.querySelector(".counter-multiplier").value = multiplierFromInput(counter.multiplier);
  counterRow.querySelector(".counter-value").value = counter.value;
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

  const groupRow = event.target.closest(".sub-block");
  const counterRow = event.target.closest(".counter-row");
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

  const groupRow = event.target.closest(".sub-block");
  if (!groupRow) return;

  if (event.target.classList.contains("group-name-input")) {
    updateGroup(blockRow.dataset.blockId, groupRow.dataset.groupId, { name: event.target.value }, false);
    return;
  }

  const counterRow = event.target.closest(".counter-row");
  if (!counterRow) return;

  if (event.target.classList.contains("counter-name-input")) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { name: event.target.value },
      false
    );
    refreshCounterLabels(counterRow, event.target.value);
    return;
  }

  if (event.target.classList.contains("counter-multiplier")) {
    updateCounter(
      blockRow.dataset.blockId,
      groupRow.dataset.groupId,
      counterRow.dataset.counterId,
      { multiplier: multiplierFromInput(event.target.value) },
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

  const groupRow = event.target.closest(".sub-block");
  if (event.target.classList.contains("group-name-input") && groupRow) {
    updateGroup(blockRow.dataset.blockId, groupRow.dataset.groupId, {
      name: event.target.value.trim() || "Untitled sub-block",
    });
    return;
  }

  const counterRow = event.target.closest(".counter-row");
  if (!groupRow || !counterRow || !event.target.classList.contains("counter-name-input")) {
    return;
  }
  updateCounter(blockRow.dataset.blockId, groupRow.dataset.groupId, counterRow.dataset.counterId, {
    name: event.target.value.trim() || "Untitled counter",
  });
});

els.counterList.addEventListener("keydown", (event) => {
  const isEditableName =
    event.target.classList.contains("block-group-name-input") ||
    event.target.classList.contains("block-name-input") ||
    event.target.classList.contains("group-name-input") ||
    event.target.classList.contains("counter-name-input");
  if (event.key === "Enter" && isEditableName) event.target.blur();
});

applyTheme();
applyViewControls();
render();
