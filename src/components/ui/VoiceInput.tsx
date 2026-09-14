import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { startListening, isSpeechRecognitionSupported } from '@/lib/voice';
import type { LanguageCode } from '@/types';

interface VoiceInputProps {
  value: string;
  onChange: (text: string) => void;
  language?: LanguageCode;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

export function VoiceInput({
  value,
  onChange,
  language = 'en',
  placeholder = 'Type or tap the mic to speak...',
  className = '',
  multiline = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const supported = isSpeechRecognitionSupported();

  const handleStart = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    setIsListening(true);
    recognitionRef.current = startListening(
      language,
      (text) => {
        onChange(text);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleStop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2 items-end">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-lg"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
          />
        )}
        {supported && (
          <button
            type="button"
            onClick={isListening ? handleStop : handleStart}
            className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/20'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? <Square size={22} /> : <Mic size={24} />}
          </button>
        )}
      </div>
      {!supported && (
        <p className="text-xs text-stone-400 mt-1">
          Voice input not available in this browser. You can type instead.
        </p>
      )}
      {isListening && (
        <p className="text-sm text-red-500 mt-2 flex items-center gap-1.5">
          <MicOff size={14} /> Listening... Tap the square to stop.
        </p>
      )}
    </div>
  );
}
