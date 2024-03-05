import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function handleOpenAIInteraction(messages) {
  const response = await openai.createChatCompletion({
    model: "gpt-4-vision-preview",
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function handleOpenAIInteraction(messages) {
  const response = await openai.createChatCompletion({
    model: "gpt-4-vision-preview",
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
export async function handleOpenAIInteraction(messages) {
  const response = await openai.createChatCompletion({
    model: "gpt-4-vision-preview",
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    max_tokens: 1024,
    //seed: 665234,
    messages: messages,
  });

  return response.choices[0].message;
}
