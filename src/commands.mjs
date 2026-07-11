import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import play from 'play-dl';
import { loadStats, saveStats, playAudio } from './utils.mjs';

const CAT_FILE = './json/cat.json';
const LATE_FILE = './json/late.json';

const catImages = [
  "https://pethelpful.com/.image/w_750,q_auto:good,c_fill,ar_4:3/MTk2NzY3MjA5ODc0MjY5ODI2/top-10-cutest-cat-photos-of-all-time.jpg",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyNzkzOTUy/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYzNDQ5MzEy/top-10-cutest-cat-photos-of-all-time.png",
  "https://pethelpful.com/.image/w_750,q_auto:good,c_limit/MTc0OTcwMzM5MTYyOTkwNTYw/top-10-cutest-cat-photos-of-all-time.png",
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

export async function handleTextCommands(message, client) {
  const content = message.content;

  if (content === "!tjoin") {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply("You need to be in a voice channel to use this command.");

    joinVoiceChannel({
      channelId: channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });
    return message.reply(`Joined ${channel.name}`);
  }

  if (content === "!tleave") {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      return message.reply("Left the voice channel.");
    } 
    return message.reply("I am not in a voice channel.");
  }

  if (content === "You make me happy TrevorBot") {
    return message.reply("You make me happy too! :)");
  }

  if (content === "You make me sad TrevorBot") {
    return message.reply("I am a construct of your own disappointment.");
  }

  if (content === "!cat") {
    const userId = message.author.id;
    const username = message.author.username;
    const stats = loadStats(CAT_FILE);

    if (!stats[userId]) {
      stats[userId] = { username, catViewCount: 1 };
    } else {
      stats[userId].catViewCount += 1;
    }

    saveStats(stats, CAT_FILE);
    const imageUrl = catImages[Math.floor(Math.random() * catImages.length)];
    return message.channel.send({ files: [imageUrl] });
  }

  if (content === "!catlevel") {
    const userId = message.author.id;
    const stats = loadStats(CAT_FILE);
    if (stats[userId]) {
      return message.reply(`You've viewed ${stats[userId].catViewCount} cat photo(s)!`);
    }
    return message.reply(`You haven't viewed any cat photos yet! Try using \`!cat\``);
  }

  if (content === "!thelp") {
    return message.reply("Available commands: `!tjoin`, `!tleave`, `!cat`, `!catlevel`, `!tlate <name> <minutes>`, `!tlate <name>`, `!tchat \"message\" userId`");
  }

  if (content.startsWith('!tplay')) {
    const args = content.split(' ').slice(1);
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
    if (play.yt_validate(query) === 'video') {
      url = query;
    } else {
      const results = await play.search(query, { limit: 1 });
      if (results.length === 0) return message.reply("No results found!");
      url = results[0].url;
    }
    await playAudio(url, connection, message);
  }

  if (content.startsWith("!tlate")) {
    const args = content.split(' ').slice(1);
    if (args.length === 2) {
      const name = args[0];
      const minutes = parseInt(args[1]);
      if (isNaN(minutes) || minutes < 0) return message.reply("Please provide a valid number of minutes.");
      
      const stats = loadStats(LATE_FILE);
      if (!stats[name]) {
        stats[name] = { totalMinutesLate: minutes, lateCount: 1 };
      } else {
        stats[name].totalMinutesLate += minutes;
        stats[name].lateCount += 1;
      }
      saveStats(stats, LATE_FILE);
      return message.reply('Permanent record updated.');
    }
    
    if (args.length === 1) {
      const name = args[0];
      const stats = loadStats(LATE_FILE);
      if (stats[name]) {
        return message.reply(`${name} has been late a total of ${stats[name].totalMinutesLate} minutes over ${stats[name].lateCount} instances.`);
      }
      return message.reply(`${name} has no late records.`);
    }
    return message.reply("Usage: !tlate <name> <minutes> or !tlate <name>");
  }

  if (content.startsWith("!tchat")) {
    const args = content.match(/"([^"]+)"\s+(\d{17,19})/);
    if (!args) return message.channel.send('❌ Usage: !tchat "your message here" userId');

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
}