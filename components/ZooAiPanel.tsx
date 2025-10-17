import React, { useState } from 'react';
import { ZooAiIcon } from './icons/ZooAiIcon';

interface ZooAiPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => Promise<void>;
    isGenerating: boolean;
}

const examplePrompts = [
    "a simple wooden chair in isometric view",
    "a 2d side view of a sports car",
    "a small house with a door and two windows",
    "the floor plan for a studio apartment",
    "a detailed technical drawing of a gear",
];

const ZooAiPanel: React.FC<ZooAiPanelProps> = ({ isOpen, onClose, onGenerate, isGenerating }) => {
    const [prompt, setPrompt] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleGenerateClick = () => {
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };
    
    const handleExampleClick = (example: string) => {
        setPrompt(example);
    }

    return (
        <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl p-6 md:p-8 w-11/12 max-w-2xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
                style={{ animationFillMode: 'forwards' }}
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <ZooAiIcon className="w-8 h-8 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">Zoo AI Model Generator</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div>
                    <label htmlFor="zoo-ai-prompt" className="block text-sm font-medium text-gray-300 mb-2">
                        Describe the model you want to create:
                    </label>
                    <textarea
                        id="zoo-ai-prompt"
                        rows={4}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'An isometric view of a two-story modern house with a balcony'"
                        className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        disabled={isGenerating}
                    />
                </div>
                
                <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">Or try an example:</p>
                    <div className="flex flex-wrap gap-2">
                        {examplePrompts.map((ex, index) => (
                            <button
                                key={index}
                                onClick={() => handleExampleClick(ex)}
                                disabled={isGenerating}
                                className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50"
                            >
                                {ex}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-8 text-right">
                    <button
                        onClick={handleGenerateClick}
                        disabled={isGenerating || !prompt.trim()}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </>
                        ) : (
                            'Generate Model'
                        )}
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fadeInScale {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in-scale {
                    animation: fadeInScale 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ZooAiPanel;
