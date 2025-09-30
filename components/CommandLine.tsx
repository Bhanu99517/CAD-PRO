import React, { useState } from 'react';

interface CommandLineProps {
    handleCommand: (command: string) => Promise<void>;
    isGenerating: boolean;
}

const CommandLine: React.FC<CommandLineProps> = ({ handleCommand, isGenerating }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating || !inputValue.trim()) return;
    handleCommand(inputValue);
    setInputValue('');
  };

  return (
    <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-sm font-mono">
      <span className="text-gray-400 mr-2">Type a command:</span>
      <form onSubmit={handleSubmit} className="w-full">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isGenerating ? "Processing..." : ""}
          className="bg-transparent w-full text-gray-200 focus:outline-none placeholder-gray-500"
          disabled={isGenerating}
        />
      </form>
    </div>
  );
};

export default CommandLine;