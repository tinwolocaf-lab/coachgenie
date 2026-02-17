// Gemini 2.5 Flash Native Audio - Live Voice Session Manager
// Handles WebSocket connection, audio streaming, and session lifecycle

import { supabase } from '@/lib/supabase';
import { fetchWithRetry } from '@/lib/network';

const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
const VOICE_SESSION_CONFIG_FUNCTION = 'voice-session-config';
const VOICE_SESSION_FINALIZE_FUNCTION = 'voice-session-finalize';

export interface GeminiLiveConfig {
  model: string;
  systemInstruction: string;
  generationConfig: {
    responseModalities: string[];
    speechConfig?: {
      voiceConfig?: {
        prebuiltVoiceConfig?: {
          voiceName: string;
        };
      };
    };
  };
  outputAudioTranscription?: Record<string, unknown>;
  accessToken: string;
  voiceSessionId: string;
  tokenExpiresAt?: string;
  holdMcredits?: number;
  balanceMcreditsAfterHold?: number;
  voiceName?: string;
}

interface VoiceSessionFinalizeResponse {
  voice_session_id?: string;
  status?: string;
}

export interface VoiceSessionCallbacks {
  onAudioData?: (audioData: ArrayBuffer) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onInterrupted?: () => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onToolCall?: (toolCall: { name: string; args: Record<string, unknown> }) => void;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type GeminiLiveErrorKind =
  | 'auth'
  | 'configuration'
  | 'voice_service_unavailable'
  | 'voice_service_request_failed'
  | 'connection'
  | 'unknown';

export class GeminiLiveError extends Error {
  readonly kind: GeminiLiveErrorKind;
  readonly status?: number;
  readonly code?: string;

