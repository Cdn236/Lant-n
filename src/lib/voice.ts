import type { LanguageCode } from '@/types';

/* ------------------------------------------------------------------ *
 * Voice & audio service for Lantèn.
 *
 * Native speech (Web Speech API) is the built-in fallback, but it only
 * ships English voices on most devices, so switching to a Ugandan language
 * (Luganda, Ateso, Runyankole, Luo...) used to output English.
 *
 * To make the selected language model actually speak/understand the chosen
 * language, this service integrates the SUNBIRD AI API
 * (https://api.sunbird.ai) — a Ugandan-built platform with real translation,
 * text-to-speech and speech-to-text models for local Ugandan languages.
 *
 *   - Translation    : POST /tasks/translate
 *   - Text-to-speech : POST /tasks/audio/speech   (returns a signed audio URL)
 *   - Speech-to-text : POST /tasks/audio/transcriptions (multipart audio upload)
 *
 * Set VITE_SUNBIRD_API_TOKEN in your .env to enable it. When the token is
 * missing or a call fails we gracefully fall back to the native Web Speech
 * API so audio never stops working.
 * ------------------------------------------------------------------ */

const SUNBIRD_BASE = 'https://api.sunbird.ai';
const SUNBIRD_TOKEN: string = (import.meta.env.VITE_SUNBIRD_API_TOKEN as string) || '';

// BCP-47 tags used by the native Web Speech fallback.
const nativeMap: Record<LanguageCode, string> = {
  en: 'en-US',
  lug: 'lg-UG',
  nyn: 'nyn-UG',
  ate: 'teo-UG',
  luo: 'ach-UG',
};

// Sunbird AI language codes (ISO 639-3) used by the translate / TTS / STT
// endpoints. Luo has no dedicated Sunbird model, so we use Acholi (ach) as the
// closest local voice. `voice` is an optional Orpheus speaker catalog tag
// (e.g. "salt_lug_0001"); when it is omitted/null, the TTS API automatically
// picks a speaker that matches the requested `language`, which is exactly what
// we rely on so the engine always speaks the user's selected language.
export const SUNBIRD_LANG: Record<LanguageCode, { code: string; voice: string | null }> = {
  en: { code: 'eng', voice: null },
  lug: { code: 'lug', voice: null }, // Luganda
  nyn: { code: 'nyn', voice: null }, // Runyankole
  ate: { code: 'teo', voice: null }, // Ateso
  luo: { code: 'ach', voice: null }, // Acholi — closest Luo model
};

export function isSunbirdConfigured(): boolean {
  return SUNBIRD_TOKEN.length > 0;
}

/* ------------------------------------------------------------------ *
 * Global voice on/off toggle (persisted between sessions).
 * ------------------------------------------------------------------ */
const STORAGE_KEY = 'lanten_voice_enabled';

export function getVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === '1';
}

export function setVoiceEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  if (!enabled) {
    // Immediately silence any audio currently playing.
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      playingRemote = false;
    }
  }
  voiceListeners.forEach((l) => l());
}

export function isVoiceEnabled(): boolean {
  return getVoiceEnabled();
}

// Reactive subscription so components (header toggle, settings toggle) stay in
// sync with the persisted value even when changed from another component.
const voiceListeners = new Set<() => void>();

export function subscribeVoiceEnabled(listener: () => void): () => void {
  voiceListeners.add(listener);
  return () => {
    voiceListeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ *
 * Remote audio player (used by Sunbird TTS).
 * ------------------------------------------------------------------ */
let audioEl: HTMLAudioElement | null = null;
let playingRemote = false;

function getAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.onplaying = () => { playingRemote = true; };
    audioEl.onended = () => { playingRemote = false; };
    audioEl.onpause = () => { playingRemote = false; };
    audioEl.onerror = () => { playingRemote = false; };
  }
  return audioEl;
}

function playRemoteAudio(url: string): void {
  const el = getAudioEl();
  el.src = url;
  void el.play();
}

/* ------------------------------------------------------------------ *
 * Native Web Speech helpers.
 * ------------------------------------------------------------------ */
