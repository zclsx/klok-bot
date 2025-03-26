# KlokApp 自动化工具 🚀
项目官网：https://klokapp.ai?referral_code=69NRRGJN

一个基于终端的KlokApp AI聊天自动化工具，支持会话令牌认证和强大的重试机制。

这里声明下：是更改了：RPCHubs 这位Github博主的。

---

## ✨ 功能特点

- **🔑 会话令牌认证** - 使用KlokApp会话令牌直接登录
- **📊 交互式仪表盘** - 使用`blessed`和`blessed-contrib`实现美观的终端UI
- **🤖 自动生成问题** - 使用Gemini API生成随机有趣的提问
- **⏳ 速率限制管理** - 达到限制时自动冷却
- **📌 积分跟踪** - 实时监控推理积分
- **🔄 自动重试** - 处理网络和服务器错误
- **📡 流验证** - 确保消息成功发送
- **🌐 代理支持** - 必须使用本地代理服务器访问Gemini API
- **📜 详细日志** - 全面的监控和调试

---

## 📂 目录结构

```
Klok-BOT/
├── package.json         # 项目依赖
├── session-token.key    # 登录的会话令牌(自动生成)
├── gemini-api.key       # Gemini API密钥
├── proxies.txt          # 代理配置(可选)
├── priv.txt             # 自动认证的私钥
├── info.log             # 监控日志文件
├── main.js              # 主入口点
├── config.js            # 应用配置
└── src/
    ├── api/             # KlokApp API函数
    ├── ui/              # UI组件
    ├── services/        # 外部服务(Gemini)
    ├── automation.js    # 自动化逻辑
    └── utils/           # 工具函数
```

---

## 🛠️ 安装

### 🔹 Linux/macOS

1. 克隆仓库:
   ```sh
   git clone https://github.com/zclsx/klok-bot.git
   cd Klok-BOT
   ```

2. 安装依赖:
   ```sh
   npm install
   ```

3. 配置**本地代理**(必需):
   - 确保本地有代理服务(如Clash、V2Ray等)运行在`127.0.0.1:7890`
   - 或修改`config.js`中的`PROXY_URL`配置

4. 添加**Gemini API密钥**:
   ```sh
   # Gemini API密钥(必需)
   nano gemini-api.key
   ```

5. (可选)添加**私钥**用于自动登录:
   ```sh
   nano priv.txt
   ```
   - 每行包含一个私钥
   - 用于在启动时自动生成`session-token.key`

6. 运行应用:
   ```sh
   npm start
   ```

### 🔹 Windows

1. 打开**PowerShell**并运行:
   ```powershell
   git clone https://github.com/zclsx/klok-bot.git
   cd Klok-BOT
   ```

2. 安装依赖:
   ```powershell
   npm install
   ```

3. 配置**本地代理**(必需):
   - 确保本地有代理服务(如Clash、V2Ray等)运行在`127.0.0.1:7890`
   - 或修改`config.js`中的`PROXY_URL`配置

4. 添加**Gemini API密钥**:
   - 在记事本中打开`gemini-api.key`并粘贴您的密钥

5. (可选)在`priv.txt`中添加**私钥**

6. 启动应用:
   ```powershell
   npm start
   ```

---

## 🌛 运行自动化

启动应用:
```sh
npm start
```

## 💡 使用建议

- **多账户管理**: 程序支持同时运行多个账户，默认并发数为10
- **随机问题**: 每个账户会提出不同的随机问题，模拟真实用户行为
- **时间间隔**: 为避免触发API速率限制，每个问题间隔约5-10秒(可在配置文件中调整)
- **代理必需**: 由于网络限制，必须使用本地代理访问Gemini API

---

## 📜 日志和错误处理

- **自动重试** 网络/服务器故障
- **指数退避** 用于速率限制
- **认证回退** 使用私钥
- **会话令牌清理** 如果无效
- **解析错误处理** 支持多种响应格式解析
- **预设问题库** 当API请求失败时使用

---

## ⚙️ 高级配置

编辑`config.js`控制自动化行为:

```js
module.exports = {
  THREADS: 10,                   // 并行执行线程
  BASE_URL: "https://api1-pp.klokapp.ai/v1",
  
  // API密钥
  GEMINI_API_KEY_PATH: "./gemini-api.key",
  
  // 模型选择
  GEMINI_MODEL: "gemini-1.5-pro",  // 使用经过测试的可用模型
  
  // API使用策略
  API_STRATEGY: {
    GROQ_WEIGHT: 0,            // 禁用Groq API
    GEMINI_WEIGHT: 100,          // 只使用Gemini API
    AUTO_SWITCH: false,          // 禁用自动切换
    DAILY_LIMITS: {             // 每日请求限制
      GROQ: 0,
      GEMINI: Number.MAX_SAFE_INTEGER  // 无限制
    }
  },
  
  // 请求头
  DEFAULT_HEADERS: {
    "content-type": "application/json",
    Origin: "https://klokapp.ai",
    Referer: "https://klokapp.ai/"
  },
  
  // 推荐码
  REFERRAL_CODE: {
    referral_code: "69NRRGJ"
  },
  
  // 请求间隔配置
  MIN_CHAT_DELAY: 5000,      // 最小聊天延迟(5秒)
  MAX_CHAT_DELAY: 10000,     // 最大聊天延迟(10秒)
  
  // Gemini API配置
  GEMINI_REQUEST_TIMEOUT: 30000, // Gemini API超时时间(30秒)
  GEMINI_RETRY_COUNT: 2,         // 失败时重试次数
  GEMINI_RETRY_DELAY: 2000,      // 重试延迟(2秒)
  
  // 使用预设问题库
  USE_PREDEFINED_QUESTIONS: true, // 当API不可用时使用预设问题库
  
  // 代理设置 (必需)
  USE_PROXY: true,              // 启用代理(必需)
  PROXY_URL: 'http://127.0.0.1:7890', // 代理服务器地址
};
```

### 注意:
- 如果遇到API速率限制或CPU限制，降低`THREADS`值
- 修改`MIN_CHAT_DELAY`/`MAX_CHAT_DELAY`以控制聊天频率
- 确保本地代理服务正常运行，否则将无法连接到Gemini API

---

## 🔑 会话令牌自动生成

如果启动时未找到`session-token.key`:

- 应用将尝试使用`priv.txt`中的私钥进行认证
- 成功后，将自动生成新的`session-token.key`
- 每次启动时重置文件以确保认证是最新的

确保`priv.txt`中包含有效的私钥以启用此功能。

---

## 🚧 常见问题解决

1. **"已收到响应但解析失败"错误**:
   - 这不影响积分获取，只是无法显示AI回复
   - 程序会继续正常运行

2. **"Gemini生成随机问题错误"**:
   - 程序会从预设问题库中随机选择一个问题
   - 会自动重试，无需手动干预

3. **无法连接到Gemini API**:
   - 检查本地代理服务是否正常运行
   - 确认`config.js`中`PROXY_URL`配置是否正确
   - 尝试在浏览器中访问任何被屏蔽的网站，验证代理是否生效

4. **API密钥错误**:
   - 确保`gemini-api.key`文件中的API密钥正确无误
   - 到[Google AI Studio](https://makersuite.google.com/)重新获取API密钥

---

## 🔗 有用链接 🌍

- [KlokAI](https://klokapp.ai?referral_code=GVJRESB4)
- [Google AI Studio](https://makersuite.google.com/) (获取Gemini API密钥)



