module.exports = {
  THREADS: 10,
  BASE_URL: "https://api1-pp.klokapp.ai/v1",

  // API Keys
  GROQ_API_KEY_PATH: "./groq-api.key",  // 保留路径但不使用
  GEMINI_API_KEY_PATH: "./gemini-api.key",

  // Models
  GROQ_MODEL: "llama-3.1-8b",  // 保留但不使用
  GEMINI_MODEL: "gemini-1.5-pro",  // 使用测试成功的模型

  // API Usage Strategy
  API_STRATEGY: {
    // 每个API的权重，权重越大使用频率越高
    GROQ_WEIGHT: 0,  // 完全禁用Groq API
    GEMINI_WEIGHT: 100,  // 只使用Gemini API
    // 是否启用自动切换
    AUTO_SWITCH: false, // 禁用API切换
    // 每个API的每日请求限制
    DAILY_LIMITS: {
      GROQ: 0,  // 禁用Groq API
      GEMINI: Number.MAX_SAFE_INTEGER  // 移除Gemini API限制
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

  // 使用预设问题库 - 作为备用方案
  USE_PREDEFINED_QUESTIONS: true, // 当API不可用时使用预设问题库
  
  // 网络请求方式配置
  // 接口转发设置
  USE_API_FORWARDING: false,  // 禁用接口转发
  API_FORWARDING_BASE_PATH: "https://jiushi21.win/v1",
  
  // 代理设置 (必需)
  USE_PROXY: true,  // 启用代理（测试成功）
  PROXY_URL: 'http://127.0.0.1:7890', // 代理服务器地址
};