  constructor({
    kind,
    message,
    status,
    code,
  }: {
    kind: GeminiLiveErrorKind;
    message: string;
    status?: number;
    code?: string;
  }) {
    super(message);
    this.name = 'GeminiLiveError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

interface JsonLikeObject {
  [key: string]: unknown;
}

interface ParsedErrorPayload {
  code?: string;
  message?: string;
  error?: string;
}

function isJsonLikeObject(value: unknown): value is JsonLikeObject {
  return typeof value === 'object' && value !== null;
}

function getStringField(payload: JsonLikeObject, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function parseErrorPayload(raw: string): ParsedErrorPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isJsonLikeObject(parsed)) {
      return null;
    }

    return {
      code: getStringField(parsed, 'code'),
      message: getStringField(parsed, 'message'),
      error: getStringField(parsed, 'error'),
    };
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: ParsedErrorPayload | null, fallback: string): string {
  if (!payload) return fallback;
  return payload.message || payload.error || fallback;
}

function getFunctionsBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
  if (explicit) {
    const normalized = explicit.replace(/\/$/, '');
    if (normalized.includes('/functions/v1')) {
      return normalized;
    }
    return `${normalized}/functions/v1`;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new GeminiLiveError({
      kind: 'configuration',
      message: 'Missing EXPO_PUBLIC_SUPABASE_URL',
    });
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

function normalizeConnectionError(error: unknown): GeminiLiveError {
  if (error instanceof GeminiLiveError) {
    return error;
  }

  if (error instanceof Error) {
    return new GeminiLiveError({
      kind: 'connection',
      message: error.message || 'Failed to connect to voice service',
    });
  }

  return new GeminiLiveError({
    kind: 'unknown',
    message: 'Failed to connect to voice service',
  });
}

function toRawGeminiModelId(modelId: string): string {
  let normalized = modelId.trim();
  let changed = true;
  while (changed) {
    changed = false;
    if (normalized.startsWith('models/')) {
      normalized = normalized.slice('models/'.length);
      changed = true;
    }
    if (normalized.startsWith('google/')) {
      normalized = normalized.slice('google/'.length);
      changed = true;
    }
  }

  const aliases: Record<string, string> = {
    'gemini-2.5-flash-native-audio-preview': 'gemini-2.5-flash-native-audio-preview-12-2025',
  };

  return aliases[normalized.toLowerCase()] ?? normalized;
}

function buildSessionConfigError(status: number, rawText: string): GeminiLiveError {
  const payload = parseErrorPayload(rawText);
  const payloadCode = payload?.code?.toUpperCase();
  const payloadMessage = (payload?.message || payload?.error || rawText).toLowerCase();
  const isFunctionMissing =
    status === 404 ||
    payloadCode === 'NOT_FOUND' ||
    payloadMessage.includes('requested function was not found');

  if (isFunctionMissing) {
    return new GeminiLiveError({
      kind: 'voice_service_unavailable',
      message: 'Voice service is not available right now. Please use text mode.',
      status,
      code: payload?.code,
    });
  }

  if (payloadCode === 'VOICE_TIER_REQUIRED') {
    return new GeminiLiveError({
      kind: 'voice_service_request_failed',
      message: extractErrorMessage(
        payload,
        'Voice messages are available on Sovereign and Oracle plans.'
      ),
      status,
      code: payload?.code,
    });
  }

  if (status === 401 || status === 403) {
    return new GeminiLiveError({
      kind: 'auth',
      message: 'Your session is not authorized for voice mode. Please sign in again.',
      status,
      code: payload?.code,
    });
  }

  return new GeminiLiveError({
    kind: 'voice_service_request_failed',
    message: extractErrorMessage(payload, rawText || 'Failed to fetch voice session config'),
    status,
    code: payload?.code,
  });
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig | null = null;
  private callbacks: VoiceSessionCallbacks = {};
  private _state: ConnectionState = 'disconnected';
  private audioBuffer: Int16Array[] = [];
  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private transcript: string = '';
  private hasFinalizedSession = false;

  get state(): ConnectionState {
    return this._state;
  }

  get currentTranscript(): string {
    return this.transcript;
  }

  get voiceSessionId(): string | null {
    return this.config?.voiceSessionId ?? null;
  }

  /**
   * Fetch session config from edge function, then connect to Gemini Live API
   */
  async connect(
    coachId: string,
    sessionId: string,
    callbacks: VoiceSessionCallbacks,
    voiceName?: string,
  ): Promise<void> {
    this.callbacks = callbacks;
    this._state = 'connecting';

    try {
      // 1. Get session config from our edge function
      this.config = await this.fetchSessionConfig(coachId, sessionId, voiceName);
      this.hasFinalizedSession = false;

      // 2. Connect to Gemini Live API via WebSocket
      const wsUrl = `${GEMINI_WS_URL}?access_token=${encodeURIComponent(this.config.accessToken)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this._state = 'connected';
        this.sendSetupMessage();
        this.callbacks.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (event) => {
        console.warn('[GeminiLive] WebSocket error:', event);
        this._state = 'error';
        this.callbacks.onError?.('WebSocket connection error');
      };

      this.ws.onclose = (event) => {
        this._state = 'disconnected';
        this.stopAudioStream();
        this.callbacks.onDisconnected?.();
      };
    } catch (error) {
      this._state = 'error';
      throw normalizeConnectionError(error);
    }
  }

  /**
   * Send the initial setup message with system instruction and generation config
   */
  private sendSetupMessage(): void {
    if (!this.ws || !this.config) return;
    const rawModelId = toRawGeminiModelId(this.config.model);
    const voiceName =
      this.config.voiceName ||
      this.config.generationConfig.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
      'Kore';
    const responseModalities = this.config.generationConfig.responseModalities.length > 0
      ? this.config.generationConfig.responseModalities
      : ['AUDIO'];

    const setupMessage = {
      setup: {
        model: `models/${rawModelId}`,
        generationConfig: {
          ...this.config.generationConfig,
          responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
        outputAudioTranscription: this.config.outputAudioTranscription ?? {},
        systemInstruction: {
          parts: [{ text: this.config.systemInstruction }],
        },
        tools: this.getCoachingTools(),
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Define function calling tools available during voice coaching
   */
  private getCoachingTools(): object[] {
    return [
      {
        functionDeclarations: [
          {
            name: 'save_insight',
            description: 'Save a key insight or breakthrough from the conversation',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short title for the insight' },
                content: { type: 'string', description: 'The insight content' },
                category: { type: 'string', enum: ['mindset', 'strategy', 'productivity', 'systems', 'general'] },
              },
              required: ['title', 'content'],
            },
          },
          {
            name: 'create_action_item',
            description: 'Create an action item from the coaching conversation',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'The action item title' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
              required: ['title'],
            },
          },
          {
            name: 'get_user_schedule',
            description: 'Retrieve the user schedule and calendar events for today',
            parameters: { type: 'object', properties: {} },
          },
        ],
      },
    ];
  }

  /**
   * Handle incoming WebSocket messages from Gemini
   */
  private handleMessage(data: string | ArrayBuffer): void {
    if (data instanceof ArrayBuffer) {
      // Binary audio data from Gemini
      this.callbacks.onAudioData?.(data);
      return;
    }

    try {
      const message = JSON.parse(data as string);

      // Setup complete acknowledgment
      if (message.setupComplete) {
        return;
      }

      // Server content (text or audio response)
      if (message.serverContent) {
        const content = message.serverContent;

        if (content.interrupted) {
          this.callbacks.onInterrupted?.();
          return;
        }

        if (typeof content.outputTranscription?.text === 'string' && content.outputTranscription.text.length > 0) {
          this.transcript += content.outputTranscription.text;
          this.callbacks.onTranscript?.(content.outputTranscription.text, false);
        }

        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.text) {
              this.transcript += part.text;
              this.callbacks.onTranscript?.(part.text, false);
            }
            if (part.inlineData?.data) {
              // Decode base64 audio and pass to callback
              const binaryString = atob(part.inlineData.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              this.callbacks.onAudioData?.(bytes.buffer);
            }
          }
        }

        if (content.turnComplete) {
          this.callbacks.onTranscript?.(this.transcript, true);
        }
      }

      // Tool call from Gemini
      if (message.toolCall) {
        for (const call of message.toolCall.functionCalls || []) {
          this.callbacks.onToolCall?.({
            name: call.name,
            args: call.args || {},
          });
          // Auto-respond to tool calls
          this.respondToToolCall(call);
        }
      }
    } catch (error) {
      console.warn('[GeminiLive] Error parsing message:', error);
    }
  }

  /**
   * Auto-respond to tool calls from the AI
   */
  private async respondToToolCall(call: { id?: string; name: string; args?: Record<string, unknown> }): Promise<void> {
    let result: Record<string, unknown> = { success: true };

    // For now, acknowledge tool calls - full implementation can be added later
    if (call.name === 'save_insight') {
      result = { success: true, message: 'Insight saved successfully' };
    } else if (call.name === 'create_action_item') {
      result = { success: true, message: 'Action item created' };
    } else if (call.name === 'get_user_schedule') {
      result = { success: true, events: [], message: 'Schedule retrieved' };
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        toolResponse: {
          functionResponses: [{
            id: call.id || 'default',
            name: call.name,
            response: result,
          }],
        },
      }));
    }
  }

  /**
   * Send audio data to Gemini (PCM 16-bit, 16kHz, mono)
   */
  sendAudio(pcmData: Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Buffer audio for batched sending (~0.5s chunks to avoid bridge overload)
    this.audioBuffer.push(pcmData);

    if (!this.sendInterval) {
      this.sendInterval = setInterval(() => {
        this.flushAudioBuffer();
      }, 500); // Send every 500ms
    }
  }

  /**
   * Flush buffered audio to WebSocket
   */
  private flushAudioBuffer(): void {
    if (this.audioBuffer.length === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Merge all buffered audio chunks
    const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioBuffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.audioBuffer = [];

    // Convert to base64 for JSON transport
    const uint8 = new Uint8Array(merged.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Audio = btoa(binary);

    const message = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio,
        },
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send a text message during voice session
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }],
        }],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Stop streaming audio
   */
  stopAudioStream(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    this.flushAudioBuffer();
  }

  /**
   * Finalize backend voice session billing and release unused hold.
   */
  async finalizeSession(durationSeconds: number): Promise<VoiceSessionFinalizeResponse | null> {
    const voiceSessionId = this.config?.voiceSessionId;
    if (!voiceSessionId || this.hasFinalizedSession) {
      return null;
    }

    this.hasFinalizedSession = true;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        return null;
      }

      const baseUrl = getFunctionsBaseUrl();
      const response = await fetchWithRetry(
        `${baseUrl}/${VOICE_SESSION_FINALIZE_FUNCTION}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            voice_session_id: voiceSessionId,
            duration_seconds: Math.max(1, Math.round(durationSeconds)),
          }),
        },
        { timeoutMs: 30_000 }
      );

