


import React, { useState } from 'react';
import { Tool, Point } from '../types';

interface CommandLineProps {
    handleCommand: (command: string) => void;
    isAiProcessing: boolean;
    setActiveTool: (tool: Tool) => void;
    onSetLimits: (p1: Point, p2: Point) => void;
}

const CommandLine: React.FC<CommandLineProps> = ({ handleCommand, isAiProcessing, setActiveTool, onSetLimits }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAiProcessing) return;
    
    const rawInput = inputValue.trim();
    if (!rawInput) return;

    const command = rawInput.toUpperCase();
    
    // Check for tool command
    const toolKeys = Object.keys(Tool) as Array<keyof typeof Tool>;
    const matchingTool = toolKeys.find(key => key === command);
    if (matchingTool) {
        setActiveTool(Tool[matchingTool]);
        setInputValue('');
        return;
    }

    // Check for LIMITS command
    if (command === 'LIMITS') {
        const limitsInput = prompt("Enter new limits (lower-left X,Y upper-right X,Y):", "0,0 1920,1080");
        if (limitsInput) {
            const parts = limitsInput.match(/([-\d.]+),([-\d.]+)\s+([-\d.]+),([-\d.]+)/);
            if (parts && parts.length === 5) {
                const p1 = { x: parseFloat(parts[1]), y: parseFloat(parts[2]) };
                const p2 = { x: parseFloat(parts[3]), y: parseFloat(parts[4]) };
                if (!isNaN(p1.x) && !isNaN(p1.y) && !isNaN(p2.x) && !isNaN(p2.y)) {
                    onSetLimits(p1, p2);
                } else {
                    alert("Invalid number format. Please use: X,Y X,Y");
                }
            } else {
                alert("Invalid format. Please use: lower_X,lower_Y upper_X,upper_Y");
            }
        }
        setInputValue('');
        return;
    }
    
    // Default to AI command
    handleCommand(rawInput);
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
          placeholder={'Type a command (e.g. LINE, LIMITS) or ask AI...'}
          className="bg-transparent flex-1 text-gray-200 focus:outline-none placeholder-gray-500"
          disabled={isAiProcessing}
        />
      </form>
    </div>
  );
};

export default CommandLine;