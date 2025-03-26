const pLimit = require("p-limit");
const { auth, chat, models, points, rateLimit } = require("./api");
const RateLimiter = require("./api/rate-limit");
const { groq, apiManager } = require("./services");
const { log, logToFile, checkLogSize } = require("./utils");
const config = require("../config");

// 直接使用配置文件中的线程数
const THREADS = config.THREADS || 10;

let isRunning = false;

async function initAutomation() {
  try {
    log("正在初始化服务...", "info");
    logToFile("初始化自动化服务");

    await groq.initGroqClient();

    log("已准备好开始自动化", "success");
    return true;
  } catch (error) {
    log(`初始化错误: ${error.message}`, "error");
    logToFile("初始化错误", { error: error.message, stack: error.stack });
    return false;
  }
}

async function runSingleAutomation(token, idx) {
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  function localLog(message, level = "info") {
    try {
      // 确保消息是字符串类型
      const safeMessage = String(message);
      // 修复token和idx显示格式以避免编码问题
      const tokenPreview = Buffer.from(token.slice(0, 8), 'utf8').toString('utf8');
      log(`[${tokenPreview}] [${idx}] ${safeMessage}`, level);
    } catch (err) {
      // 降级处理：如果出现编码问题，使用简化的日志格式
      log(`[令牌${idx}] ${String(message)}`, level);
    }
  }
  function localLogToFile(message, data = null, verbose = true) {
    try {
      const tokenPreview = Buffer.from(token.slice(0, 8), 'utf8').toString('utf8');
      logToFile(`[${tokenPreview}] [${idx}] ${message}`, data, verbose);
    } catch (err) {
      // 降级处理
      logToFile(`[令牌${idx}] ${message}`, data, verbose);
    }
  }

  try {
    auth.setCurrentToken(token);

    await auth.login(false);

    const limiter = new RateLimiter(token);

    const pts = await points.getUserPoints();
    localLog(`令牌 ${token.slice(0, 8)} => 积分: ${pts.total_points}`, "info");

    const modelList = await models.getModels();
    localLog(`令牌 ${token.slice(0, 8)} => 模型数量: ${modelList.length}`, "info");
    await models.selectDefaultModel();

    chat.createThread();

    localLog(`令牌 ${token.slice(0, 8)} 的自动化已启动`, "info");
    logToFile("令牌的自动化已启动", { tokenPreview: token.slice(0, 8) });

    while (isRunning) {
      checkLogSize();

      // const available = await rateLimit.checkRateLimitAvailability();
      // if (!available) {
      //   const info = await rateLimit.getRateLimit();
      //   if (info.remaining === 0) {
      //     log(`Token ${token.slice(0,8)} => exhausted daily limit => finishing`, "warning");
      //   } else {
      //     log(`Token ${token.slice(0,8)} => partial cooldown => finishing anyway`, "warning");
      //   }
      //   break;
      // } else {
      //   const info = await rateLimit.getRateLimit();
      //   if (info.remaining === 0) {
      //     log(`Token ${token.slice(0,8)} => remain=0 => finishing`, "warning");
      //     break;
      //   }
      // }

      try {
        const newRL = await limiter.getRateLimit();
        if (newRL.remaining === 0) {
          localLog(`令牌 ${token.slice(0, 8)} => 剩余次数=0 => 结束。切换到下一个令牌。`, "warning");
          await auth.switchToNextToken();
          break;
        }
      } catch (rlErr) {
        logToFile(`令牌 ${token.slice(0, 8)} 的速率限制错误`, { error: rlErr.message }, false);
      }

      // 选择API服务并显示在日志中
      const selectedApi = apiManager.selectNextApi();
      const apiName = selectedApi === "groq" ? "Groq" : "Gemini";
      localLog(`令牌 ${token.slice(0, 8)} => 使用 ${apiName} API 生成消息`, "info");
      
      // 生成随机用户消息
      let userMessage;
      try {
        if (selectedApi === "groq") {
          // 从Groq生成随机问题
          userMessage = await groq.generateUserMessage();
        } else {
          // 从Gemini生成随机问题
          const gemini = require("./services/gemini");
          userMessage = await gemini.generateUserMessage();
        }
        
        // 记录生成的问题
        localLog(`令牌 ${token.slice(0, 8)} => 随机问题: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`, "info");
      } catch (msgErr) {
        localLog(`令牌 ${token.slice(0, 8)} => ${apiName} API生成消息错误: ${msgErr.message}`, "error");
        
        // 预设的随机问题备用库
        const fallbackQuestions = [
          "你认为人工智能将如何改变我们的未来生活？",
          "如果可以和历史上任何一位人物共进晚餐，你会选择谁，为什么？",
          "你能分享一个鲜为人知但非常有趣的科学事实吗？",
          "你最喜欢的书籍或电影是什么，它如何影响了你？",
          "你认为人类最伟大的发明是什么？为什么？",
          "如果你有超能力，你会选择什么能力，你会如何使用它？",
          "未来十年，你认为科技会有哪些重大突破？",
          "地球上最神秘的地方是哪里？为什么它令人着迷？",
          "你能解释一个复杂的科学概念，让小学生也能理解吗？",
          "人类与其他动物最大的区别是什么？",
          "如何平衡科技使用和保持真实的人际关系？",
          "你能分享一个改变了你世界观的经历或概念吗？",
          "你认为宇宙中存在其他智慧生命吗？为什么？",
          "如何在日常生活中培养创造力？",
          "你能分享一个鲜为人知的历史事件吗？",
          "如果你可以发明一种新技术，它会是什么样的？",
          "你认为人类最大的潜力和局限性是什么？",
          "什么是你最感兴趣的科学领域，为什么？",
          "如何在信息爆炸的时代保持专注和高效？",
          "你对未来50年的预测是什么？",
          "生活中哪些小习惯对你影响最大？",
          "你认为人类进化的下一步是什么？",
          "如何培养批判性思维？",
          "你认为最被低估的技能是什么？",
          "人类应该移民到其他星球吗？为什么？"
        ];
        userMessage = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        localLog(`令牌 ${token.slice(0, 8)} => 使用备用随机问题: "${userMessage}"`, "info");
      }

      try {
        await chat.sendChatMessage(userMessage);
        consecutiveErrors = 0;
        
        // 记录API使用统计
        const stats = apiManager.getStats();
        logToFile(`${apiName} API 使用统计`, {
          api: selectedApi,
          calls: stats[selectedApi].calls,
          errors: stats[selectedApi].errors,
          remaining: stats[selectedApi].remaining
        }, false);
        
      } catch (chatError) {
        consecutiveErrors++;
        logToFile(
          `令牌 ${token.slice(0, 8)} 的聊天错误 (连续错误: ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`,
          { error: chatError.message },
          false
        );

        if (
          chatError.response &&
          (chatError.response.status === 401 || chatError.response.status === 403)
        ) {
          localLog(`令牌 ${token.slice(0, 8)} => 无效 => 停止`, "warning");
          break;
        }

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          localLog(`令牌 ${token.slice(0, 8)} 的错误过多 => 暂停 1 分钟`, "error");
          await new Promise((r) => setTimeout(r, 60000));
          consecutiveErrors = 0;
        } else {
          await new Promise((r) => setTimeout(r, 5000));
        }
        continue;
      }

      try {
        const updatedPoints = await points.getUserPoints();
        localLog(`令牌 ${token.slice(0, 8)} => 更新后的积分: ${updatedPoints.total_points}`, "info");
      } catch (ptErr) {
        logToFile(`令牌 ${token.slice(0, 8)} 的积分更新错误`, { error: ptErr.message }, false);
      }

      // 使用配置文件中的聊天延迟设置
      const delayRange = config.MAX_CHAT_DELAY - config.MIN_CHAT_DELAY;
      const delay = Math.floor(Math.random() * delayRange) + config.MIN_CHAT_DELAY;
      const delaySeconds = (delay / 1000).toFixed(1);
      localLog(`令牌 ${token.slice(0, 8)} 休眠 ${delaySeconds} 秒...`, "info");
      await new Promise((r) => setTimeout(r, delay));
    }

    localLog(`令牌 ${token.slice(0, 8)} 的自动化已结束`, "info");
  } catch (error) {
    localLog(`令牌 ${token.slice(0, 8)} 的致命错误 => ${error.message}`, "error");
    logToFile("令牌的致命错误", { token: token.slice(0, 8), error: error.message }, false);
  }
}

