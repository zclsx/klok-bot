const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const config = require("../../config");
const { getAuthHeaders, executeWithRetry } = require("./auth");
const { getUserPoints } = require("./points");
const {
  log,
  logChat,
  logToFile,
  logApiRequest,
  logApiResponse,
  logApiError,
} = require("../utils");

const { HttpsProxyAgent } = require("https-proxy-agent");
const { HttpProxyAgent } = require("http-proxy-agent");

const PROXY_FILE = "proxies.txt";

let allProxies = [];
let currentProxyIndex = 0;

function readAllProxiesFromFile() {
  try {
    if (fs.existsSync(PROXY_FILE)) {
      const fileContent = fs.readFileSync(PROXY_FILE, "utf8");
      const proxies = fileContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return proxies;
    }
    return [];
  } catch (err) {
    console.error("Error reading proxies file:", err.message);
    return [];
  }
}

function getCurrentProxy() {
  if (allProxies.length === 0) {
    allProxies = readAllProxiesFromFile();
    currentProxyIndex = 0;
  }
  if (allProxies.length === 0) {
    log("No proxies found, using machine's default IP.");
    return null;
  }
  if (currentProxyIndex >= allProxies.length) {
    currentProxyIndex = 0;
  }
  const proxyUrl = allProxies[currentProxyIndex];
  return proxyUrl;
}

function switchToNextProxy() {
  if (allProxies.length === 0) {
    allProxies = readAllProxiesFromFile();
  }
  if (allProxies.length === 0) {
    log("No proxies available to switch, using machine's default IP.");
    return null;
  }
  currentProxyIndex = (currentProxyIndex + 1) % allProxies.length;
  const proxyUrl = allProxies[currentProxyIndex];
  try {
    const parsedUrl = new URL(proxyUrl);
    log(`Switched to proxy: ${parsedUrl.hostname}`);
  } catch (err) {
    log(`Switched to proxy: ${proxyUrl}`);
  }
  return proxyUrl;
}

function getProxyAgent(targetUrl) {
  const proxyUrl = getCurrentProxy();
  if (!proxyUrl) return null;
  if (targetUrl.startsWith("https")) {
    return new HttpsProxyAgent(proxyUrl);
  } else {
    return new HttpProxyAgent(proxyUrl);
  }
}

let currentThread = null;
let selectedModel = null;

function setSelectedModel(modelName) {
  selectedModel = modelName;
  log(`已选择模型: ${modelName}`, "info");
  logToFile(`Selected model: ${modelName}`);
}

function getSelectedModel() {
  return selectedModel;
}

function createThread() {
  const threadId = crypto.randomUUID();
  currentThread = {
    id: threadId,
    title: "",
    messages: [],
    created_at: new Date().toISOString(),
  };
  log(`已创建新的聊天线程: ${threadId}`, "success");
  logToFile("New chat thread created", {
    threadId: threadId,
    createdAt: currentThread.created_at,
  });
  return currentThread;
}

async function verifyPointIncrease(beforePoints) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const pointData = await getUserPoints();
    const afterPoints = pointData.points.inference;
    const pointIncreased = afterPoints > beforePoints;
    logToFile(
      `Point verification: ${pointIncreased ? "Points increased" : "No change in points"}`,
      {
        before: beforePoints,
        after: afterPoints,
        difference: afterPoints - beforePoints,
      }
    );
    return pointIncreased;
  } catch (error) {
    logToFile(`Error verifying points: ${error.message}`, { error: error.message }, false);
    return false;
  }
}

// 提取响应内容的辅助函数
function extractResponseContent(responseData) {
  // 检查是否为普通JSON对象
  if (typeof responseData === "object" && responseData !== null) {
    if (responseData.content) {
      return responseData.content;
    }
    
    // 检查其他可能的属性
    if (responseData.response && responseData.response.content) {
      return responseData.response.content;
    }
    
    if (responseData.message && responseData.message.content) {
      return responseData.message.content;
    }
    
    if (responseData.assistant && responseData.assistant.message) {
      return responseData.assistant.message;
    }
  }
  
  return null;
}

