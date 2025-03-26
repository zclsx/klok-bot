const blessed = require("blessed");
const contrib = require("blessed-contrib");
const { setLogBoxes } = require("../utils/logger") || {};
const widgets = {};


function createWidgets(grid, startRow = 2) {
  widgets.logBox = grid.set(startRow, 0, 10, 6, contrib.log, {
    fg: "green",
    label: "Log",
    tags: true,
    wrap: true,            
    scrollable: true,      
    alwaysScroll: true,   
    scrollbar: { ch: ' ' },
    unicode: true,       // 支持Unicode字符
    style: {
      fg: "white",
      label: { fg: "cyan" }
    }
  });
  

  widgets.chatBox = grid.set(startRow, 6, 10, 6, contrib.log, {
    fg: "white",
    label: "Chat History",
    tags: true,
    wrap: true,         
    scrollable: true,    
    alwaysScroll: true,  
    scrollbar: { ch: ' ' },
    unicode: true,       // 支持Unicode字符
    style: {
      fg: "white",
      label: { fg: "cyan" }
    }
  });

  widgets.statusBox = grid.set(startRow + 10, 0, 2, 12, blessed.box, {
    label: "Status",
    content: "{center}正在初始化...{/center}",
    tags: true,
    border: { type: "line" },
    style: {
      fg: "yellow",
      border: { fg: "white" },
      label: { fg: "cyan" }
    },
    unicode: true        // 支持Unicode字符
  });

  if (typeof setLogBoxes === "function") {
    setLogBoxes(widgets.logBox, widgets.chatBox);
  }

  return widgets;
}

function updatePointsDisplay() {
  // no-op
}

function updateModelsTable() {
  // no-op
}

/**
 * @param {string} status
 * @param {string} type
 */
function updateStatus(status, type = "info") {
  if (!widgets.statusBox) return;

  try {
    // 确保状态消息是字符串类型并正确编码
    const safeStatus = String(status || '');
    
    const colorMap = {
      info: "white",
      success: "green",
      warning: "yellow",
      error: "red",
    };
    const color = colorMap[type] || "white";

    // 使用简洁的方式显示状态，避免过长的文本导致乱码
    let displayStatus = safeStatus;
    if (displayStatus.length > 50) {
      displayStatus = displayStatus.substring(0, 47) + '...';
    }

    const content = `{center}{${color}-fg}${displayStatus}{/${color}-fg}{/center}`;
    widgets.statusBox.setContent(content);
    widgets.statusBox.screen.render();
  } catch (err) {
    // 如果发生错误，尝试使用更简单的状态显示
    console.error('状态更新错误:', err);
    try {
      widgets.statusBox.setContent('{center}[状态显示错误]{/center}');
      widgets.statusBox.screen.render();
    } catch (_) {
      // 忽略
    }
  }
}

function startCooldownDisplay(seconds, onUpdate) {
  updateStatus(`Cooldown: ${seconds}s`, "warning");

  let remaining = seconds;
  const interval = setInterval(() => {
    remaining--;
    updateStatus(`Cooldown: ${remaining}s`, "warning");
    if (onUpdate && typeof onUpdate === "function") {
      onUpdate(remaining);
    }
    if (remaining <= 0) {
      clearInterval(interval);
      updateStatus("Ready", "success");
    }
  }, 1000);

  return interval;
}

module.exports = {
  createWidgets,
  updatePointsDisplay,
  updateModelsTable,
  updateStatus,
  startCooldownDisplay,
  widgets,
};
