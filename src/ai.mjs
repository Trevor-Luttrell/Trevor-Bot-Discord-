import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function handleAiResponse(message, client) {
  const botMention = `<@${client.user.id}>`;
  const lowerMessage = message.content.toLowerCase();
  
  const isPinged = message.content.includes(botMention);
  const isNamed = lowerMessage.includes('trevorbot') || lowerMessage.startsWith('hey trevor');

  if (!isPinged && !isNamed) return;

  let cleanPrompt = message.content.replace(botMention, '').trim();

  if (!cleanPrompt) {
    return message.reply("Yeah? What's up?");
  }

  try {
    await message.channel.sendTyping();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: cleanPrompt,
      config: {
        systemInstruction: "You are TrevorBot, a helpful AI companion in a Discord server. You are going to mimic the linguistic style of Jarvis. Keep responses concise and natural for a chatroom."
      }
    });

    await message.reply(response.text);
  } catch (error) {
    console.error('AI Generation Error:', error);
    await message.reply("Sorry, my brain short-circuited trying to think of a response.");
  }
}