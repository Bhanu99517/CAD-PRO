import React from 'react';
import { Layer } from './types';
import { PlusIcon } from './components/icons/PlusIcon';
import { EyeIcon } from './components/icons/EyeIcon';
import { EyeOffIcon } from './components/icons/EyeOffIcon';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  addLayer: () => void;
  updateLayer: (layer: Layer) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ layers, activeLayerId, setActiveLayerId, addLayer, updateLayer }) => {
    
    const handleNameChange = (id: string, newName: string) => {
        const layer = layers.find(l => l.id === id);
        if (layer) {
            updateLayer({ ...layer, name: newName });
        }
    }

    const handleColorChange = (id: string, newColor: string) => {
        const layer = layers.find(l => l.id === id);
        if (layer) {
            updateLayer({ ...layer, color: newColor });
        }
    }
    
    const handleVisibilityToggle = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const layer = layers.find(l => l.id === id);
        if (layer) {
            updateLayer({ ...layer, visible: !layer.visible });
        }
    };

    return (
    <div className="p-4 flex flex-col space-y-4 border-t border-gray-700 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold text-gray-200">Layers</h3>
        <button onClick={addLayer} className="p-1 rounded-md hover:bg-gray-600" title="Add New Layer">
            <PlusIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col space-y-1">
        {layers.map(layer => (
            <div 
                key={layer.id} 
                onClick={() => setActiveLayerId(layer.id)}
                className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer ${activeLayerId === layer.id ? 'bg-blue-600/30' : 'hover:bg-gray-700'}`}
            >
                <button 
                    onClick={(e) => handleVisibilityToggle(e, layer.id)}
                    className="p-1 rounded-md hover:bg-gray-600 focus:outline-none"
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                    {layer.visible ? <EyeIcon className="w-4 h-4 text-gray-300" /> : <EyeOffIcon className="w-4 h-4 text-gray-500" />}
                </button>
                <input 
                    type="color" 
                    value={layer.color}
                    onChange={(e) => handleColorChange(layer.id, e.target.value)}
                    className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                />
                <input
                    type="text"
                    value={layer.name}
                    onChange={(e) => handleNameChange(layer.id, e.target.value)}
                    className={`bg-transparent text-sm w-full focus:outline-none focus:bg-gray-600 rounded px-1 ${!layer.visible ? 'text-gray-500 italic' : 'text-white'}`}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        ))}
      </div>
    </div>
  );
};

export default LayersPanel;