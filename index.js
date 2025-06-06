/*****************************************************************************************
⭐️ Telegram Bot: Gift Link Generator (Up to 1,000,000 Links) ⭐️
🖋️ Language: JavaScript (Node.js)
🎨 Styles: Emojis, Borders, HTML Formatting, Reply Keyboard, Debug Logs
📁 Token File: tg.txt (Line 1 contains the bot token)
*****************************************************************************************/

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// ┌───────────────────────────────────────────────────────────────────────────────────────┐
// │ 1️⃣ READ BOT TOKEN                                                                      │
// └───────────────────────────────────────────────────────────────────────────────────────┘
const tokenPath = path.join(__dirname, 'tg.txt');
let token = '';

try {
  const raw = fs.readFileSync(tokenPath, 'utf8').split(/\r?\n/);
  token = raw[0]?.trim();
  if (!token) {
    throw new Error('tg.txt appears empty or token missing on line 1.');
  }
  console.log('✅ Token loaded successfully from tg.txt');
} catch (err) {
  console.error(`❌ [Token Error] ${err.message}`);
  process.exit(1); // Exit if token cannot be read
}

// ┌───────────────────────────────────────────────────────────────────────────────────────┐
// │ 2️⃣ INITIALIZE BOT                                                                     │
// └───────────────────────────────────────────────────────────────────────────────────────┘
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Bot is polling...');

// ┌───────────────────────────────────────────────────────────────────────────────────────┐
// │ 3️⃣ GLOBAL ERROR HANDLING                                                               │
// └───────────────────────────────────────────────────────────────────────────────────────┘
// Catch unhandled promise rejections / exceptions to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err);
});

// ┌───────────────────────────────────────────────────────────────────────────────────────┐
// │ 4️⃣ REPLY KEYBOARD CONFIGURATION                                                         │
// └───────────────────────────────────────────────────────────────────────────────────────┘
const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '🎁 Gift Links 🎁' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  },
  parse_mode: 'HTML'
};

// ┌───────────────────────────────────────────────────────────────────────────────────────┐
// │ 5️⃣ /start → Welcome Flow                                                                │
// └───────────────────────────────────────────────────────────────────────────────────────┘
bot.onText(/\/start/, (msg) => {
  try {
    const chatId = msg.chat.id;
    const userFirst = msg.from.first_name || '';
    const welcomeMsg =
      `<pre>╔═══════════════════════════════╗
║   🎉 Welcome, <b>${userFirst}</b>! 🤖   ║
╚═══════════════════════════════╝</pre>\n` +
      `Hello <b>${userFirst}</b>! 🌟\n\n` +
      `I’m your friendly Link-Generator Bot! 📦\n` +
      `Press the <b>🎁 Gift Links 🎁</b> button below to start. 😊`;
    
    bot.sendMessage(chatId, welcomeMsg, mainKeyboard)
      .then(() => console.log(`✅ Sent welcome message to ${userFirst} (${chatId})`))
      .catch((err) => console.error(`❌ [WelcomeMsg Error]: ${err.message}`));
  } catch (err) {
    console.error(`❌ [Start Handler Error]: ${err.message}`);
  }
});

