/*****************************************************************************************
⭐️ Telegram Bot: Gift Link Generator (Up to 1,000,000 Links) ⭐️
🖋️ Language: JavaScript (Node.js)
🎨 Styles: Emojis, Borders, HTML Formatting, Reply Keyboard, Debug Logs
📁 Token File: tg.txt (Line 1 contains the bot token)
*****************************************************************************************/

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { once } = require('events');

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

// Graceful shutdown
function setupGracefulShutdown(bot) {
  const shutdown = async (signal) => {
    try {
      console.log(`\n🛑 Received ${signal}. Stopping bot polling...`);
      await bot.stopPolling();
      console.log('✅ Bot polling stopped. Exiting.');
      process.exit(0);
    } catch (e) {
      console.warn('⚠️ Error during shutdown:', e);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

setupGracefulShutdown(bot);

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
// │ Utility helpers                                                                       │
// └───────────────────────────────────────────────────────────────────────────────────────┘
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendMessageWithRetry(bot, chatId, text, options = {}, attempt = 0) {
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (err) {
    const retryAfter = err?.response?.body?.parameters?.retry_after;
    const statusCode = err?.response?.statusCode ?? err?.code;
    if (attempt < 5 && (retryAfter || statusCode === 429)) {
      const waitMs = (retryAfter ? (retryAfter * 1000) : (500 * Math.pow(2, attempt)));
      console.warn(`⏳ Rate limited (attempt ${attempt + 1}). Waiting ${waitMs}ms before retrying...`);
      await delay(waitMs);
      return sendMessageWithRetry(bot, chatId, text, options, attempt + 1);
    }
    throw err;
  }
}

async function sendDocumentWithRetry(bot, chatId, documentStream, options = {}, fileOptions = {}, attempt = 0) {
  try {
    return await bot.sendDocument(chatId, documentStream, options, fileOptions);
  } catch (err) {
    const retryAfter = err?.response?.body?.parameters?.retry_after;
    const statusCode = err?.response?.statusCode ?? err?.code;
    if (attempt < 5 && (retryAfter || statusCode === 429)) {
      const waitMs = (retryAfter ? (retryAfter * 1000) : (500 * Math.pow(2, attempt)));
      console.warn(`⏳ Rate limited (doc, attempt ${attempt + 1}). Waiting ${waitMs}ms before retrying...`);
      await delay(waitMs);
      return sendDocumentWithRetry(bot, chatId, documentStream, options, fileOptions, attempt + 1);
    }
    throw err;
  }
}

async function sendLinksInChunksSequentially(bot, chatId, prefix, startIndex, totalCount, chunkSize, delayMs) {
  const endIndex = startIndex + totalCount - 1;
  for (let chunkStartNum = startIndex; chunkStartNum <= endIndex; chunkStartNum += chunkSize) {
    const chunkEndNum = Math.min(chunkStartNum + chunkSize - 1, endIndex);

    const lines = [
      `<pre>╔═══════════════════════════════╗`,
      `║   📦 Links ${chunkStartNum} – ${chunkEndNum}   ║`,
      `╚═══════════════════════════════╝</pre>`
    ];

    for (let num = chunkStartNum; num <= chunkEndNum; num++) {
      const link = `${prefix}${num}`;
      lines.push(`🔗 <a href="${link}">${link}</a>`);
    }

    const chunkMsg = lines.join('\n') + '\n';

    await sendMessageWithRetry(bot, chatId, chunkMsg, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    await delay(delayMs);
  }
}

async function writeLinksToTempFile(prefix, startIndex, totalCount) {
  const tempFilePath = path.join(
    os.tmpdir(),
    `gift-links-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  );

  const writeStream = fs.createWriteStream(tempFilePath, { encoding: 'utf8' });
  const endIndex = startIndex + totalCount - 1;

  for (let num = startIndex; num <= endIndex; num++) {
    const link = `${prefix}${num}\n`;
    if (!writeStream.write(link)) {
      await once(writeStream, 'drain');
    }
  }

  await new Promise((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });

  return tempFilePath;
}

// ┌───────────────────────────────────────────────────────────────────────────────────────┐
// │ 6️⃣ HANDLE MESSAGES                                                                     │
// └───────────────────────────────────────────────────────────────────────────────────────┘
bot.on('message', async (msg) => {
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
        `<pre>╔═══════════════════════════════╗\n` +
        `║      🎁 Gift Link Section      ║\n` +
        `╚═══════════════════════════════╝</pre>\n` +
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
      
      await sendMessageWithRetry(bot, chatId, promptMsg, { parse_mode: 'HTML' })
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
        await sendMessageWithRetry(
          bot,
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
        await sendMessageWithRetry(
          bot,
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
      await sendMessageWithRetry(
        bot,
        chatId,
        `<pre>╔═══════════════════════════════╗\n` +
        `║      ⏳ Generating Links...       ║\n` +
        `╚═══════════════════════════════╝</pre>`,
        { parse_mode: 'HTML' }
      ).catch((err) => console.error(`❌ [GeneratingMsg Error]: ${err.message}`));

      // ──────────────────────────────────────────────────────────────────────────────────────
      // 6.3 Optimized sending strategy
      //     - For large volumes, stream to a temporary file and send as a document
      //     - For smaller volumes, send sequentially in chunks with a small delay
      // ──────────────────────────────────────────────────────────────────────────────────────
      const CHUNK_SIZE = 20;
      const DELAY_MS = 750; // balance rate limits and speed
      const FILE_THRESHOLD = 1000; // switch to file for larger runs

      try {
        if (totalCount >= FILE_THRESHOLD) {
          const tempFilePath = await writeLinksToTempFile(prefix, startIndex, totalCount);
          const fileName = `links_${startIndex}-${endIndex}.txt`;

          await sendDocumentWithRetry(
            bot,
            chatId,
            fs.createReadStream(tempFilePath),
            { caption: `📄 Generated ${totalCount.toLocaleString()} links.` },
            { filename: fileName }
          );

          fs.unlink(tempFilePath, (err) => {
            if (err) console.warn(`⚠️ Could not remove temp file: ${tempFilePath}`, err);
          });

          console.log(`✅ Sent text file (${fileName}) with ${totalCount} links to ${chatId}`);
        } else {
          await sendLinksInChunksSequentially(bot, chatId, prefix, startIndex, totalCount, CHUNK_SIZE, DELAY_MS);
          console.log(`✅ Sent ${totalCount} links to ${chatId} in chunks`);
        }
      } catch (err) {
        console.error(`❌ [Send Strategy Error]: ${err.message}`);
        // Fallback: try chunked messages if file sending failed
        try {
          await sendMessageWithRetry(bot, chatId, `⚠️ Could not send as a file; falling back to chunked messages…`, { parse_mode: 'HTML' });
          await sendLinksInChunksSequentially(bot, chatId, prefix, startIndex, totalCount, CHUNK_SIZE, DELAY_MS);
        } catch (err2) {
          console.error(`❌ [Fallback Chunk Send Error]: ${err2.message}`);
        }
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
    await sendMessageWithRetry(bot, chatId, unknownMsg, { parse_mode: 'HTML' })
      .then(() => console.log(`⚠️ Sent unknown-format notice to ${chatId}`))
      .catch((err) => console.error(`❌ [UnknownMsg Error]: ${err.message}`));

  } catch (err) {
    console.error(`❌ [Message Handler Error]: ${err.message}`);
    await sendMessageWithRetry(
      bot,
      chatId,
      `😓 <b>Sorry!</b> Something went wrong on my side. Please try again later.`,
      { parse_mode: 'HTML' }
    ).catch(() => {/* ignore further errors */});
  }
});