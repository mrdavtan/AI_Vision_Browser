const openai = new OpenAI();

import OpenAI from "openai";
export async function handleOpenAIInteraction(messages) {
const openai = new OpenAI();

import OpenAI from "openai";
export async function handleOpenAIInteraction(messages) {
export async function handleOpenAIInteraction(messages) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    max_tokens: 1024,
    //seed: 665234,
    messages: messages,
  });

  return response.choices[0].message;
}
