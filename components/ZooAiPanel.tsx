
import React, { useState } from 'react';
import { ZooAiIcon } from './icons/ZooAiIcon';

interface ZooAiPanelProps {
    handleCommand: (command: string) => Promise<void>;
    isProcessing: boolean;
    error: string | null;
    aiResponseText: string | null;
}

const ZooAiPanel: React.FC<ZooAiPanelProps> = ({ handleCommand, isProcessing, error, aiResponseText }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isProcessing) return;
        handleCommand(inputValue);
        setInputValue('');
    };

    return (
        <div className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                <h3 className="text-md font-semibold text-gray-200 flex items-center">
                    <ZooAiIcon className="w-5 h-5 mr-2" />
                    Zoo AI Assistant
                </h3>
            </div>
            <div className="flex-1 flex flex-col space-y-2 text-sm text-gray-300">
                <p>Describe what you want to create or modify.</p>
                <p className="text-xs text-gray-400">Examples:</p>
                <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                    <li>"Draw a circle at 100, 150 with a radius of 75"</li>
                    <li>"Create a rectangle from 200,200 with width 150 and height 100"</li>
                    <li>"Make a new layer named 'Annotations' with a yellow color"</li>
                    <li>"Delete the selected shapes"</li>
                </ul>
            </div>
            
            {aiResponseText && (
                <div className="p-2 bg-gray-700 rounded-md text-sm text-gray-200">
                    {aiResponseText}
                </div>
            )}
            
            {error && (
                <div className="p-2 bg-red-900/50 border border-red-500 rounded-md text-sm text-red-300">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex space-x-2 items-center mt-auto">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your command..."
                    className="flex-1 bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                />
                <button
                    type="submit"
                    disabled={isProcessing || !inputValue.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Send'}
                </button>
            </form>
        </div>
    );
};

export default ZooAiPanel;
