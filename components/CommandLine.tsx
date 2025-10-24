

import React, { useState } from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface CommandLineProps {
    handleCommand: (command: string) => void;
    startVoiceInput: () => void;
    stopVoiceInput: () => void;
    isListening: boolean;
    isAiProcessing: boolean;
}

const CommandLine: React.FC<CommandLineProps> = ({ handleCommand, startVoiceInput, stopVoiceInput, isListening, isAiProcessing }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    handleCommand(inputValue);
    setInputValue('');
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  return (
    <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-sm font-mono shrink-0">
      <span className="text-gray-400 mr-2">Command:</span>
      <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-2">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Type an AI command or a standard command...'}
          className="bg-transparent flex-1 text-gray-200 focus:outline-none placeholder-gray-500"
          disabled={isListening || isAiProcessing}
        />
        <button
          type="button"
          onClick={toggleVoiceInput}
          title={isListening ? "Stop Voice Input" : "Start Voice Input"}
          className={`p-1 rounded-md transition-colors ${
            isListening ? 'bg-red-600 text-white animate-pulse' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          } ${isAiProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isAiProcessing}
        >
          <MicrophoneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default CommandLine;