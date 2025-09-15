/*
  === pm2 Usage Guide ===

  Since pm2 may be installed locally, use npx to run commands:

  Start the bot:
    npx pm2 start index.js

  Check bot status:
    npx pm2 status

  Stop the bot:
    npx pm2 stop index

  Restart the bot:
    npx pm2 restart index

  View logs:
    npx pm2 logs

  Notes:
  - pm2 helps keep your bot running continuously, even after closing terminals.
  - It can automatically restart your bot if it crashes.
  - To run pm2 globally, use `sudo npm install -g pm2` (may require admin permissions).
  - For local installs, always use `npx pm2` to run pm2 commands.
*/
import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
// Importing file system
import fs from 'fs';
// Import scheduling library
import cron from 'node-cron';
// Import for music
import { createAudioPlayer, createAudioResource, entersState, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';
import play from 'play-dl';

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
});

//Level files
const CAT_FILE = './json/cat.json';
const LATE_FILE = './json/late.json';

function loadStats(STATS_FILE) {
  try {
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading stats file:', error);
    return {};
  }
}

function saveStats(stats, STATS_FILE) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error writing stats file:', error);
  }
}

//Notify guilds and me of startup
console.log("Starting Discord bot...");
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // For each guild the bot is in:
  client.guilds.cache.forEach(async (guild) => {
    // Find a suitable text channel to send the message in:
    // Usually, try to send it to the first channel where the bot has permission to send messages
    const channel = guild.channels.cache.find(
      (ch) =>
      ch.isTextBased() && // channel can send messages
      ch.permissionsFor(guild.members.me).has('SendMessages') &&
      ch.name === 'trevorbot-testing' // Will only send in this channel
    );

    if (channel) {
      try {
        await channel.send("Bot is now online and listening!");
      } catch (error) {
        console.error(`Could not send message to ${guild.name} in channel ${channel.name}:`, error);
      }
    } else {
      console.log(`No suitable text channel found in guild: ${guild.name}`);
    }
  });
});

client.login(process.env.DISCORD_TOKEN);

// Prepare cat array
const catImages = [
  "https://pethelpful.com/.image/w_750,q_auto:good,c_fill,ar_4:3/MTk2NzY3MjA5ODc0MjY5ODI2/top-10-cutest-cat-photos-of-all-time.jpg",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyNzkzOTUy/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzNDQ5MzEy/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyOTkwNTYw/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzMjUyNzA0/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyNjYyODgw/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzMzgzNzc2/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzMDU2MDk2/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzMzE4MjQw/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzMTIxNjMy/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyODU5NDg4/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyNzI4NDE2/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzNTE0ODQ4/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_fill,ar_4:3/MTk2NzY3MjA5ODc0MjY5ODI2/top-10-cutest-cat-photos-of-all-time.jpg",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzMTg3MTY4/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyOTI1MDI0/top-10-cutest-cat-photos-of-all-time.png",
  "https://media.discordapp.net/attachments/1392236322508378275/1392666175527190548/514901292_4950823675143815_8750876566418896489_n.png?ex=6874fa32&is=6873a8b2&hm=74630d54baf016f3015d21260af277a559e2bbbdb1c432d0e5fd3454a159d041&=&format=webp&quality=lossless&width=735&height=552"
];

//Bug somewhere in this idk
export async function playAudio(url, connection, message) {
  try {
    const stream = await play.stream(url, { quality: 2 });

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      metadata: {
        title: url
      }
    });

    const player = createAudioPlayer();

    connection.subscribe(player);
    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
      console.log("Playback finished.");
    });

    player.on('error', error => {
      console.error("Audio player error:", error.message);
      message.channel.send("There was an error playing the audio.");
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    message.channel.send(`Now playing: ${url}`);
  } catch (error) {
    console.error("Playback error:", error.message);
    console.error(error.stack);
    message.channel.send("Could not play audio.");
  }
}