function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices() || [];
}

function pickVoice(voices: SpeechSynthesisVoice[], target: string) {
  const base = target.split('-')[0].toLowerCase();
  const find = (pred: (v: SpeechSynthesisVoice) => boolean) =>
    voices.find(pred) || null;
  return (
    find((v) => v.lang.toLowerCase() === target.toLowerCase()) ||
    find((v) => v.lang.toLowerCase().startsWith(`${base}-`)) ||
    find((v) => v.lang.toLowerCase() === base) ||
    null
  );
}

function nativeSpeak(text: string, lang: LanguageCode = 'en'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!getVoiceEnabled()) return;
  const voices = getVoices();
  const target = nativeMap[lang] || 'en-US';
  const voice = pickVoice(voices, target);

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice ? voice.lang : target;
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function nativeStopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function isNativeSpeaking(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    window.speechSynthesis.speaking
  );
}

export function stopSpeaking(): void {
  nativeStopSpeaking();
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
    playingRemote = false;
  }
}

export function isSpeaking(): boolean {
  return isNativeSpeaking() || playingRemote;
}

/* ------------------------------------------------------------------ *
 * speak(text, lang)
 * Uses Sunbird TTS when a local Ugandan language is selected and a token
 * exists, otherwise falls back to the native Web Speech API.
 * ------------------------------------------------------------------ */
