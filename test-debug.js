const axios = require('axios');
const fs = require('fs');
const config = require('./config');

// 从session-token.key文件读取会话令牌
function readSessionToken() {
  try {
    const data = fs.readFileSync('./session-token.key', 'utf8');
    return data.trim().split('\n')[0]; // 读取第一个令牌
  } catch (error) {
    console.error('读取令牌出错:', error.message);
    return null;
  }
}

// 发送聊天请求并记录完整响应
async function testChat() {
  const sessionToken = readSessionToken();
  if (!sessionToken) {
    console.error('未找到有效的会话令牌');
    return;
  }

  try {
    console.log('正在发送测试聊天请求...');
    
    // 创建一个新的聊天线程
    const threadId = Math.random().toString(36).substring(2, 15);
    
    // 准备聊天请求
    const chatPayload = {
      id: threadId,
      title: "",
      language: "english",
      messages: [{ role: "user", content: "Tell me a fun fact about space" }],
      model: "llama-3.3-70b-instruct",
      sources: [],
    };
    
    // 设置请求头
    const headers = {
      "content-type": "application/json",
      "Origin": "https://klokapp.ai",
      "Referer": "https://klokapp.ai/",
      "X-Session-Token": sessionToken
    };
    
    // 发送请求
    const response = await axios.post(`${config.BASE_URL}/chat`, chatPayload, {
      headers,
      responseType: 'text',
      timeout: 60000
    });
    
    // 记录原始响应
    console.log('响应状态码:', response.status);
    console.log('响应头:', JSON.stringify(response.headers, null, 2));
    
    // 保存原始响应数据
    fs.writeFileSync('api-response.txt', response.data);
    console.log('原始响应已保存到 api-response.txt 文件');
    
    // 尝试解析为JSON
    try {
      if (typeof response.data === 'string') {
        console.log('响应类型: 字符串');
        console.log('响应长度:', response.data.length);
        console.log('响应预览 (前200字符):', response.data.substring(0, 200));
        
        if (response.data.includes('data:')) {
          console.log('\n发现流式响应格式，尝试解析...');
          const lines = response.data.split('\n');
          let foundValidJson = false;
          
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonStr = line.substring(5).trim();
              if (jsonStr === '[DONE]' || jsonStr === '') continue;
              
              try {
                const parsedJson = JSON.parse(jsonStr);
                console.log('找到有效JSON:', JSON.stringify(parsedJson, null, 2));
                foundValidJson = true;
                break;
              } catch (error) {
                console.log('无法解析JSON:', jsonStr);
              }
            }
          }
          
          if (!foundValidJson) {
            console.log('未找到有效的JSON数据');
          }
        } else if (response.data.startsWith('{') || response.data.startsWith('[')) {
          console.log('\n尝试解析整个响应为JSON...');
          const parsedData = JSON.parse(response.data);
          console.log('解析成功:', JSON.stringify(parsedData, null, 2));
        }
      } else {
        console.log('响应类型:', typeof response.data);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
      }
    } catch (parseError) {
      console.error('解析响应失败:', parseError.message);
    }
    
  } catch (error) {
    console.error('请求出错:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 执行测试
testChat(); 