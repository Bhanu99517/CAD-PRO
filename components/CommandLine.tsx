

import React, { useState } from 'react';

interface CommandLineProps {
    handleCommand: (command: string) => void;
    isAiProcessing: boolean;
}

const CommandLine: React.FC<CommandLineProps> = ({ handleCommand, isAiProcessing }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    handleCommand(inputValue);
    setInputValue('');
  };

  return (
    <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-sm font-mono shrink-0">
      <span className="text-gray-400 mr-2">Command:</span>
      <form onSubmit={handleSubmit} className="flex-1 flex items-center">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={'Type an AI command or a standard command...'}
          className="bg-transparent flex-1 text-gray-200 focus:outline-none placeholder-gray-500"
          disabled={isAiProcessing}
        />
      </form>
    </div>
  );
};

export default CommandLine;