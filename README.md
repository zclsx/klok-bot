# KlokApp 自动化工具 🚀

一个基于终端的KlokApp AI聊天自动化工具，支持会话令牌认证和强大的重试机制。

---

## ✨ 功能特点

- **🔑 会话令牌认证** - 使用KlokApp会话令牌直接登录
- **📊 交互式仪表盘** - 使用`blessed`和`blessed-contrib`实现美观的终端UI
- **🤖 自动生成问题** - 支持Groq和Gemini API生成随机有趣的提问
- **⏳ 速率限制管理** - 达到限制时自动冷却
- **📌 积分跟踪** - 实时监控推理积分
- **🔄 自动重试** - 处理网络和服务器错误
- **📡 流验证** - 确保消息成功发送
- **🌐 代理支持** - 使用用户提供的代理，默认使用系统IP
- **📜 详细日志** - 全面的监控和调试

---

## 📂 目录结构

```
Klok-BOT/
├── package.json         # 项目依赖
├── session-token.key    # 登录的会话令牌(自动生成)
├── groq-api.key         # Groq API密钥
├── gemini-api.key       # Gemini API密钥
├── proxies.txt          # 代理配置(可选)
├── priv.txt             # 自动认证的私钥
├── info.log             # 监控日志文件
├── main.js              # 主入口点
├── config.js            # 应用配置
└── src/
    ├── api/             # KlokApp API函数
    ├── ui/              # UI组件
    ├── services/        # 外部服务(Groq, Gemini)
    ├── automation.js    # 自动化逻辑
    └── utils/           # 工具函数
```

---

## 🛠️ 安装

### 🔹 Linux/macOS

1. 克隆仓库:
   ```sh
   git clone https://github.com/rpchubs/Klok-BOT.git
   cd Klok-BOT
   ```

2. 安装依赖:
   ```sh
   npm install
   ```

3. 配置**代理**(可选):
   ```sh
   nano proxies.txt
   ```
   格式:
   ```sh
   http://username:password@ip:port
   ```

4. 添加**API密钥**:
   ```sh
   # Groq API密钥
   nano groq-api.key
   
   # Gemini API密钥(可选)
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
   git clone https://github.com/rpchubs/Klok-BOT.git
   cd Klok-BOT
   ```

2. 安装依赖:
   ```powershell
   npm install
   ```

3. 配置**代理**(可选):
   - 打开`proxies.txt`，添加:
     ```
     http://username:password@ip:port
     ```

4. 添加**API密钥**:
   - 在记事本中打开`groq-api.key`并粘贴您的密钥
   - 如需使用Gemini API，创建`gemini-api.key`并添加密钥

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
- **时间间隔**: 为避免触发API速率限制，每个问题间隔约3分钟
- **API服务切换**: 程序会在Groq和Gemini API之间自动切换，降低单一API的负载

---

## 📜 日志和错误处理

- **自动重试** 网络/服务器故障
- **指数退避** 用于速率限制
- **认证回退** 使用私钥
- **会话令牌清理** 如果无效
- **解析错误处理** 支持多种响应格式解析

---

## ⚙️ 高级配置

编辑`config.js`控制自动化行为:

```js
module.exports = {
  THREADS: 10,                   // 并行执行线程
  BASE_URL: "https://api1-pp.klokapp.ai/v1",
  
  // API密钥
  GROQ_API_KEY_PATH: "./groq-api.key",
  GEMINI_API_KEY_PATH: "./gemini-api.key",
  
  // 模型选择
  GROQ_MODEL: "llama3-8b-8192",
  GEMINI_MODEL: "gemini-1.5-flash",
  
  // API使用策略
  API_STRATEGY: {
    GROQ_WEIGHT: 1,            // Groq API权重
    GEMINI_WEIGHT: 1,           // Gemini API权重
    AUTO_SWITCH: true,          // 启用自动切换
    DAILY_LIMITS: {             // 每日请求限制
      GROQ: 1000,
      GEMINI: 1000
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
  
  // API请求配置
  REQUEST_TIMEOUT: 30000,     // API请求超时时间(30秒)
  REQUEST_RETRY_COUNT: 3,     // 请求失败时的重试次数
  REQUEST_RETRY_DELAY: 2000,  // 重试延迟(2秒)
  
  // Gemini API配置
  GEMINI_REQUEST_TIMEOUT: 30000, // Gemini API超时时间(30秒)
  GEMINI_RETRY_COUNT: 2,         // 失败时重试次数
  GEMINI_RETRY_DELAY: 2000,      // 重试延迟(2秒)
```

### 注意:
- 如果遇到API速率限制或CPU限制，降低`THREADS`值
- 修改`MIN_CHAT_DELAY`/`MAX_CHAT_DELAY`以控制聊天频率
- 调整`API_STRATEGY`的权重值可以控制不同API的使用比例

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

3. **API速率限制**:
   - 程序已设置合理的间隔时间(约3分钟)
   - 如果仍然遇到问题，可以在配置文件中增加间隔

---

## 🔗 有用链接 🌍

- [KlokAI](https://klokapp.ai?referral_code=GVJRESB4)
- [Groq控制台](https://console.groq.com/login)
- [Google AI Studio](https://makersuite.google.com/) (Gemini API)



