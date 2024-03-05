import OpenAI from "openai";

const openai = new OpenAI();

export async function handleOpenAIInteraction(messages) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    max_tokens: 1024,
    //seed: 665234,
    messages: messages,
  });

  const message_text = response.choices[0].message;
  return message_text;
}
