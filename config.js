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
  MIN_CHAT_DELAY: 160000, // 最小聊天延迟(2分40秒)
  MAX_CHAT_DELAY: 200000, // 最大聊天延迟(3分20秒)
  
  // Gemini API调用配置
  GEMINI_REQUEST_TIMEOUT: 30000, // 增加Gemini API超时时间到30秒
  GEMINI_RETRY_COUNT: 2,     // Gemini API调用失败时的重试次数
  GEMINI_RETRY_DELAY: 5000,  // Gemini API调用失败后的重试延迟(5秒)
};
