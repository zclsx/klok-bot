module.exports = {
  THREADS: 10,
  BASE_URL: "https://api1-pp.klokapp.ai/v1",

  // API Keys
  GROQ_API_KEY_PATH: "./groq-api.key",
  GEMINI_API_KEY_PATH: "./gemini-api.key",

  // Models
  GROQ_MODEL: "llama3-8b-8192",
  GEMINI_MODEL: "gemini-1.5-flash",

  // API Usage Strategy
  API_STRATEGY: {
    // 每个API的权重，权重越大使用频率越高
    GROQ_WEIGHT: 1,
    GEMINI_WEIGHT: 1,
    // 是否启用自动切换
    AUTO_SWITCH: true,
    // 每个API的每日请求限制
    DAILY_LIMITS: {
      GROQ: 1000,
      GEMINI: 1000
    }
  },

  DEFAULT_HEADERS: {
    "content-type": "application/json",
    Origin: "https://klokapp.ai",
    Referer: "https://klokapp.ai/"
  },

  REFERRAL_CODE: {
    referral_code: "69NRRGJ"
  },

  // 请求间隔配置
  MIN_CHAT_DELAY: 5000,      // 最小聊天延迟(5秒)
  MAX_CHAT_DELAY: 10000,     // 最大聊天延迟(10秒)
  
  // API请求配置
  REQUEST_TIMEOUT: 30000,     // API请求超时时间(30秒)
  REQUEST_RETRY_COUNT: 3,     // 请求失败时的重试次数
  REQUEST_RETRY_DELAY: 2000,  // 重试延迟(2秒)
  
  // Gemini API配置
  GEMINI_REQUEST_TIMEOUT: 30000, // Gemini API超时时间(30秒)
  GEMINI_RETRY_COUNT: 2,         // 失败时重试次数
  GEMINI_RETRY_DELAY: 2000,      // 重试延迟(2秒)
};
