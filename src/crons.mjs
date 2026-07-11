import cron from 'node-cron';
import { loadStats, saveStats } from './utils.mjs';

const DAILY_STATE_FILE = './json/daily_state.json';

const friendlyMessages = ["Good morning!", "Hello!"];

const kindMessages = [
  "Just a reminder that you are capable of amazing things! Have a wonderful day.",
  "Take a deep breath. You're doing better than you think you are.",
  "In case no one told you today: you matter, and your efforts are appreciated.",
  "Be kind to yourself today. You deserve the same grace you give to others."
];

// Handles the persistent daily kind message tracking
export async function checkAndSendDailyMessage(client) {
  const state = loadStats(DAILY_STATE_FILE);
  if (!state.nextMessageIndex) state.nextMessageIndex = 0;
  
  const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' });

  if (state.lastSentDate === todayStr) return;

  console.log("Checking channels for scheduled daily message...");
  
  const targetUserIds = [
    "704084774968492083"
  ];
  
  let messageDispatched = false;
  const messageText = kindMessages[state.nextMessageIndex];

  for (const id of targetUserIds) {
    try {
      const user = await client.users.fetch(id);
      if (user) {
        await user.send(messageText);
        console.log(`Daily kind message successfully DM'd to ${id}`);
        messageDispatched = true;
      }
    } catch (err) {
      console.error(`Failed to send daily kind message DM to user ${id}:`, err);
    }
  }

  if (messageDispatched) {
    state.lastSentDate = todayStr;
    state.nextMessageIndex = (state.nextMessageIndex + 1) % kindMessages.length;
    saveStats(state, DAILY_STATE_FILE);
  }
}

// Handles the protected anniversary dispatch (runs only on the 16th of any month)
export async function checkAndSendAnniversaryMessage(client) {
  const chicagoTime = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const chicagoDateObj = new Date(chicagoTime);
  
  // Rule: Abort immediately if today isn't the 16th
  if (chicagoDateObj.getDate() !== 16) return;

  const todayStr = chicagoDateObj.toLocaleDateString('en-US');
  const state = loadStats(DAILY_STATE_FILE);

  // Safety Lock: Abort if it already fired today
  if (state.lastAnniversarySentDate === todayStr) return;

  console.log("Processing anniversary alerts...");
  const userIds = ["912433098556321793", "704084774968492083"];
  let dispatchSuccess = false;

  for (const id of userIds) {
    try {
      const user = await client.users.fetch(id);
      if (user) {
        await user.send("Good morning! It's your anniversary!");
        console.log(`Anniversary reminder sent to ${id}`);
        dispatchSuccess = true;
      }
    } catch (err) {
      console.error(`Failed to send anniversary reminder to ${id}:`, err);
    }
  }

  // Update state so it can't execute again today
  if (dispatchSuccess) {
    state.lastAnniversarySentDate = todayStr;
    saveStats(state, DAILY_STATE_FILE);
  }
}

export function initScheduler(client) {
  const options = { timezone: "America/Chicago" };
  
  // Protected Anniversary text - runs daily at 8AM but checks constraints inside
  cron.schedule('0 8 * * *', async () => {
    await checkAndSendAnniversaryMessage(client);
  }, options);

  // Standard Scheduled Daily Kind Messages Check
  cron.schedule('0 8 * * *', async () => {
    await checkAndSendDailyMessage(client);
  }, options);
}