export async function speakWithSunbird(
  text: string,
  lang: LanguageCode = 'en'
): Promise<boolean> {
  // English is handled by the native browser engine for best support.
  if (!isSunbirdConfigured() || !getVoiceEnabled() || lang === 'en') return false;
  const map = SUNBIRD_LANG[lang];
  if (!map) return false;

  try {
    const res = await fetch(`${SUNBIRD_BASE}/tasks/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUNBIRD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // Send the ISO 639-3 language explicitly so the TTS model synthesizes in
      // the exact language the user selected. Omit `voice` so the API selects a
      // speaker that matches `language` (guarantees the correct local voice).
      body: JSON.stringify({
        text,
        language: map.code,
        ...(map.voice ? { voice: map.voice } : {}),
        response_mode: 'url',
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const url = data?.audio_url;
    if (url) {
      playRemoteAudio(url);
      return true;
    }
  } catch (err) {
    console.error('Sunbird TTS failed, falling back to native speech:', err);
  }
  return false;
}

export function speak(text: string, lang: LanguageCode = 'en'): void {
  if (!getVoiceEnabled()) {
    nativeStopSpeaking();
    return;
  }
  if (audioEl && playingRemote) {
    audioEl.pause();
    audioEl.currentTime = 0;
    playingRemote = false;
  }
  // TTS-only: speak the given text as-is in the selected language.
  // (Use speakTranslated() when the text is English and should be translated.)
  void speakWithSunbird(text, lang).then((usedSunbird) => {
    if (!usedSunbird) nativeSpeak(text, lang);
  });
}

/**
 * Translate an English phrase to the selected language, then speak it in that
 * language (so the audio is in the user's chosen language, not English).
 */
export function speakTranslated(englishText: string, lang: LanguageCode = 'en'): void {
  if (!getVoiceEnabled()) {
    nativeStopSpeaking();
    return;
  }
  if (lang === 'en') {
    speak(englishText, 'en');
    return;
  }
  void translateText(englishText, 'en', lang).then((translated) => {
    speak(translated || englishText, lang);
  });
}

export function speakNow(text: string, lang: LanguageCode = 'en'): void {
  speak(text, lang);
}

/* ------------------------------------------------------------------ *
 * Translation via Sunbird (Sunflower model).
 * ------------------------------------------------------------------ */
// Simple in-memory cache so frequently repeated strings (voice summaries,
// spoken prompts) resolve instantly on subsequent requests instead of waiting
// on the network each time — making translations feel as fast as English.
const translationCache = new Map<string, string>();

export async function translateText(
  text: string,
  source: LanguageCode,
  target: LanguageCode
): Promise<string> {
  if (!isSunbirdConfigured()) return text;
  const src = SUNBIRD_LANG[source]?.code ?? 'eng';
  const tgt = SUNBIRD_LANG[target]?.code ?? 'eng';
  if (src === tgt) return text;

  const cacheKey = `${tgt}|${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${SUNBIRD_BASE}/tasks/translate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUNBIRD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, source_language: src, target_language: tgt }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    // Workers may return the translation in `output.translated_text` or
    // `output.text`, so accept either.
    const out = data?.output;
    const translated = out?.translated_text || out?.text || '';
    if (translated) translationCache.set(cacheKey, translated);
    return translated || text;
  } catch (err) {
    console.error('Sunbird translation failed:', err);
    return text;
  }
}

export function startListening(
  lang: LanguageCode = 'en',
  onResult: (text: string) => void,
  onEnd?: () => void
): { stop: () => void } {
  if (isSunbirdConfigured() && lang !== 'en') {
    return sunbirdStartListening(lang, onResult, onEnd);
  }
  return nativeStartListening(lang, onResult, onEnd);
}

function nativeStartListening(
  lang: LanguageCode = 'en',
  onResult: (text: string) => void,
  onEnd?: () => void
): { stop: () => void } {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onResult('');
    onEnd?.();
    return { stop: () => {} };
  }

  let recognition: any;
  let finalTranscript = '';
  let shouldStop = false;

  const build = (recLang: string) => {
    const rec = new SpeechRecognition();
    rec.lang = recLang;
    rec.continuous = false;
    rec.interimResults = true;
    return rec;
  };

  const startRec = (recLang: string) => {
    recognition = build(recLang);

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      onResult(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      if (event && event.error && recLang !== 'en-US') {
        console.warn('Falling back to English speech recognition:', event.error);
        startRec('en-US');
      } else if (event?.error) {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (!shouldStop) onEnd?.();
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to start:', err);
      if (recLang !== 'en-US') {
        startRec('en-US');
      } else {
        onEnd?.();
      }
    }
  };

  startRec(nativeMap[lang] || 'en-US');

  return {
    stop: () => {
      shouldStop = true;
      recognition?.stop();
    },
  };
}

function sunbirdStartListening(
  lang: LanguageCode,
  onResult: (text: string) => void,
  onEnd?: () => void
): { stop: () => void } {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let finished = false;

  let stop = () => {};

  const finish = (text: string) => {
    if (finished) return;
    finished = true;
    onResult(text);
    onEnd?.();
  };

  const cleanup = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    mediaRecorder = null;
  };

  const startCapture = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      finish('');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType: string | undefined;
      if (typeof MediaRecorder !== 'undefined') {
        const candidates = ['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav'];
        mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t));
      }
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/mp4' });
        cleanup();
        if (finished) return;
        const transcript = await sunbirdTranscribe(blob, lang);
        finish(transcript);
      };
      mediaRecorder.start();
    } catch (err) {
      console.error('Could not access microphone for Sunbird STT:', err);
      // Graceful fallback to the native recognizer.
      const native = nativeStartListening(lang, onResult, onEnd);
      stop = native.stop;
    }
  };

  stop = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      return; // finish() is invoked from onstop.
    }
    finish('');
  };

  void startCapture();

  return { stop };
}

async function sunbirdTranscribe(blob: Blob, lang: LanguageCode): Promise<string> {
  const code = SUNBIRD_LANG[lang]?.code ?? 'eng';
  try {
    const fd = new FormData();
    fd.append('audio', blob, 'recording.mp3');
    fd.append('language', code);
    const res = await fetch(`${SUNBIRD_BASE}/tasks/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUNBIRD_TOKEN}` },
      body: fd,
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data?.audio_transcription || '';
  } catch (err) {
    console.error('Sunbird STT failed:', err);
    return '';
  }
}

/* ------------------------------------------------------------------ *
 * Feature detection.
 * ------------------------------------------------------------------ */
export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    (!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ||
      isSunbirdConfigured())
  );
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('speechSynthesis' in window || isSunbirdConfigured())
  );
}
