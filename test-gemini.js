const apiManager = require('./src/services/apiManager');
const { log } = require('./src/utils');

async function testApiManager() {
  try {
    console.log("===== API管理器测试 =====");
    
    // 基本提示
    const prompt = "解释大语言模型是如何工作的，简短回答";
    
    // 测试多次调用，观察API切换
    for (let i = 0; i < 5; i++) {
      console.log(`\n[测试 ${i+1}/5]`);
      try {
        const response = await apiManager.generateResponse(prompt);
        console.log(`响应: ${response.substring(0, 150)}...`);
        
        // 显示统计信息
        const stats = apiManager.getStats();
        console.log("\nAPI统计信息:");
        console.log(`GROQ: 调用次数=${stats.groq.calls}, 错误次数=${stats.groq.errors}, 剩余=${stats.groq.remaining}`);
        console.log(`Gemini: 调用次数=${stats.gemini.calls}, 错误次数=${stats.gemini.errors}, 剩余=${stats.gemini.remaining}`);
      } catch (error) {
        console.error(`错误: ${error.message}`);
      }
      
      // 暂停3秒
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log("\n===== 测试完成 =====");
  } catch (error) {
    console.error(`测试失败: ${error.message}`);
  }
}

// 运行测试
testApiManager(); 