import React from 'react';
import { Camera } from 'lucide-react';

interface EditableImageWrapperProps {
  children: React.ReactElement;
  onEditClick: () => void;
  visualEditMode: boolean;
  className?: string;
}

export function EditableImageWrapper({ children, onEditClick, visualEditMode, className = "" }: EditableImageWrapperProps) {
  if (!visualEditMode) {
    return children;
  }
  return (
    <div className={`relative group/img-wrapper ${className}`}>
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEditClick();
        }}
        className="absolute inset-0 bg-black/50 opacity-0 group-hover/img-wrapper:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-black cursor-pointer rounded z-30"
      >
        <Camera className="w-5 h-5 mb-1 text-white" />
        <span>Trocar Imagem</span>
      </button>
    </div>
  );
}
