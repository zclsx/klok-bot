const { generateResponse: generateGroqResponse } = require("./groq");
const { generateResponse: generateGeminiResponse } = require("./gemini");
const { log, logToFile } = require("../utils");
const config = require("../../config");

class ApiManager {
  constructor() {
    this.apiStats = {
      groq: {
        calls: 0,
        lastReset: new Date(),
        errors: 0
      },
      gemini: {
        calls: 0,
        lastReset: new Date(),
        errors: 0
      }
    };
    this.currentApi = null;
  }

  // 重置每日计数器
  resetDailyCounters() {
    const now = new Date();
    if (now.getDate() !== this.apiStats.groq.lastReset.getDate()) {
      this.apiStats.groq.calls = 0;
      this.apiStats.groq.lastReset = now;
    }
    if (now.getDate() !== this.apiStats.gemini.lastReset.getDate()) {
      this.apiStats.gemini.calls = 0;
      this.apiStats.gemini.lastReset = now;
    }
  }

  // 选择下一个要使用的API
  selectNextApi() {
    this.resetDailyCounters();

    // 检查是否达到每日限制
    const groqAvailable = this.apiStats.groq.calls < config.API_STRATEGY.DAILY_LIMITS.GROQ;
    const geminiAvailable = this.apiStats.gemini.calls < config.API_STRATEGY.DAILY_LIMITS.GEMINI;

    if (!groqAvailable && !geminiAvailable) {
      throw new Error("所有API都已达到每日使用限制");
    }

    // 根据权重和可用性选择API
    if (!groqAvailable) {
      return "gemini";
    }
    if (!geminiAvailable) {
      return "groq";
    }

    // 计算当前权重
    const groqWeight = config.API_STRATEGY.GROQ_WEIGHT * (1 - this.apiStats.groq.errors / (this.apiStats.groq.calls + 1));
    const geminiWeight = config.API_STRATEGY.GEMINI_WEIGHT * (1 - this.apiStats.gemini.errors / (this.apiStats.gemini.calls + 1));

    // 根据权重随机选择
    const totalWeight = groqWeight + geminiWeight;
    const random = Math.random() * totalWeight;
    
    return random < groqWeight ? "groq" : "gemini";
  }

  // 生成响应
  async generateResponse(prompt) {
    try {
      const selectedApi = this.selectNextApi();
      this.currentApi = selectedApi;

      let response;
      if (selectedApi === "groq") {
        response = await generateGroqResponse(prompt);
        this.apiStats.groq.calls++;
      } else {
        response = await generateGeminiResponse(prompt);
        this.apiStats.gemini.calls++;
      }

      logToFile(`使用 ${selectedApi.toUpperCase()} API 生成响应`, {
        api: selectedApi,
        calls: this.apiStats[selectedApi].calls,
        errors: this.apiStats[selectedApi].errors
      });

      return response;
    } catch (error) {
      if (this.currentApi) {
        this.apiStats[this.currentApi].errors++;
      }
      throw error;
    }
  }

  // 获取API使用统计
  getStats() {
    return {
      groq: {
        calls: this.apiStats.groq.calls,
        errors: this.apiStats.groq.errors,
        remaining: config.API_STRATEGY.DAILY_LIMITS.GROQ - this.apiStats.groq.calls
      },
      gemini: {
        calls: this.apiStats.gemini.calls,
        errors: this.apiStats.gemini.errors,
        remaining: config.API_STRATEGY.DAILY_LIMITS.GEMINI - this.apiStats.gemini.calls
      }
    };
  }
}

// 创建单例实例
const apiManager = new ApiManager();
module.exports = apiManager; 