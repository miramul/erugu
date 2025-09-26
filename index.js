// ローカルで成功したコード

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(bodyParser.json());
app.use(express.static('public')); // 静的ファイル配信用

// あなたの Instagram アクセストークン
const PAGE_ACCESS_TOKEN = "IGAAX69AxSy9JBZAFFyemdlV1pPWDNMN0tPaTJFSmNzTWEtWk5xcHV3ZAGhRd1g1X3o4eFBPWEJ3ZAHVZAWHBfSmxOTXFGUExlZAGRvdTExM2hhMkJqMlFjOGl6d1RTbmkzZAnFoWHpidXYtTnZAzcGlVUG9mSGV2SDVOdUFXcEQ2ekxuRQZDZD";

// ✅ 設定データを保存する変数（本来はデータベースを使用）
let botConfig = {
  triggerType: "all", // "all" または "keyword"
  triggerKeywords: "",
  excludeWords: false,
  excludeKeywords: "",
  firstTimeOnly: false,
  businessHoursOnly: false,
  actionTiming: "immediate",
  responses: [
    { condition: 'hello', message: 'Hello! How can I help you?', trigger: '挨拶' },
    { condition: 'こんにちは', message: 'こんにちは！何かお手伝いできることはありますか？', trigger: '挨拶' },
    { condition: 'ヘルプ', message: 'ご質問やお困りのことがあれば、お気軽にお聞かせください！', trigger: 'ヘルプ' },
    { condition: 'ありがとう', message: 'どういたしまして！他に何かお手伝いできることはありますか？', trigger: 'お礼' }
  ]
};

// ✅ 起動時のデバッグ情報を強化
console.log('='.repeat(50));
console.log('🚀 Instagram DM Bot Starting...');
console.log('📅 Start Time:', new Date().toISOString());
console.log('🔧 Node Version:', process.version);
console.log('📍 Working Directory:', process.cwd());
console.log('='.repeat(50));

// ✅ DM送信関数（有効化）
async function sendDM(recipientId, message) {
  console.log(`📤 Attempting to send DM to ${recipientId}: "${message}"`);
  
  try {
    const response = await axios.post(`https://graph.instagram.com/v21.0/me/messages`, {
      recipient: { id: recipientId },
      message: { text: message }
    }, {
      params: { access_token: PAGE_ACCESS_TOKEN },
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✅ DM sent successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.log(`❌ Failed to send DM:`, error.response?.data || error.message);
    console.log(`🔍 Error details:`, {
      status: error.response?.status,
      data: error.response?.data,
      token: PAGE_ACCESS_TOKEN.substring(0, 20) + '...'
    });
    return null;
  }
}

// ✅ 動的な返信メッセージ決定関数
function getReplyMessage(text) {
  // デフォルト応答
  let reply = `Echo: ${text}`;

  // 設定に基づいた返信ロジック
  for (const response of botConfig.responses) {
    if (response.condition === 'default') {
      reply = response.message;
      continue;
    }

    // 条件チェック
    if (text && text.toLowerCase().includes(response.condition.toLowerCase())) {
      reply = response.message;
      console.log(`🎯 Matched condition: ${response.condition}`);
      break;
    }
  }

  // 除外ワード機能
  if (botConfig.excludeWords && botConfig.excludeKeywords) {
    const excludeList = botConfig.excludeKeywords.split(',').map(word => word.trim());
    for (const excludeWord of excludeList) {
      if (text && text.toLowerCase().includes(excludeWord.toLowerCase())) {
        console.log(`🚫 Excluded by word: ${excludeWord}`);
        return null; // 返信しない
      }
    }
  }

  // トリガータイプチェック
  if (botConfig.triggerType === 'keyword' && botConfig.triggerKeywords) {
    const triggerList = botConfig.triggerKeywords.split(',').map(word => word.trim());
    let shouldReply = false;
    
    for (const trigger of triggerList) {
      if (text && text.toLowerCase().includes(trigger.toLowerCase())) {
        shouldReply = true;
        break;
      }
    }
    
    if (!shouldReply) {
      console.log(`🚫 No trigger keyword matched`);
      return null; // 返信しない
    }
  }

  return reply;
}

// ✅ 設定画面を配信するエンドポイント
app.get('/config', (req, res) => {
  console.log('⚙️ Config page requested');
  res.sendFile(path.join(__dirname, 'config.html'));
});

// ✅ 現在の設定を取得するAPI
app.get('/api/config', (req, res) => {
  console.log('📋 Config data requested');
  res.json(botConfig);
});

// ✅ 設定を更新するAPI
app.post('/api/config', (req, res) => {
  console.log('💾 Config update requested');
  console.log('📋 New config:', JSON.stringify(req.body, null, 2));
  
  try {
    // 設定を更新
    botConfig = { ...botConfig, ...req.body };
    
    console.log('✅ Configuration updated successfully');
    console.log('🔧 New config applied:', JSON.stringify(botConfig, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config: botConfig
    });
  } catch (error) {
    console.log('❌ Failed to update configuration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update configuration',
      error: error.message
    });
  }
});

// ✅ 確認用エンドポイント（詳細ログ追加）
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = "my_verify_token";
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('\n🔍 ==> Webhook GET Request Received <==');
  console.log('📋 Query Parameters:', req.query);
  console.log('🔍 Verification Details:', { mode, token, challenge });
  console.log('⏰ Timestamp:', new Date().toISOString());

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Verified Successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    console.log("Expected token: my_verify_token");
    console.log("Received token:", token);
    res.sendStatus(403);
  }
  console.log('='.repeat(40));
});