      if (!response.ok) {
        const text = await response.text();
        console.warn('[GeminiLive] Failed to finalize voice session:', text);
        return null;
      }

      return (await response.json()) as VoiceSessionFinalizeResponse;
    } catch (error) {
      console.warn('[GeminiLive] Voice session finalize error:', error);
      return null;
    }
  }

  /**
   * Disconnect from Gemini Live API
   */
  disconnect(): void {
    this.stopAudioStream();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._state = 'disconnected';
    this.transcript = '';
    this.config = null;
    this.hasFinalizedSession = false;
  }

  /**
   * Fetch session configuration from our edge function
   */
  private async fetchSessionConfig(
    coachId: string,
    sessionId: string,
    voiceName?: string,
  ): Promise<GeminiLiveConfig> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new GeminiLiveError({
        kind: 'auth',
        message: 'Not authenticated',
      });
    }

    const baseUrl = getFunctionsBaseUrl();
    const response = await fetchWithRetry(
      `${baseUrl}/${VOICE_SESSION_CONFIG_FUNCTION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coach_id: coachId,
          session_id: sessionId,
          voiceName: voiceName || 'Kore',
        }),
      },
      { timeoutMs: 30_000 }
    );

    if (!response.ok) {
      const text = await response.text();
      throw buildSessionConfigError(response.status, text);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
    const voiceSessionId = typeof payload.voice_session_id === 'string' ? payload.voice_session_id : '';

    if (!accessToken || !voiceSessionId) {
      throw new GeminiLiveError({
        kind: 'voice_service_request_failed',
        message: 'Voice service returned an incomplete session config.',
      });
    }

    const generationConfig =
      payload.generationConfig && typeof payload.generationConfig === 'object'
        ? (payload.generationConfig as GeminiLiveConfig['generationConfig'])
        : {
            responseModalities: ['AUDIO'],
          };

    const outputAudioTranscription =
      payload.outputAudioTranscription && typeof payload.outputAudioTranscription === 'object'
        ? (payload.outputAudioTranscription as Record<string, unknown>)
        : {};

    const rawModelId = typeof payload.model === 'string'
      ? toRawGeminiModelId(payload.model)
      : 'gemini-2.5-flash-native-audio-preview-12-2025';

    return {
      model: rawModelId,
      systemInstruction:
        typeof payload.systemInstruction === 'string' ? payload.systemInstruction : 'You are a helpful coaching assistant.',
      generationConfig,
      outputAudioTranscription,
      accessToken,
      voiceSessionId,
      tokenExpiresAt: typeof payload.token_expires_at === 'string' ? payload.token_expires_at : undefined,
      holdMcredits: typeof payload.hold_mcredits === 'number' ? payload.hold_mcredits : undefined,
      balanceMcreditsAfterHold:
        typeof payload.balance_mcredits_after_hold === 'number' ? payload.balance_mcredits_after_hold : undefined,
      voiceName: typeof payload.voiceName === 'string' ? payload.voiceName : voiceName,
    };
  }
}

// Singleton instance for easy access
let _instance: GeminiLiveSession | null = null;

export function getGeminiLiveSession(): GeminiLiveSession {
  if (!_instance) {
    _instance = new GeminiLiveSession();
  }
  return _instance;
}

// Available Gemini HD voices
export const GEMINI_VOICES = [
  { id: 'Kore', name: 'Kore', description: 'Calm and clear', gender: 'female' },
  { id: 'Charon', name: 'Charon', description: 'Deep and warm', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong and confident', gender: 'male' },
  { id: 'Aoede', name: 'Aoede', description: 'Gentle and soothing', gender: 'female' },
  { id: 'Puck', name: 'Puck', description: 'Energetic and bright', gender: 'male' },
  { id: 'Leda', name: 'Leda', description: 'Warm and nurturing', gender: 'female' },
  { id: 'Orus', name: 'Orus', description: 'Steady and reassuring', gender: 'male' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Light and uplifting', gender: 'female' },
] as const;

export type GeminiVoiceId = typeof GEMINI_VOICES[number]['id'];