// ┌───────────────────────────────────────────────────────────────────────────────────────┐
// │ 6️⃣ HANDLE MESSAGES                                                                     │
// └───────────────────────────────────────────────────────────────────────────────────────┘
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  // Ignore /start here; it's handled above
  if (text === '/start') return;

  try {
    // ──────────────────────────────────────────────────────────────────────────────────────
    // 6.1 When user taps the '🎁 Gift Links 🎁' keyboard button
    // ──────────────────────────────────────────────────────────────────────────────────────
    if (text === '🎁 Gift Links 🎁') {
      const promptMsg =
        `<pre>╔═══════════════════════════════╗
║      🎁 Gift Link Section      ║
╚═══════════════════════════════╝</pre>\n` +
        `🔹 Send me a link in this format:\n` +
        `<code>http://t.me/nft/ToyBear-1 1000000</code>\n\n` +
        `• The part before “-1” is the <b>base URL</b>.\n` +
        `• “1” is the starting index.\n` +
        `• “1000000” is how many links to generate (up to 1,000,000!).\n\n` +
        `📌 Example: <code>http://t.me/nft/ToyBear-1 1000000</code>\n` +
        `I will generate:\n` +
        `http://t.me/nft/ToyBear-1\n` +
        `http://t.me/nft/ToyBear-2\n` +
        `...\n` +
        `http://t.me/nft/ToyBear-1000000\n\n` +
        `⚙️ Please send it when you’re ready!`;
      
      bot.sendMessage(chatId, promptMsg, { parse_mode: 'HTML' })
        .then(() => console.log(`✅ Prompted user ${chatId} for link input`))
        .catch((err) => console.error(`❌ [PromptMsg Error]: ${err.message}`));
      
      return;
    }

    // ──────────────────────────────────────────────────────────────────────────────────────
    // 6.2 Pattern: BASE_LINK-START SPACE COUNT
    //     Example: http://t.me/nft/ToyBear-1 1000000
    // ──────────────────────────────────────────────────────────────────────────────────────
    const regex = /^(https?:\/\/\S+)-(\d+)\s+(\d+)\s*$/i;
    const match = text.match(regex);

    if (match) {
      const fullBase = match[1];            // e.g., "http://t.me/nft/ToyBear"
      const startIndex = parseInt(match[2], 10);  // e.g., 1
      const totalCount = parseInt(match[3], 10);  // e.g., 1000000

      // Input validation
      if (isNaN(startIndex) || isNaN(totalCount) || startIndex < 0 || totalCount <= 0) {
        bot.sendMessage(
          chatId,
          `❌ <b>Error:</b> The starting index must be ≥ 0 and the total count must be a positive number.\n\n` +
          `Please try again with a proper format.`,
          { parse_mode: 'HTML' }
        );
        console.warn(`⚠️ [Validation Failed] Chat ${chatId}: start=${startIndex}, count=${totalCount}`);
        return;
      }

      // Update: Allow up to 1,000,000 links
      if (totalCount > 1000000) {
        bot.sendMessage(
          chatId,
          `⚠️ <b>Warning:</b> Generating more than 1,000,000 links at once may cause delays or exceed Telegram rate limits.\n` +
          `Please choose a smaller count (≤ 1,000,000) or generate in batches.`,
          { parse_mode: 'HTML' }
        );
        console.warn(`⚠️ [Too Many Links] Chat ${chatId}: Requested ${totalCount}`);
        return;
      }

      // Build prefix for links: "http://t.me/nft/ToyBear-"
      const prefix = `${fullBase}-`;
      const endIndex = startIndex + totalCount - 1;

      console.log(`🛠️ [Link Generation Starting] Chat ${chatId}: start=${startIndex}, count=${totalCount}`);

      // Notify user that generation is in progress
      bot.sendMessage(
        chatId,
        `<pre>╔═══════════════════════════════╗
║      ⏳ Generating Links...       ║
╚═══════════════════════════════╝</pre>`,
        { parse_mode: 'HTML' }
      ).catch((err) => console.error(`❌ [GeneratingMsg Error]: ${err.message}`));

      // ──────────────────────────────────────────────────────────────────────────────────────
      // 6.3 STREAM & SEND IN CHUNKS OF 20 (to avoid large memory footprint)
      // ──────────────────────────────────────────────────────────────────────────────────────
      const chunkSize = 20;
      const totalChunks = Math.ceil(totalCount / chunkSize);

      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        // Compute the start and end numbers for this chunk
        const chunkStartNum = startIndex + chunkIdx * chunkSize;
        const chunkEndNum = Math.min(chunkStartNum + chunkSize - 1, endIndex);

        // Build the chunk message header
        let chunkMsg =
          `<pre>╔═══════════════════════════════╗
║   📦 Links ${chunkStartNum} – ${chunkEndNum}   ║
╚═══════════════════════════════╝</pre>\n`;

        // Generate and append each link in this chunk
        for (let num = chunkStartNum; num <= chunkEndNum; num++) {
          const link = `${prefix}${num}`;
          chunkMsg += `🔗 <a href="${link}">${link}</a>\n`;
        }

        // Send this chunk with a staggered delay to respect rate limits
        setTimeout(() => {
          bot.sendMessage(chatId, chunkMsg, { parse_mode: 'HTML', disable_web_page_preview: true })
            .then(() => console.log(`✅ Sent links ${chunkStartNum}–${chunkEndNum} to ${chatId}`))
            .catch((err) => console.error(`❌ [ChunkMsg Error]: ${err.message}`));
        }, chunkIdx * 700); // 700ms between each batch
      }

      return;
    }

    // ──────────────────────────────────────────────────────────────────────────────────────
    // 6.4 Unknown Input Fallback
    // ──────────────────────────────────────────────────────────────────────────────────────
    const unknownMsg =
      `🤔 <b>Oops!</b> I didn’t recognize that format.\n\n` +
      `• Press <b>🎁 Gift Links 🎁</b> to start.\n` +
      `• Or send in the format: <code>http://t.me/nft/ToyBear-1 1000000</code>\n\n` +
      `Let’s give it another try! 😊`;
    bot.sendMessage(chatId, unknownMsg, { parse_mode: 'HTML' })
      .then(() => console.log(`⚠️ Sent unknown-format notice to ${chatId}`))
      .catch((err) => console.error(`❌ [UnknownMsg Error]: ${err.message}`));

  } catch (err) {
    console.error(`❌ [Message Handler Error]: ${err.message}`);
    bot.sendMessage(
      chatId,
      `😓 <b>Sorry!</b> Something went wrong on my side. Please try again later.`,
      { parse_mode: 'HTML' }
    ).catch(() => {/* ignore further errors */});
  }
});