// 解析事件流的辅助函数
function parseEventStream(data) {
  try {
    const dataLines = data.split("\n");
    for (const line of dataLines) {
      if (line.startsWith("data:")) {
        try {
          const jsonStr = line.substring(5).trim();
          // 跳过心跳消息
          if (jsonStr === "[DONE]" || jsonStr === "") continue;
          
          const eventData = JSON.parse(jsonStr);
          
          // 检查不同的响应格式
          const content = extractResponseContent(eventData);
          if (content) return content;
          
          // 处理特殊情况
          if (eventData.choices && eventData.choices.length > 0) {
            const choice = eventData.choices[0];
            if (choice.text) return choice.text;
            if (choice.message && choice.message.content) return choice.message.content;
            if (choice.delta && choice.delta.content) return choice.delta.content;
          }
        } catch (parseError) {
          logToFile("Error parsing JSON from event stream", {
            error: parseError.message,
            line: line.substring(0, 200)
          }, false);
          continue;
        }
      }
    }
  } catch (error) {
    logToFile("Error splitting event stream", {
      error: error.message
    }, false);
  }
  return null;
}

async function sendChatMessage(content) {
  try {
    if (!selectedModel) {
      throw new Error("未选择模型。请先选择一个模型。");
    }
    if (!currentThread) {
      createThread();
    }
    let beforePoints = 0;
    try {
      const pointData = await getUserPoints();
      beforePoints = pointData.points.inference;
      logToFile(`Points before chat: ${beforePoints}`);
    } catch (pointError) {
      logToFile(`Failed to get points before chat: ${pointError.message}`, { error: pointError.message }, false);
    }
    const userMessage = { role: "user", content };
    currentThread.messages.push(userMessage);
    logChat(content, "user");
    logToFile("Sending chat message", {
      threadId: currentThread.id,
      model: selectedModel,
      messageContent: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
      messageLength: content.length,
    });
    const chatPayload = {
      id: currentThread.id,
      title: currentThread.title || "",
      language: "english",
      messages: currentThread.messages,
      model: selectedModel,
      sources: [],
    };
    log(`正在发送聊天消息到 ${selectedModel}...`, "info");
    let streamAborted = false;
    let aiResponse = "";
    const sendChatRequest = async () => {
      try {
        logApiRequest(
          "POST",
          `${config.BASE_URL}/chat`,
          chatPayload,
          { ...getAuthHeaders(), "Content-Type": "application/json" },
          true
        );
        const agent = getProxyAgent(config.BASE_URL);
        const axiosConfig = {
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          responseType: "text",
          timeout: 30000,
        };
        if (agent) {
          if (config.BASE_URL.startsWith("https")) {
            axiosConfig.httpsAgent = agent;
          } else {
            axiosConfig.httpAgent = agent;
          }
        }
        const response = await axios.post(`${config.BASE_URL}/chat`, chatPayload, axiosConfig);
        logApiResponse(
          "/chat",
          {
            model: selectedModel,
            threadId: currentThread.id,
            responseStatus: response.status,
            responsePreview:
              typeof response.data === "string"
                ? response.data.substring(0, 200) + (response.data.length > 200 ? "..." : "")
                : response.data,
            responseLength: typeof response.data === "string" ? response.data.length : "N/A",
          },
          response.status,
          response.headers,
          true
        );
        return response;
      } catch (error) {
        if (error.message.includes("stream") && error.message.includes("abort")) {
          streamAborted = true;
          logToFile("Stream aborted, will verify with points", { error: error.message });
          return { data: "", status: 200, headers: {} };
        }
        throw error;
      }
    };
    let response;
    try {
      response = await executeWithRetry(sendChatRequest, `Chat to ${selectedModel}`);
    } catch (error) {
      streamAborted = true;
      logToFile(`All retries failed, will verify with points: ${error.message}`, { error: error.message });
      response = { data: "", status: 0, headers: {} };
    }
    if (streamAborted) {
      log("正在通过积分增加验证聊天...", "warning");
      const pointVerified = await verifyPointIncrease(beforePoints);
      if (pointVerified) {
        log("通过积分增加成功验证聊天！", "success");
        aiResponse = "[流式响应被中断，但通过积分增加验证了聊天]";
      } else {
        throw new Error("聊天失败：流式响应被中断且未检测到积分增加");
      }
    } else {
      // 记录原始响应信息用于调试
      logToFile("接收到原始响应", {
        responseType: typeof response.data,
        isString: typeof response.data === 'string',
        responseLength: typeof response.data === 'string' ? response.data.length : 'N/A',
        contentType: response.headers['content-type'],
        statusCode: response.status
      }, true);
      
      // 判断响应类型
      if (typeof response.data === 'string') {
        // 保存第一个响应示例用于分析
        const samplePath = path.join(process.cwd(), "response-sample.txt");
        if (!fs.existsSync(samplePath)) {
          try {
            fs.writeFileSync(samplePath, response.data, 'utf8');
            logToFile("已保存响应示例用于分析", { path: samplePath }, true);
          } catch (error) {
            logToFile("保存响应示例失败", { error: error.message }, false);
          }
        }
        
        // 特殊情况：如果是大型响应，尝试直接从文本中提取内容
        if (response.data.length > 1000) {
          // 尝试基于常见模式提取内容
          // 1. 尝试匹配 "content":"文本内容" 模式
          const contentMatch = response.data.match(/"content"\s*:\s*"([^"]+)"/);
          if (contentMatch && contentMatch[1]) {
            aiResponse = contentMatch[1];
            logToFile("通过正则表达式从大型响应中提取内容", { method: "contentRegex" }, true);
          } 
          // 2. 尝试查找特定的标记
          else if (response.data.includes("assistant:") || response.data.includes("assistant response:")) {
            const assistantIndex = Math.max(
              response.data.indexOf("assistant:"), 
              response.data.indexOf("assistant response:")
            );
            if (assistantIndex > 0) {
              // 尝试提取助手响应部分
              const textAfter = response.data.substring(assistantIndex);
              const endIndex = textAfter.indexOf('"}') > 0 ? textAfter.indexOf('"}') : textAfter.indexOf('\n');
              if (endIndex > 0) {
                aiResponse = textAfter.substring(0, endIndex).replace(/^assistant:/, '').replace(/^assistant response:/, '').trim();
                logToFile("通过助手标记从大型响应中提取内容", { method: "assistantMarker" }, true);
              }
            }
          }
        }
        
        // 解析流式响应
        if (!aiResponse && response.data.includes('data:')) {
          logToFile("检测到流式响应格式", null, true);
          try {
            const dataLines = response.data.split('\n');
            let latestContent = '';
            
            for (const line of dataLines) {
              if (line.startsWith('data:')) {
                const jsonStr = line.substring(5).trim();
                // 跳过特殊标记
                if (jsonStr === '[DONE]' || jsonStr === '') continue;
                
                try {
                  const eventData = JSON.parse(jsonStr);
                  
                  // 尝试多种格式提取
                  if (eventData.content) {
                    latestContent = eventData.content;
                  } else if (eventData.choices && eventData.choices.length > 0) {
                    const choice = eventData.choices[0];
                    if (choice.text) {
                      latestContent = choice.text;
                    } else if (choice.message && choice.message.content) {
                      latestContent = choice.message.content;
                    } else if (choice.delta && choice.delta.content) {
                      latestContent += choice.delta.content;
                    }
                  } else if (eventData.message) {
                    latestContent = typeof eventData.message === 'string' 
                      ? eventData.message 
                      : eventData.message.content || '';
                  }
                } catch (parseError) {
                  // 记录但继续处理
                  logToFile("解析流式JSON行失败", { 
                    error: parseError.message,
                    line: line.substring(0, 100)
                  }, false);
                }
              }
            }
            
            if (latestContent) {
              aiResponse = latestContent;
              logToFile("从流式响应中提取内容成功", { method: "streamParsing" }, true);
            }
          } catch (error) {
            logToFile("解析流式响应失败", { error: error.message }, false);
          }
        }
        
        // 检查响应是否为JSON格式
        if (!aiResponse && (response.data.trim().startsWith("{") || response.data.trim().startsWith("["))) {
          try {
            const jsonData = JSON.parse(response.data);
            logToFile("成功将响应解析为JSON", { type: "fullJson" }, true);
            
            // 尝试不同的属性路径
            if (jsonData.content) {
              aiResponse = jsonData.content;
            } else if (jsonData.choices && jsonData.choices.length > 0) {
              const choice = jsonData.choices[0];
              if (choice.message && choice.message.content) {
                aiResponse = choice.message.content;
              } else if (choice.text) {
                aiResponse = choice.text;
              }
            } else if (jsonData.assistant && jsonData.assistant.message) {
              aiResponse = jsonData.assistant.message;
            } else if (jsonData.response) {
              aiResponse = typeof jsonData.response === 'string' 
                ? jsonData.response 
                : jsonData.response.content || '';
            } else if (jsonData.messages && jsonData.messages.length > 0) {
              // 查找助手消息
              for (const msg of jsonData.messages) {
                if (msg.role === 'assistant' && msg.content) {
                  aiResponse = msg.content;
                  break;
                }
              }
            }
          } catch (jsonError) {
            logToFile("解析整个响应为JSON失败", { 
              error: jsonError.message,
              preview: response.data.substring(0, 200)
            }, false);
          }
        }
        
        // 如果没有从JSON中提取内容，尝试解析事件流
        if (!aiResponse) {
          const parsedContent = parseEventStream(response.data);
          if (parsedContent) {
            aiResponse = parsedContent;
            logToFile("使用parseEventStream成功解析内容", null, true);
          }
        }
        
        // 如果所有方法都失败了，但有响应
        if (!aiResponse && response.data.length > 0) {
          // 使用自定义消息
          aiResponse = "已收到响应但解析失败。这不影响积分获取，但我们正在改进解析逻辑。";
          // 记录原始响应的前1000个字符用于进一步分析
          logToFile("所有解析方法失败，原始响应前1000字符", {
            preview: response.data.substring(0, 1000)
          }, true);
        }
      } else if (typeof response.data === 'object' && response.data !== null) {
        // 响应已经是解析好的对象
        logToFile("响应已经是对象格式", { type: "objectResponse" }, true);
        
        // 使用提取响应内容的辅助函数
        const content = extractResponseContent(response.data);
        if (content) {
          aiResponse = content;
        } else {
          logToFile("无法从对象响应中提取内容", {
            keys: Object.keys(response.data)
          }, true);
          aiResponse = "收到对象响应但无法提取内容";
        }
      }
      
      if (!aiResponse) {
        aiResponse = "未收到AI回复内容。这可能是暂时的问题，但积分应已成功获取。";
      }
    }
    
    currentThread.messages.push({ role: "assistant", content: aiResponse });
    logChat(aiResponse, "assistant");
    logToFile("Received AI response", {
      threadId: currentThread.id,
      model: selectedModel,
      responsePreview: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? "..." : ""),
      responseLength: aiResponse.length,
      streamAborted: streamAborted,
    });
    return aiResponse;
  } catch (error) {
    const errorMsg = `发送聊天消息时出错: ${error.message}`;
    log(errorMsg, "error");
    logApiError("/chat", error);
    throw error;
  }
}

function getCurrentThread() {
  return currentThread;
}

module.exports = {
  createThread,
  sendChatMessage,
  setSelectedModel,
  getSelectedModel,
  getCurrentThread,
};