async function startAutomation() {
  if (isRunning) {
    log("自动化已在运行中", "warning");
    return;
  }
  isRunning = true;
  log("正在启动多令牌并发自动化（无冷却等待）...", "info");
  logToFile("正在启动多令牌并发自动化（无冷却等待）");

  const tokens = auth.readAllSessionTokensFromFile();
  if (!tokens || tokens.length === 0) {
    log("未发现令牌。无法启动自动化。", "error");
    isRunning = false;
    return;
  }

  const limit = pLimit(THREADS);
  tokens.forEach((tk, i) => {
    limit(() => runSingleAutomation(tk, i + 1));
  });

  log(`已排队 ${tokens.length} 个令牌，并发数=${THREADS}`, "info");
}

function pauseAutomation() {
  if (!isRunning) {
    log("自动化未运行", "warning");
    return;
  }
  isRunning = false;
  log("自动化已暂停", "warning");
  logToFile("自动化已暂停");
}

function resumeAutomation() {
  if (isRunning) {
    log("自动化已在运行中", "warning");
    return;
  }
  log("正在恢复自动化...", "info");
  logToFile("恢复自动化");
  startAutomation();
}

function getRunningState() {
  return isRunning;
}

async function manualSwitchAccount() {
  log("在并发模式下不支持手动切换账户", "warning");
  return false;
}

module.exports = {
  initAutomation,
  startAutomation,
  pauseAutomation,
  resumeAutomation,
  manualSwitchAccount,
  getRunningState,
};
