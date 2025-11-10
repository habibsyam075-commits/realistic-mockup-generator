import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DesignTransform } from '../App';
import { MockupType } from '../types';

interface MockupEditorProps {
  walletImage: string;
  designImages: string[];
  onGenerate: (
    designs: DesignTransform[],
    containerSize: { width: number; height: number },
    mockupType: MockupType
  ) => void;
  initialDesigns?: DesignTransform[] | null;
}

type Interaction = {
  type: 'drag' | 'resize' | 'rotate';
  handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'rotate' | 'body';
  index: number;
  startX: number;
  startY: number;
  startPos: { x: number; y: number };
  startSize: { width: number; height: number };
  startRotation: number;
  startCenter: { x: number; y: number };
  startAngle: number;
} | null;


const MockupEditor: React.FC<MockupEditorProps> = ({ 
  walletImage, 
  designImages, 
  onGenerate, 
  initialDesigns
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const walletImageRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [designs, setDesigns] = useState<DesignTransform[]>([]);
  const [selectedDesignIndex, setSelectedDesignIndex] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<MockupType>(MockupType.ENGRAVE);
  
  const [interaction, setInteraction] = useState<Interaction>(null);

  useEffect(() => {
    setDesigns(
      designImages.map((_, index) => {
        if (initialDesigns && initialDesigns[index]) {
          return initialDesigns[index];
        }
        return {
          position: { x: 50 + index * 20, y: 50 + index * 20 },
          size: { width: 150, height: 150 },
          rotation: 0,
        };
      })
    );
    if (designImages.length > 0) {
        setSelectedDesignIndex(designImages.length - 1);
    } else {
        setSelectedDesignIndex(null);
    }
  }, [designImages, initialDesigns]);


  const handleMouseDown = (e: React.MouseEvent, handle: Interaction['handle'], index: number) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedDesignIndex(index);
    const design = designs[index];
    
    const box = e.currentTarget.parentElement as HTMLDivElement;
    const boxRect = box.getBoundingClientRect();
    
    const center = {
      x: design.position.x + design.size.width / 2,
      y: design.position.y + design.size.height / 2,
    };
    
    const dx = e.clientX - boxRect.left - center.x;
    const dy = e.clientY - boxRect.top - center.y;
    const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    setInteraction({
      type: handle === 'rotate' ? 'rotate' : (handle === 'body' ? 'drag' : 'resize'),
      handle,
      index,
      startX: e.clientX,
      startY: e.clientY,
      startPos: design.position,
      startSize: design.size,
      startRotation: design.rotation,
      startCenter: center,
      startAngle,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!interaction || !containerRef.current) return;
    
    const {index} = interaction;
    const dx = e.clientX - interaction.startX;
    const dy = e.clientY - interaction.startY;
    const bounds = containerRef.current.getBoundingClientRect();
    let updatedDesign = { ...designs[index] };

    switch (interaction.type) {
      case 'drag': {
        let newX = interaction.startPos.x + dx;
        let newY = interaction.startPos.y + dy;
        updatedDesign.position = { x: newX, y: newY };
        break;
      }
      case 'rotate': {
        const currentDx = e.clientX - bounds.left - interaction.startCenter.x;
        const currentDy = e.clientY - bounds.top - interaction.startCenter.y;
        const currentAngle = Math.atan2(currentDy, currentDx) * (180 / Math.PI);
        let angleDiff = currentAngle - interaction.startAngle;

        let newRotation = interaction.startRotation + angleDiff;
        
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        updatedDesign.rotation = newRotation;
        break;
      }
      case 'resize': {
        const cornerHandles = ['nw', 'ne', 'sw', 'se'];
        if (cornerHandles.includes(interaction.handle)) {
            const startDistance = Math.hypot(
              interaction.startX - bounds.left - interaction.startCenter.x,
              interaction.startY - bounds.top - interaction.startCenter.y
            );
            const currentDistance = Math.hypot(
              e.clientX - bounds.left - interaction.startCenter.x,
              e.clientY - bounds.top - interaction.startCenter.y
            );

            if (startDistance === 0) return;
            
            const scale = currentDistance / startDistance;
            const newWidth = Math.max(20, interaction.startSize.width * scale);
            const newHeight = Math.max(20, interaction.startSize.height * scale);

            const newX = interaction.startPos.x - (newWidth - interaction.startSize.width) / 2;
            const newY = interaction.startPos.y - (newHeight - interaction.startSize.height) / 2;

            updatedDesign.position = {x: newX, y: newY};
            updatedDesign.size = {width: newWidth, height: newHeight};
        } else {
            const rad = interaction.startRotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            let newWidth = interaction.startSize.width;
            let newHeight = interaction.startSize.height;
            
            if (interaction.handle === 'e' || interaction.handle === 'w') {
                const deltaWidth = dx * cos + dy * sin;
                newWidth = Math.max(20, interaction.startSize.width + (interaction.handle === 'w' ? -deltaWidth : deltaWidth));
            } else { // n or s
                const deltaHeight = -dx * sin + dy * cos;
                newHeight = Math.max(20, interaction.startSize.height + (interaction.handle === 'n' ? -deltaHeight : deltaHeight));
            }

            const actualDeltaWidth = newWidth - interaction.startSize.width;
            const actualDeltaHeight = newHeight - interaction.startSize.height;

            let deltaCenterX = 0;
            let deltaCenterY = 0;

            if (interaction.handle === 'e') {
                deltaCenterX = (actualDeltaWidth / 2) * cos;
                deltaCenterY = (actualDeltaWidth / 2) * sin;
            } else if (interaction.handle === 'w') {
                deltaCenterX = (-actualDeltaWidth / 2) * cos;
                deltaCenterY = (-actualDeltaWidth / 2) * sin;
            } else if (interaction.handle === 's') {
                deltaCenterX = (actualDeltaHeight / 2) * -sin;
                deltaCenterY = (actualDeltaHeight / 2) * cos;
            } else if (interaction.handle === 'n') {
                deltaCenterX = (-actualDeltaHeight / 2) * -sin;
                deltaCenterY = (-actualDeltaHeight / 2) * cos;
            }
           
            const newCenter = {
                x: interaction.startCenter.x + deltaCenterX,
                y: interaction.startCenter.y + deltaCenterY,
            };

            const newPosition = {
                x: newCenter.x - newWidth / 2,
                y: newCenter.y - newHeight / 2,
            };

            updatedDesign.position = newPosition;
            updatedDesign.size = { width: newWidth, height: newHeight };
        }
        break;
      }
    }
    setDesigns(currentDesigns => currentDesigns.map((d, i) => i === index ? updatedDesign : d));
  }, [interaction, designs]);

  const handleMouseUp = useCallback(() => {
    setInteraction(null);
  }, []);

  useEffect(() => {
    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [interaction, handleMouseMove, handleMouseUp]);

  const handleGenerateClick = async () => {
    if (!walletImageRef.current) return;
    setIsLoading(true);
    const containerSize = {
        width: walletImageRef.current.clientWidth,
        height: walletImageRef.current.clientHeight
    };
    await onGenerate(designs, containerSize, selectedType);
    setIsLoading(false);
  };

  const cornerHandles: Interaction['handle'][] = ['nw', 'ne', 'sw', 'se'];
  const sideHandles: Interaction['handle'][] = ['n', 's', 'e', 'w'];

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl font-semibold text-white mb-2 text-center">Step 3: Position Design & Choose Style</h2>
      <p className="text-gray-400 mb-6 text-center">Click a design to select. Drag to move, use handles to resize/rotate.</p>
      
      <div 
        ref={containerRef} 
        className="relative w-full max-w-xl mx-auto touch-none select-none"
        onClick={() => setSelectedDesignIndex(null)}
      >
        <img ref={walletImageRef} src={walletImage} alt="Product" className="w-full h-auto rounded-lg shadow-lg" />
        
        {designs.map((design, index) => (
            <div
            key={index}
            className={`absolute ${selectedDesignIndex === index ? 'border-2 border-dashed border-indigo-400' : 'border-2 border-transparent hover:border-indigo-400/20'}`}
            style={{
              left: `${design.position.x}px`,
              top: `${design.position.y}px`,
              width: `${design.size.width}px`,
              height: `${design.size.height}px`,
              transform: `rotate(${design.rotation}deg)`,
              zIndex: selectedDesignIndex === index ? 10 : 1,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'body', index)}
            onClick={(e) => { e.stopPropagation(); setSelectedDesignIndex(index); }}
          >
            <img src={designImages[index]} alt={`Design ${index}`} className="w-full h-full object-contain pointer-events-none" />
            
            {selectedDesignIndex === index && (
                <>
                {cornerHandles.map(handle => (
                    <div
                    key={handle}
                    className="absolute w-4 h-4 bg-indigo-500 rounded-full border-2 border-gray-800"
                    style={{
                        top: handle.includes('n') ? '-8px' : 'auto',
                        bottom: handle.includes('s') ? '-8px' : 'auto',
                        left: handle.includes('w') ? '-8px' : 'auto',
                        right: handle.includes('e') ? '-8px' : 'auto',
                        cursor: `${handle}-resize`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, handle, index)}
                    />
                ))}

                {sideHandles.map(handle => {
                    const baseClass = "absolute bg-indigo-500 border-2 border-gray-800 rounded-sm";
                    let style: React.CSSProperties = {};
                    let className = baseClass;

                    if (handle === 'n' || handle === 's') {
                        className += ' w-5 h-2';
                        style = { left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
                        if (handle === 'n') style.top = '-5px'; else style.bottom = '-5px';
                    } else { // e or w
                        className += ' w-2 h-5';
                        style = { top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' };
                        if (handle === 'w') style.left = '-5px'; else style.right = '-5px';
                    }

                    return (
                        <div
                            key={handle}
                            className={className}
                            style={style}
                            onMouseDown={(e) => handleMouseDown(e, handle, index)}
                        />
                    )
                })}


                <div
                    className="absolute left-1/2 -bottom-8 w-4 h-4 bg-indigo-500 rounded-full border-2 border-gray-800 cursor-crosshair"
                    style={{ transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => handleMouseDown(e, 'rotate', index)}
                >
                    <div className="absolute bottom-full left-1/2 w-px h-4 bg-indigo-400/70" style={{transform: `rotate(${-design.rotation}deg)`, transformOrigin: 'bottom center'}}/>
                </div>
                </>
            )}
          </div>
        ))}
      </div>
      
      <div className="w-full max-w-xl mx-auto mt-8">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">Mockup Effect</h3>
        <div className="flex justify-center items-center gap-2 sm:gap-4 p-2 bg-gray-900/50 rounded-full">
          {Object.values(MockupType).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 sm:px-6 py-2 w-full text-sm sm:text-base font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                selectedType === type
                ? 'bg-indigo-600 text-white shadow-lg focus:ring-indigo-500'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-500'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerateClick}
        disabled={isLoading}
        className="mt-8 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          'Generate Mockup'
        )}
      </button>
    </div>
  );
};

export default MockupEditor;
