const axios = require("axios");
const { log, logToFile } = require("../utils");
const config = require("../../config");
const { readFile, fileExists } = require("../utils");

let geminiApiKey = null;

function getApiKey() {
  if (geminiApiKey) return geminiApiKey;

  if (fileExists(config.GEMINI_API_KEY_PATH)) {
    geminiApiKey = readFile(config.GEMINI_API_KEY_PATH).trim();
  } else {
    geminiApiKey = process.env.GEMINI_API_KEY;
  }

  if (!geminiApiKey) {
    throw new Error(
      "Gemini API key not found. Please create gemini-api.key file or set GEMINI_API_KEY env variable."
    );
  }

  return geminiApiKey;
}

async function generateResponse(prompt, model = config.GEMINI_MODEL) {
  try {
    const apiKey = getApiKey();
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    log(`正在调用 Gemini API (${model})...`, "info");
    logToFile(`Gemini API 请求`, {
      model,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : "")
    });

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 30000
    });

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const text = response.data.candidates[0].content.parts[0].text;
      
      logToFile("Gemini API response received", {
        model,
        responseLength: text.length,
        responsePreview: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      });

      return text;
    } else {
      throw new Error("未收到有效的Gemini API响应");
    }
  } catch (error) {
    log(`Gemini API 错误: ${error.message}`, "error");
    logToFile("Gemini API error", { 
      error: error.message,
      response: error.response?.data
    });
    throw error;
  }
}

/**
 * 生成随机用户消息
 * @returns {Promise<string>}
 */
async function generateUserMessage() {
  let retryCount = 0;
  const maxRetries = config.GEMINI_RETRY_COUNT || 2;
  
  while (retryCount <= maxRetries) {
    try {
      const apiKey = getApiKey();
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{
          parts: [{ 
            text: "请生成一个随机的、有趣的问题或提示，用于问AI助手。问题要简洁（最多2句话），并且能引发有吸引力的回答。生成的内容必须是中文，而且每次都要不同。只需要直接给出问题，不要有多余的解释。" 
          }]
        }]
      };

      log(`正在使用Gemini生成随机问题...`, "info");

      const response = await axios.post(apiUrl, payload, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: config.GEMINI_REQUEST_TIMEOUT || 30000 // 使用配置文件中的超时设置
      });

      if (response.data && response.data.candidates && response.data.candidates.length > 0) {
        const text = response.data.candidates[0].content.parts[0].text;
        
        // 清理可能的引号或前缀
        const cleanText = text.replace(/^["']|["']$/g, '')
                              .replace(/^(问题|提示)[:：]?\s*/i, '')
                              .trim();
        
        return cleanText || "宇宙中最让你感到惊奇的事物是什么？";
      } else {
        throw new Error("未收到有效的Gemini响应");
      }
    } catch (error) {
      retryCount++;
      
      if (retryCount <= maxRetries) {
        const retryDelay = config.GEMINI_RETRY_DELAY || 5000;
        log(`Gemini API调用失败，${retryDelay/1000}秒后第${retryCount}次重试...`, "warning");
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        log(`Gemini生成随机问题错误(已重试${maxRetries}次): ${error.message}`, "error");
        
        // 预设的随机问题库，如果API调用失败就从这里随机选择一个
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
          "你能分享一个鲜为人知的历史事件吗？"
        ];
        
        return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      }
    }
  }
}

module.exports = {
  generateResponse,
  generateUserMessage
}; 