let logBox = null;
let chatBox = null;

/**
 * @param {Object} log
 * @param {Object} chat
 */
function setLogBoxes(log, chat) {
  logBox = log;
  chatBox = chat;
}

/**
 * @param {string} message
 * @param {string} type
 */
function log(message, type = "info") {
  if (!logBox) return;

  try {
    // 确保消息是字符串类型
    const safeMessage = String(message);
    
    // 增强的颜色映射
    const colorMap = {
      info: "white",
      success: "green",
      warning: "yellow",
      error: "red",
    };

    // 添加表情符号前缀
    const iconMap = {
      info: "ℹ️ ",
      success: "✅ ",
      warning: "⚠️ ",
      error: "❌ ",
    };

    // 获取当前时间
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const color = colorMap[type] || colorMap.info;
    const icon = iconMap[type] || "";
    
    // 格式化日志消息，确保正确使用UTF-8编码
    const formattedMessage = `{white-fg}[${timeStr}]{/white-fg} {${color}-fg}${icon}${safeMessage}{/${color}-fg}`;
    
    // 使用blessed的log方法显示日志
    logBox.log(formattedMessage);
  } catch (err) {
    // 如果出现格式化错误，尝试简化显示
    console.error('日志格式化错误:', err);
    try {
      logBox.log(`[错误] 日志显示失败: ${String(message).substring(0, 20)}...`);
    } catch (_) {
      // 最后的降级处理
    }
  }
}

/**
 * @param {string} message
 * @param {string} role
 */
function logChat(message, role) {
  if (!chatBox) return;

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 更新颜色和图标
  const color = role === "user" ? "cyan" : "green";
  const prefix = role === "user" ? "👤 " : "🤖 ";
  
  // 限制消息长度
  const maxLength = 100;
  const displayMessage =
    message.length > maxLength
      ? `${message.substring(0, maxLength)}...`
      : message;

  // 格式化聊天消息
  chatBox.log(`{white-fg}[${timeStr}]{/white-fg} {${color}-fg}${prefix}${displayMessage}{/${color}-fg}`);
}

module.exports = {
  setLogBoxes,
  log,
  logChat,
};
