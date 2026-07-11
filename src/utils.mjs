import fs from 'fs';
import play from 'play-dl';
import { createAudioPlayer, createAudioResource, entersState, AudioPlayerStatus, VoiceConnectionStatus, StreamType } from '@discordjs/voice';

export function loadStats(STATS_FILE) {
  try {
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading stats file:', error);
    return {};
  }
}

export function saveStats(stats, STATS_FILE) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error writing stats file:', error);
  }
}

export async function playAudio(url, connection, message) {
  try {
    // 1. Clean up the URL just in case Discord added markdown brackets < >
    let cleanUrl = url.trim().replace(/[<>]/g, '');

    // 2. DEBUG LOG: Let's see exactly what the string looks like in PM2
    console.log("--- DEBUG: Attempting to play URL ---");
    console.log(`Raw URL received: "${url}"`);
    console.log(`Cleaned URL being passed: "${cleanUrl}"`);
    console.log("--------------------------------------");

    const stream = await play.stream(cleanUrl, { quality: 2 });

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type || StreamType.Arbitrary,
      metadata: { title: cleanUrl }
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
    message.channel.send(`Now playing: ${cleanUrl}`);
  } catch (error) {
    console.error("Playback error details:", error);
    message.channel.send("Could not play audio.");
  }
}