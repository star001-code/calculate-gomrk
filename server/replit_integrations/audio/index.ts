export { registerAudioRoutes } from "./routes";
export {
  openai,
  getOpenAIClient,
  detectAudioFormat,
  convertToWav,
  ensureCompatibleFormat,
  type AudioFormat,
  voiceChat,
  voiceChatStream,
  textToSpeech,
  textToSpeechStream,
  speechToText,
  speechToTextStream,
} from "./client";
