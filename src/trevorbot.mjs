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
  await handleTextCommands(message, client);

  // Process AI context flows
  await handleAiResponse(message, client);
});

client.login(process.env.DISCORD_TOKEN);

// Global state tracking shutdown notification loops
async function notifyShutdown(client) {
  for (const [, guild] of client.guilds.cache) {
    const channel = guild.channels.cache.find(
      (ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('SendMessages') && ch.name === 'trevorbot-testing'
    );
    if (channel) {
      try {
        await channel.send('Bot is no longer listening.');
      } catch (err) {
        console.error(`Failed to send shutdown message to ${guild.name}:`, err);
      }
    }
  }
}

async function handleShutdown(signal) {
  console.log(`Received ${signal}. Notifying guilds...`);
  try {
    await notifyShutdown(client);
    console.log('Shutdown notifications sent. Logging out...');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  await client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('message', async (msg) => {
  if (msg === 'shutdown') await handleShutdown('PM2 Windows Shutdown');
});