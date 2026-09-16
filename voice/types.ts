import { JarvisCore, JarvisResponse } from '../core/assistant/jarvis-core.js';

export interface AudioChunk {
  data: Buffer | Uint8Array;
  sampleRate: number;
  channels: number;
}

export interface SpeechToTextProvider {
  id: string;
  name: string; // e.g. 'faster-whisper'
  transcribe(audio: AudioChunk): Promise<string>;
}

export interface TextToSpeechProvider {
  id: string;
  name: string; // e.g. 'piper'
  synthesize(text: string, voiceId?: string): Promise<AudioChunk>;
}

export class VoiceSession {
  private stt: SpeechToTextProvider;
  private tts: TextToSpeechProvider;
  private core: JarvisCore;
  private conversationId: string;
  private userId: string;

  constructor(
    stt: SpeechToTextProvider,
    tts: TextToSpeechProvider,
    core: JarvisCore,
    userId: string = 'usr_default',
    conversationId: string = 'conv_voice_session'
  ) {
    this.stt = stt;
    this.tts = tts;
    this.core = core;
    this.userId = userId;
    this.conversationId = conversationId;
  }

  public async handleSpokenInput(audio: AudioChunk): Promise<{
    transcription: string;
    assistantResponse: JarvisResponse;
    audioOutput: AudioChunk;
  }> {
    // 1. STT (faster-whisper)
    const transcription = await this.stt.transcribe(audio);

    // 2. JARVIS Core Cognition (unified core)
    const assistantResponse = await this.core.process({
      query: transcription,
      userId: this.userId,
      conversationId: this.conversationId
    });

    // 3. TTS (Piper)
    const audioOutput = await this.tts.synthesize(assistantResponse.content);

    return {
      transcription,
      assistantResponse,
      audioOutput
    };
  }
}
