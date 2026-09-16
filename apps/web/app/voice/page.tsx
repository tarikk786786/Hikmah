'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Radio, Sparkles } from 'lucide-react';

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const toggleListening = () => {
    if (!listening) {
      setListening(true);
      setTranscript('Listening for operator audio stream (faster-whisper VAD)...');
      setTimeout(() => {
        setTranscript('"JARVIS, summarize current memory store status."');
        setResponse('Operating at nominal efficiency, sir. All vectors indexed across short-term and persistent long-term storage.');
        setListening(false);
      }, 3000);
    } else {
      setListening(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-center flex flex-col items-center justify-center min-h-[80vh]">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center justify-center space-x-3">
          <Mic className="w-6 h-6 text-[#00F0FF]" />
          <span>J.A.R.V.I.S. VOICE INTERFACE</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          faster-whisper STT • Piper TTS • LiveKit WebRTC Session Harness
        </p>
      </div>

      {/* Voice Visualizer Orb */}
      <div className="relative my-8 flex items-center justify-center">
        <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 ${
          listening
            ? 'bg-[#00F0FF]/20 border-2 border-[#00F0FF] shadow-[0_0_50px_#00F0FF]'
            : 'bg-[#111827] border border-[#1E293B]'
        }`}>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
            listening ? 'bg-[#00F0FF]/30 animate-pulse' : 'bg-[#0E1522]'
          }`}>
            {listening ? (
              <Radio className="w-12 h-12 text-[#00F0FF] animate-spin" />
            ) : (
              <Mic className="w-12 h-12 text-[#64748B]" />
            )}
          </div>
        </div>
      </div>

      {/* Control Button */}
      <button
        onClick={toggleListening}
        className={`px-8 py-3.5 rounded-full font-mono text-xs font-bold transition flex items-center space-x-2 ${
          listening
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]'
            : 'bg-[#00F0FF] hover:bg-[#00D0DF] text-[#0B0F17] shadow-[0_0_20px_rgba(0,240,255,0.3)]'
        }`}
      >
        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        <span>{listening ? 'STOP VOICE SESSION' : 'INITIALIZE VOICE SESSION'}</span>
      </button>

      {/* Spoken Transcription Card */}
      {transcript && (
        <div className="w-full max-w-xl p-5 bg-[#111827] border border-[#1E293B] rounded-xl text-left space-y-3 font-mono text-xs">
          <div className="text-[#64748B] flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>TRANSCRIBED AUDIO</span>
          </div>
          <p className="text-[#F1F5F9] font-sans text-sm">{transcript}</p>

          {response && (
            <div className="pt-3 border-t border-[#1E293B] space-y-1">
              <div className="text-[#00F0FF] flex items-center space-x-2">
                <Volume2 className="w-3.5 h-3.5" />
                <span>JARVIS SYNTHESIZED SPEECH (PIPER)</span>
              </div>
              <p className="text-[#94A3B8] font-sans text-sm">{response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
