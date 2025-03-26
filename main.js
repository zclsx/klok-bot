const fs = require("fs");
const path = require("path");
const { authenticateAllWallets } = require("./src/api/signin");
const {
  initDashboard,
  registerKeyHandler,
  render,
  updateStatus,
  widgets,
} = require("./src/ui");
const {
  initAutomation,
  startAutomation,
  pauseAutomation,
  resumeAutomation,
  manualSwitchAccount,
  getRunningState,
} = require("./src/automation");
const { auth } = require("./src/api");
const {
  log,
  logToFile,
  checkLogSize,
  clearLogFile,
  backupLogFile,
} = require("./src/utils");

function readPrivateKeysFromFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`文件 ${absolutePath} 不存在。`);
    return [];
  }
  const data = fs.readFileSync(absolutePath, "utf8");
  return data.split(/\r?\n/).filter(line => line.trim() !== "");
}

function clearSessionTokenFile() {
  const tokenPath = path.join(process.cwd(), "session-token.key");
  fs.writeFileSync(tokenPath, "", "utf8");
  console.log("[信息] session-token.key 已清空。");
}

// 自动启动函数
async function autoStartAutomation() {
  const tokens = auth.readAllSessionTokensFromFile();
  if (tokens.length === 0) {
    log("未找到会话令牌。请添加 session-token.key 文件。", "error");
    updateStatus("缺少 session-token.key 文件", "error");
    render();
    return false;
  }

  log("正在自动启动...", "info");
  logToFile("自动启动");
  startAutomation();
  return true;
}

async function main() {
  try {
    checkLogSize();

    initDashboard();

    clearSessionTokenFile();

    log("欢迎使用 KlokApp 聊天自动化工具", "info");
    log("按 P 暂停, R 恢复, H 获取帮助", "info");
    logToFile("KlokApp 聊天自动化已启动");

    const validTokenCount = await auth.verifyAndCleanupTokens();
    log(`有效令牌数量: ${validTokenCount}`);

    if (validTokenCount === 0) {
      log("未找到有效会话令牌。尝试进行身份验证...", "info");
      updateStatus("正在身份验证...", "info");
      render();

      const privateKeys = readPrivateKeysFromFile("priv.txt");
      if (privateKeys.length === 0) {
        log("在 priv.txt 文件中未找到私钥。", "error");
        updateStatus("priv.txt 文件中缺少私钥", "error");
      } else {
        log(`找到 ${privateKeys.length} 个私钥。正在验证...`, "info");
        await authenticateAllWallets(privateKeys);
        const tokens = auth.readAllSessionTokensFromFile();
        if (tokens.length === 0) {
          log("身份验证失败。未获得有效令牌。", "error");
          updateStatus("身份验证失败", "error");
        } else {
          log(`身份验证成功！${tokens.length} 个账户已准备就绪。`, "success");
          updateStatus(`${tokens.length} 个账户已准备。正在自动启动...`, "success");
          
          // 身份验证后自动启动
          setTimeout(async () => {
            await autoStartAutomation();
          }, 2000);
        }
      }
    } else if (validTokenCount === 1) {
      log("找到一个有效的会话令牌！已准备好登录。", "success");
      updateStatus("会话令牌已准备就绪。正在自动启动...", "success");
      
      // 自动启动
      setTimeout(async () => {
        await autoStartAutomation();
      }, 2000);
    } else {
      log(`找到 ${validTokenCount} 个有效会话令牌！已准备好登录。`, "success");
      updateStatus(`${validTokenCount} 个账户已准备就绪。正在自动启动...`, "success");
      
      // 自动启动
      setTimeout(async () => {
        await autoStartAutomation();
      }, 2000);
    }

    render();

    await initAutomation();

    registerKeyHandler("s", async () => {
      if (!getRunningState()) {
        await autoStartAutomation();
      } else {
        log("自动化已在运行中", "warning");
        logToFile("启动请求被忽略 - 自动化已在运行中");
      }
    });

    registerKeyHandler("p", () => {
      if (getRunningState()) {
        log("正在暂停自动化...", "info");
        logToFile("暂停自动化（用户发起）");
        pauseAutomation();
      } else {
        log("自动化未运行", "warning");
        logToFile("暂停请求被忽略 - 自动化未运行");
      }
    });

    registerKeyHandler("r", () => {
      if (!getRunningState()) {
        log("正在恢复自动化...", "info");
        logToFile("恢复自动化（用户发起）");
        resumeAutomation();
      } else {
        log("自动化已在运行中", "warning");
        logToFile("恢复请求被忽略 - 自动化已在运行中");
      }
    });

    registerKeyHandler("a", async () => {
      const success = await manualSwitchAccount();
      if (success) {
        log("账户切换成功", "success");
      } else {
        log("并发模式下不允许手动切换", "warning");
      }
    });

    registerKeyHandler("l", () => {
      const backupPath = backupLogFile();
      clearLogFile();
      if (backupPath) {
        log(`日志文件已清空并备份到 ${backupPath}`, "success");
        logToFile("日志文件已清空并备份（用户发起）");
      } else {
        log("日志文件已清空", "success");
        logToFile("日志文件已清空（用户发起）");
      }
      render();
    });

    registerKeyHandler("i", () => {
      const fs = require("fs");
      const path = require("path");

      try {
        const logPath = path.join(process.cwd(), "info.log");
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          const lastModified = new Date(stats.mtime).toLocaleString();
          log(`日志文件: 大小=${fileSizeMB}MB, 最后修改时间: ${lastModified}`, "info");
        } else {
          log("日志文件尚未创建", "info");
        }
      } catch (error) {
        log(`读取日志信息错误: ${error.message}`, "error");
      }

      try {
        const tokens = auth.readAllSessionTokensFromFile();
        const tokenInfo = auth.getTokenInfo();
        if (tokens.length === 0) {
          log("未发现账户", "warning");
        } else if (tokens.length === 1) {
          log("已配置1个账户", "info");
        } else {
          log(`已配置${tokens.length}个账户`, "info");
        }
      } catch (error) {
        log(`检查账户错误: ${error.message}`, "error");
      }

      updateStatus("已显示信息", "info");
      setTimeout(() => {
        updateStatus(getRunningState() ? "运行中" : "就绪", getRunningState() ? "success" : "info");
        render();
      }, 5000);
      render();
    });

    registerKeyHandler("h", () => {
      log("控制键:", "info");
      log("S - 开始自动化（需要至少一个会话令牌）", "info");
      log("P - 暂停自动化", "info");
      log("R - 恢复自动化", "info");
      log("A - 切换账户（在并发模式下禁用）", "info");
      log("L - 清空日志文件并备份", "info");
      log("I - 显示文件和账户信息", "info");
      log("H - 显示帮助", "info");
      log("Q 或 Esc - 退出应用", "info");

      updateStatus("帮助 - 按任意键继续", "info");
      render();

      setTimeout(() => {
        updateStatus(getRunningState() ? "运行中" : "就绪", getRunningState() ? "success" : "info");
        render();
      }, 8000);
    });
  } catch (error) {
    log(`应用错误: ${error.message}`, "error");
    logToFile("应用错误", { error: error.message, stack: error.stack });
    updateStatus("错误", "error");
    render();
  }
}

main();
