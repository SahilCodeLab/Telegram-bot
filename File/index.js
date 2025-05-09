const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Database setup (local JSON file)
const DB_FILE = 'messageStats.json';
let stats = {};

// Load database
if(fs.existsSync(DB_FILE)) {
  stats = JSON.parse(fs.readFileSync(DB_FILE));
}

// Initialize bot
const bot = new TelegramBot('YOUR_BOT_TOKEN', {polling: true});

// Message counter
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;

  if(!stats[chatId]) stats[chatId] = {};
  if(!stats[chatId][userId]) {
    stats[chatId][userId] = {
      count: 0,
      name: userName,
      lastMessage: ''
    };
  }

  stats[chatId][userId].count++;
  stats[chatId][userId].lastMessage = new Date().toLocaleString();

  if(stats[chatId][userId].count % 10 === 0) {
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
    .map(([id, data], index) => 
      `${index+1}. ${data.name} - ${data.count} messages`);

  const totalMessages = Object.values(chatStats).reduce((sum, user) => sum + user.count, 0);

  const response = `📊 Group Stats:\n\n${topUsers.join('\n')}\n\nTotal Messages: ${totalMessages}`;
  bot.sendMessage(chatId, response);
});

// /mystats command
bot.onText(/\/mystats/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const userData = stats[chatId]?.[userId];
  if(!userData) return;

  const allUsers = Object.entries(stats[chatId]);
  const sortedUsers = allUsers.sort((a, b) => b[1].count - a[1].count);
  const userRank = sortedUsers.findIndex(u => u[0] == userId) + 1;

  const response = `👤 Your Stats:\n\nMessages: ${userData.count}\nRank: #${userRank}\nLast Message: ${userData.lastMessage}`;
  bot.sendMessage(chatId, response);
});

// /clearstats command
bot.onText(/\/clearstats/, async (msg) => {
  const chatId = msg.chat.id;
  const admins = await bot.getChatAdministrators(chatId);

  if(admins.some(a => a.user.id === msg.from.id)) {
    delete stats[chatId];
    saveStats();
    bot.sendMessage(chatId, 'Stats have been reset!');
  } else {
    bot.sendMessage(chatId, 'You don’t have permission!');
  }
});

// /help command
bot.onText(/\/help/, (msg) => {
  const helpText = `
  📈 Stats Bot Commands:

  1. /stats - Top 5 active users
  2. /mystats - Your personal stats
  3. /clearstats - Reset data (Admins only)
  4. /about - About the bot creator
  `;
  bot.sendMessage(msg.chat.id, helpText);
});

// /about command
bot.onText(/\/about/, (msg) => {
  const aboutText = `
  👨‍💻 *About the Developer:*

  My name is *Sahil*, also known as *sahilcodab*.
  I'm a passionate developer who loves coding and building creative solutions.

  *Languages I Know:*
  - HTML
  - CSS
  - JavaScript
  - Node.js
  - Python
  - Java
  - Ruby
  - C++

  *Telegram:* [@Enchanting_Echo](https://t.me/Enchanting_Echo)
  `;
  bot.sendMessage(msg.chat.id, aboutText, {parse_mode: 'Markdown'});
});

// Save data function
function saveStats() {
  fs.writeFileSync(DB_FILE, JSON.stringify(stats, null, 2));
}

console.log('🚀 Stats Tracker Bot Active!');