// Listen for messages in guilds
client.on("messageCreate", async (message) => {
  if (message?.author.bot){
    return;
  }

  if (message.content === "!tjoin") {
    const channel = message.member.voice.channel;
    if (!channel) {
      return message.reply("You need to be in a voice channel to use this command.");
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    return message.reply(`Joined ${channel.name}`);
  }
  else if(message.content === "!tleave") {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      return message.reply("Left the voice channel.");
    } 
    else {
      return message.reply("I am not in a voice channel.");
    }
  }
  else if (message.content === "You make me happy TrevorBot") {
    // Response to praise
    return message.reply("You make me happy too! :)");
  }
  else if (message.content === "You make me sad TrevorBot") {
    // Response to sadness
    return message.reply("I am a construct of your own disappointment.");
  }
  else if (message.content === "!cat"){
    const userId = message.author.id;
    const username = message.author.username;

    const stats = loadStats(CAT_FILE);

    // Update catViewCount
    if (!stats[userId]) {
      stats[userId] = { username, catViewCount: 1 };
    } else {
      stats[userId].catViewCount += 1;
    }

    saveStats(stats, CAT_FILE); // Save to disk
    const imageUrl = catImages[Math.floor(Math.random() * catImages.length)];
    return message.channel.send({ files: [imageUrl] });
  }
  else if (message.content === "!catlevel"){
    const userId = message.author.id;
    const stats = loadStats(CAT_FILE);

    if (stats[userId]) {
      return message.reply(`You've viewed ${stats[userId].catViewCount} cat photo(s)!`);
    } else {
      return message.reply(`You haven't viewed any cat photos yet! Try using \`!cat\``);
    }
  }
  else if (message.content === "!thelp") {
    return message.reply("Available commands: `!tjoin`, `!tleave`, `!cat`, `!catlevel`, `!tlate <name> <minutes>`, `!tlate <name>`, `!tchat \"message\" userId`");
  }
  else if (message.content.startsWith('!tplay')) {
    const args = message.content.split(' ').slice(1); // get everything after !tplay
    if (args.length === 0) return message.reply("Please enter a song name or link!");

    const query = args.join(' ');
    const channel = message.member.voice.channel;
    if (!channel) return message.reply("You must be in a voice channel!");

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    let url;

    // If it's a valid URL, just use it. Otherwise, search.
    if (play.yt_validate(query) === 'video') {
      url = query;
    } 
    else {
      const results = await play.search(query, { limit: 1 });
      if (results.length === 0) return message.reply("No results found!");
      url = results[0].url;
    }

    await playAudio(url, connection, message);
  }
  else if (message.content.startsWith("!tlate")){
    const args = message.content.split(' ').slice(1); // get everything after !tlate
    if (args.length === 2) {
      const name = args[0];
      const minutes = parseInt(args[1]);
      if (isNaN(minutes) || minutes < 0) {
        return message.reply("Please provide a valid number of minutes.");
      }
      const stats = loadStats(LATE_FILE);

        if (!stats[name]) {
        stats[name] = {
          totalMinutesLate: minutes,
          lateCount: 1
        };
      } else {
        stats[name].totalMinutesLate += minutes;
        stats[name].lateCount += 1;
      }

      saveStats(stats, LATE_FILE);

      return message.reply('Permanent record updated.');
    }
    else if (args.length === 1) {
      const name = args[0];
      const stats = loadStats(LATE_FILE);

      if (stats[name]) {
        const totalMinutesLate = stats[name].totalMinutesLate;
        const lateCount = stats[name].lateCount;
        return message.reply(`${name} has been late a total of ${totalMinutesLate} minutes over ${lateCount} instances.`);
      } else {
        return message.reply(`${name} has no late records.`);
      }
    } else {
      return message.reply("Usage: !tlate <name> <minutes> or !tlate <name>");
    }
  }
  else if (message.content.startsWith("!tchat")){
    const args = message.content.match(/"([^"]+)"\s+(\d{17,19})/);

    if (!args) {
      return message.channel.send('❌ Usage: !tchat "your message here" userId');
    }

    const [, text, userId] = args;

    try {
      const user = await client.users.fetch(userId);
      await user.send(text);
      message.channel.send(`✅ Sent message to <@${userId}>`);
    } catch (err) {
      console.error('Failed to send message:', err);
      message.channel.send('❌ Could not send the message. Check the ID and try again.');
    }
  }
});

const friendlyMessages = [
  "Good morning!",
  "Hello!"
]

cron.schedule('0 8 * * *', async () => {
  try {
    const user = await client.users.fetch("912433098556321793"); //Discord ID
    if (user) {
      await user.send(friendlyMessages[Math.floor(Math.random() * friendlyMessages.length)]);
      console.log('Reminder sent at 8AM');
    }
  } catch (err) {
    console.error("Failed to send reminder:", err);
  }
}, {
  timezone: "America/Chicago"
});

cron.schedule('0 8 16 * *', async () => {
  const userIds = ["912433098556321793", "704084774968492083"];

  for (const id of userIds) {
    try {
      const user = await client.users.fetch(id);
      if (user) {
        await user.send("Good morning! It's your anniversary!");
        console.log(`Reminder sent to ${id} at 8AM`);
      }
    } catch (err) {
      console.error(`Failed to send reminder to ${id}:`, err);
    }
  }
}, {
  timezone: "America/Chicago"
});

// Notify guilds on shutdown
async function notifyShutdown(client) {
  for (const [, guild] of client.guilds.cache) {
    const channel = guild.channels.cache.find(
      (ch) =>
        ch.isTextBased() &&
        ch.permissionsFor(guild.members.me).has('SendMessages') &&
        ch.name === 'trevorbot-testing' // Will only send in this channel
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

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Notifying guilds...');
  await notifyShutdown(client);
  console.log('Shutdown notifications sent. Logging out...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Notifying guilds...');
  await notifyShutdown(client);
  console.log('Shutdown notifications sent. Logging out...');
  await client.destroy();
  process.exit(0);
});