// ✅ シンプルなリクエストログ（エラーを避けるため）
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ✅ Instagramからの通知を受け取る（設定ベースの返信ロジック）
app.post('/webhook', (req, res) => {
  console.log('\n🎯 ==> POST /webhook Handler Started <==');
  const body = req.body;

  console.log('📦 Request received');
  console.log('📋 Body:', JSON.stringify(body, null, 2));

  if (body && body.object === 'instagram') {
    console.log('✅ Instagram object detected');
    
    if (body.entry && Array.isArray(body.entry)) {
      console.log(`📦 Processing ${body.entry.length} entries`);
      
      body.entry.forEach((entry, entryIndex) => {
        console.log(`\n📦 Entry ${entryIndex + 1}:`);
        
        if (entry.messaging && Array.isArray(entry.messaging)) {
          console.log(`💬 Found ${entry.messaging.length} messaging events`);
          
          entry.messaging.forEach((event, eventIndex) => {
            console.log(`\n📩 Event ${eventIndex + 1}:`);
            
            if (event.message && event.sender && event.sender.id) {
              const senderId = event.sender.id;
              const text = event.message.text;
              
              console.log(`✉️ Message from ${senderId}: "${text}"`);
              console.log(`🔧 Using config: ${JSON.stringify(botConfig, null, 2)}`);
              
              // 設定ベースの返信決定
              const reply = getReplyMessage(text);
              
              if (reply) {
                console.log(`💭 Reply: "${reply}"`);
                
                // タイミング制御
                const delay = botConfig.actionTiming === 'immediate' ? 0 : 
                            botConfig.actionTiming === 'delay-5' ? 5 * 60 * 1000 :
                            botConfig.actionTiming === 'delay-10' ? 10 * 60 * 1000 :
                            botConfig.actionTiming === 'delay-30' ? 30 * 60 * 1000 :
                            botConfig.actionTiming === 'delay-60' ? 60 * 60 * 1000 : 0;
                
                if (delay > 0) {
                  console.log(`⏰ Scheduling reply in ${delay / 1000} seconds`);
                  setTimeout(() => {
                    sendDM(senderId, reply);
                  }, delay);
                } else {
                  // 自動返信送信（有効化）
                  sendDM(senderId, reply);
                }
              } else {
                console.log(`🚫 No reply sent (filtered by configuration)`);
              }
            }
          });
        }
      });
    }
    
    res.sendStatus(200);
  } else {
    console.log('❌ Not an Instagram object or invalid body');
    res.sendStatus(404);
  }
  
  console.log('🎯 ==> POST /webhook Handler Completed <==\n');
});

// ✅ 健康チェックエンドポイント（シンプル版）
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Instagram DM Bot is running',
    uptime: Math.floor(process.uptime()),
    node_version: process.version,
    dm_enabled: true,
    config_status: 'loaded',
    total_responses: botConfig.responses.length
  };
  
  res.json(health);
});

// ✅ テスト用エンドポイント
app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint accessed');
  res.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    success: true,
    dm_enabled: true,
    current_config: botConfig
  });
});

// ✅ ルートエンドポイント
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint accessed');
  res.json({
    message: 'Instagram Webhook Server',
    status: 'running',
    dm_enabled: true,
    endpoints: {
      health: '/health',
      test: '/test',
      webhook: '/webhook',
      config: '/config',
      api_config: '/api/config'
    }
  });
});

// ✅ 404ハンドラー（修正版）
app.use((req, res) => {
  console.log(`❓ 404 - Unknown endpoint: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method
  });
});

// ✅ サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Webhook server is running on port ${PORT}`);
  console.log(`🌍 Access URLs:`);
  console.log(`   - Root: http://localhost:${PORT}/`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Test: http://localhost:${PORT}/test`);
  console.log(`   - Webhook: http://localhost:${PORT}/webhook`);
  console.log(`   - Config: http://localhost:${PORT}/config`);
  console.log('\n✅ DM sending is now ENABLED!');
  console.log('📤 Bot will automatically reply to Instagram DMs');
  console.log('🔑 Using provided access token');
  console.log('⚙️ Configuration can be managed at /config');
  console.log('🎯 Current responses loaded:', botConfig.responses.length);
});

// ✅ プロセス終了時の処理
process.on('SIGTERM', () => {
  console.log('\n👋 Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down gracefully...');
  process.exit(0);
});
