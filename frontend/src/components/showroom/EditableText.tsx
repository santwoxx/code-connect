import React from 'react';

interface EditableTextProps {
  text: string;
  onChange: (val: string) => void;
  className?: string;
  isMultiline?: boolean;
  visualEditMode: boolean;
}

export function EditableText({ text, onChange, className, isMultiline = false, visualEditMode }: EditableTextProps) {
  if (!visualEditMode) {
    return <span className={className}>{text}</span>;
  }
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      className={`${className} border border-dashed border-blue-400 px-1 hover:bg-blue-50/20 focus:bg-white focus:outline-blue-500 rounded cursor-text inline-block min-w-[20px]`}
      onBlur={(e) => {
        onChange(e.currentTarget.innerText || "");
      }}
      onKeyDown={(e) => {
        if (!isMultiline && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    >
      {text}
    </span>
  );
}
