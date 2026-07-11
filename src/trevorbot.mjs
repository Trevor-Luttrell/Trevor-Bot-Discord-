/*
  === pm2 Usage Guide ===
  trevorbot is the working alias for src/trevorbot.mjs

  Start the bot: pm2 start trevorbot
  
  Check bot status: pm2 status
  
  Stop the bot: pm2 stop trevorbot

  Restart the bot: pm2 restart trevorbot

  View logs: pm2 logs

  Save processes to be restarted upon computer reboot (make sure desired processes are running before save): pm2 save

  Notes:
  - pm2 helps keep your bot running continuously, even after closing terminals.
  - It can automatically restart your bot if it crashes.
  - To run pm2 globally, use `sudo npm install -g pm2` (may require admin permissions).
  - For local installs, always use `npx pm2` to run pm2 commands.
*/

//This MUST be the first line
import 'dotenv/config';

//These are useless due to the above line
import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits } from 'discord.js';
import { handleTextCommands } from './commands.mjs';
import { handleAiResponse } from './ai.mjs';
import { initScheduler, checkAndSendDailyMessage } from './crons.mjs';

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
});

console.log("Starting Discord bot...");

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Fallback recovery check if cron was missed during offline states
  await checkAndSendDailyMessage(client);

  // Initialize cron schedules
  initScheduler(client);

  // Startup announcements across text channels
  client.guilds.cache.forEach(async (guild) => {
    const channel = guild.channels.cache.find(
      (ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('SendMessages') && ch.name === 'trevorbot-testing'
    );
    if (channel) {
      try {
        await channel.send("Bot is now online and listening!");
      } catch (error) {
        console.error(`Could not send message to ${guild.name} in channel ${channel.name}:`, error);
      }
    }
  });
});

// Central event listener
client.on("messageCreate", async (message) => {
  if (message?.author.bot) return;

  // Process manual commands first
  const commandWasHandled = await handleTextCommands(message, client);

  //Don't run AI (bye bye RAM) if not needed
  if(commandWasHandled) return;

  // Process AI context flows
  await handleAiResponse(message, client);
});

client.login(process.env.DISCORD_TOKEN);

// Global state tracking shutdown notification loops
async function notifyShutdown(client) {
  const promises = [];
  for (const [, guild] of client.guilds.cache) {
    const channel = guild.channels.cache.find(
      (ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('SendMessages') && ch.name === 'trevorbot-testing'
    );
    if (channel) {
      // Fire all API requests concurrently to speed up clean shutdowns
      promises.push(
        channel.send('Bot is no longer listening.').catch(err => {
          console.error(`Failed to send shutdown message to ${guild.name}:`, err);
        })
      );
    }
  }
  await Promise.all(promises);
}

async function handleShutdown(signal) {
  console.log(`Received ${signal}. Notifying guilds...`);
  try {
    await notifyShutdown(client);
    // Clean exit: Delete the crash marker file so the next boot knows it was an intentional shutdown
    if (fs.existsSync(CRASH_MARKER_PATH)) {
      fs.unlinkSync(CRASH_MARKER_PATH);
    }
    console.log('Shutdown notifications sent. Logging out...');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  client.destroy();
  process.exit(0);
}

// Intercept clean PM2 closures
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('message', async (msg) => {
  if (msg === 'shutdown') await handleShutdown('PM2 Windows Shutdown');
});

// Fallback handling for unhandled crashes: 
// This logs the crash details to PM2 console and makes sure the file isn't deleted,
// signaling a crash on the next boot.
process.on('uncaughtException', (err) => {
  console.error('CRITICAL CRASH DETECTED:', err);
  // We do not delete the marker file here!
  process.exit(1); 
});