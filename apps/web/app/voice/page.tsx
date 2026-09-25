'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Radio, Sparkles } from 'lucide-react';

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const toggleListening = async () => {
    if (!listening) {
      setListening(true);
      setTranscript('Listening for operator audio stream (WebRTC)...');
      setResponse('');
      
      // Simulate speech delay then API call
      setTimeout(async () => {
        const fakeUserSpeech = "Hikmah, check system status.";
        setTranscript(`"${fakeUserSpeech}"`);
        
        try {
          const res = await fetch('/api/paios/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: fakeUserSpeech })
          });
          const data = await res.json();
          if (data.success) {
            setResponse(data.result.output);
          } else {
            setResponse('Error accessing Kernel.');
          }
        } catch (e) {
          setResponse('Network failure.');
        } finally {
          setListening(false);
        }
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
          <span>HIKMAH VOICE INTERFACE</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          PAIOSKernel Integration • Live Audio Synthesis Stream
        </p>
      </div>

      {/* Working Voice Wave Animation */}
      <div className="relative my-12 h-32 flex items-center justify-center">
        {listening ? (
          <div className="flex items-center justify-center space-x-2">
            {[...Array(9)].map((_, i) => (
              <div 
                key={i} 
                className="w-2 bg-[#00F0FF] rounded-full animate-wave"
                style={{
                  height: `${Math.max(20, Math.random() * 80)}px`,
                  animation: `wave ${0.5 + Math.random()}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-[#111827] border border-[#1E293B] flex items-center justify-center transition-all">
            <Mic className="w-12 h-12 text-[#64748B]" />
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave {
          0% { height: 20px; opacity: 0.5; }
          100% { height: 90px; opacity: 1; }
        }
      `}} />

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
        <div className="w-full max-w-xl p-5 bg-[#111827] border border-[#1E293B] rounded-xl text-left space-y-3 font-mono text-xs shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="text-[#64748B] flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>TRANSCRIBED AUDIO</span>
          </div>
          <p className="text-[#F1F5F9] font-sans text-sm">{transcript}</p>

          {response && (
            <div className="pt-3 border-t border-[#1E293B] space-y-1">
              <div className="text-[#00F0FF] flex items-center space-x-2">
                <Volume2 className="w-3.5 h-3.5" />
                <span>HIKMAH SYNTHESIZED SPEECH</span>
              </div>
              <p className="text-[#94A3B8] font-sans text-sm">{response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
