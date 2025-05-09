const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Database setup (local JSON file)
const DB_FILE = 'messageStats.json';
let stats = {};

// Load database
if (fs.existsSync(DB_FILE)) {
  stats = JSON.parse(fs.readFileSync(DB_FILE));
}

// Initialize bot
const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});
// Message counter
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;

  if (!stats[chatId]) stats[chatId] = {};
  if (!stats[chatId][userId]) {
    stats[chatId][userId] = {
      count: 0,
      name: userName,
      lastMessage: ''
    };
  }

  stats[chatId][userId].count++;
  stats[chatId][userId].lastMessage = new Date().toLocaleString();

  if (stats[chatId][userId].count % 10 === 0) {
    saveStats();
  }
});

// /stats command
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const chatStats = stats[chatId] || {};

  const topUsers = Object.entries(chatStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, data], index) => `${index + 1}. ${data.name} - ${data.count} messages`);

  const totalMessages = Object.values(chatStats).reduce((sum, user) => sum + user.count, 0);

  const response = `📊 Group Stats:\n\n${topUsers.join('\n')}\n\nTotal Messages: ${totalMessages}`;
  bot.sendMessage(chatId, response);
});

// /mystats command
bot.onText(/\/mystats/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const userData = stats[chatId]?.[userId];
  if (!userData) return;

  const allUsers = Object.entries(stats[chatId]);
  const sortedUsers = allUsers.sort((a, b) => b[1].count - a[1].count);
  const userRank = sortedUsers.findIndex(u => u[0] == userId) + 1;

  const response = `👤 Your Stats:\n\nMessages: ${userData.count}\nRank: #${userRank}\nLast Message: ${userData.lastMessage}`;
  bot.sendMessage(chatId, response);
});

// /setnickname command
bot.onText(/\/setnickname (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const nickname = match[1];

  if (!stats[chatId]) stats[chatId] = {};
  if (!stats[chatId][userId]) {
    stats[chatId][userId] = { count: 0, name: msg.from.first_name, lastMessage: '' };
  }

  stats[chatId][userId].name = nickname;
  saveStats();
  bot.sendMessage(chatId, `✅ Nickname updated to *${nickname}*`, { parse_mode: 'Markdown' });
});

// /topchats command (dummy feature: real top chats logic requires DB of multiple chats)
bot.onText(/\/topchats/, (msg) => {
  const allChats = Object.entries(stats)
    .map(([chatId, users]) => ({
      chatId,
      messageCount: Object.values(users).reduce((sum, u) => sum + u.count, 0)
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);

  const response = `🔥 Most Active Chats:\n\n` + allChats.map((c, i) => `${i + 1}. Chat ID: ${c.chatId} - ${c.messageCount} messages`).join('\n');
  bot.sendMessage(msg.chat.id, response);
});

// /recentactivity command
bot.onText(/\/recentactivity/, (msg) => {
  const chatId = msg.chat.id;
  const chatStats = stats[chatId] || {};

  const recent = Object.entries(chatStats)
    .sort((a, b) => new Date(b[1].lastMessage) - new Date(a[1].lastMessage))
    .slice(0, 5)
    .map(([id, data], i) => `${i + 1}. ${data.name} - ${data.lastMessage}`);

  const response = `🕒 Recent Activity:\n\n${recent.join('\n')}`;
  bot.sendMessage(chatId, response);
});

// /welcome command (Enable/disable welcome msg – optional basic setup)
let welcomeEnabled = true;
bot.onText(/\/welcome (on|off)/, (msg, match) => {
  const status = match[1];
  welcomeEnabled = status === 'on';
  bot.sendMessage(msg.chat.id, `✅ Welcome messages are now *${status.toUpperCase()}*`, { parse_mode: 'Markdown' });
});

bot.on('new_chat_members', (msg) => {
  if (welcomeEnabled) {
    msg.new_chat_members.forEach(user => {
      bot.sendMessage(msg.chat.id, `Welcome, ${user.first_name}!`);
    });
  }
});

// /resetallstats command
bot.onText(/\/resetallstats/, async (msg) => {
  const chatId = msg.chat.id;
  const admins = await bot.getChatAdministrators(chatId);

  if (admins.some(a => a.user.id === msg.from.id)) {
    delete stats[chatId];
    saveStats();
    bot.sendMessage(chatId, '⚠️ All stats have been reset!');
  } else {
    bot.sendMessage(chatId, '⛔ You don’t have permission!');
  }
});

// /help command
bot.onText(/\/help/, (msg) => {
  const helpText = `
📈 *Stats Bot Commands*:

/stats - Show group statistics  
/mystats - Show your personal stats  
/setnickname [name] - Set your nickname  
/topchats - Show most active chats  
/recentactivity - Show recent activity  
/welcome on/off - Enable or disable welcome messages  
/resetallstats - Reset all group stats (admin only)  
/help - List all commands  
/aboutsahilcodelab - About the developer  
`;
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// /aboutsahilcodelab command
bot.onText(/\/aboutsahilcodelab/, (msg) => {
  const aboutText = `
👨‍💻 *About the Developer:*

My name is *Sahil*, also known as *sahilcodab*.  
I'm a passionate developer who loves building creative Telegram bots.

*Languages I Know:*  
- HTML, CSS, JavaScript  
- Node.js, Python, Java, Ruby, C++

Follow me for more cool projects!
  `;
  bot.sendMessage(msg.chat.id, aboutText, { parse_mode: 'Markdown' });
});

// Save data function
function saveStats() {
  fs.writeFileSync(DB_FILE, JSON.stringify(stats, null, 2));
}

console.log('🚀 Stats Tracker Bot Active!');