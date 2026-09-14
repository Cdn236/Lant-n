import { useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { speak, stopSpeaking, isSpeechSynthesisSupported, isSpeaking } from '@/lib/voice';
import type { LanguageCode } from '@/types';

interface SpeakButtonProps {
  text: string;
  language?: LanguageCode;
  label?: string;
  className?: string;
}

export function SpeakButton({
  text,
  language = 'en',
  label = 'Listen',
  className = '',
}: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const supported = isSpeechSynthesisSupported();

  if (!supported) return null;

  const handleClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(text, language);
    const checkInterval = setInterval(() => {
      if (!isSpeaking()) {
        setSpeaking(false);
        clearInterval(checkInterval);
      }
    }, 200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        speaking
          ? 'bg-teal-100 text-teal-700'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      } ${className}`}
    >
      {speaking ? <Square size={16} /> : <Volume2 size={16} />}
      {speaking ? 'Stop' : label}
    </button>
  );
}
