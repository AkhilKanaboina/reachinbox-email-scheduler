'use client';

import { useRef, useState, DragEvent, ChangeEvent, ReactNode } from 'react';

interface FileUploadProps {
  accept?: string;
  onFile: (file: File) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export function FileUpload({
  accept = '.csv,.txt',
  onFile,
  label = 'Upload leads file',
  hint = 'CSV or TXT with email,name columns',
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    onFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so re-uploading the same file triggers onChange
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="sr-only"
        id="file-upload-input"
        disabled={disabled}
        aria-label={label}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'relative flex flex-col items-center justify-center gap-3',
          'border-2 border-dashed rounded-xl px-6 py-8 text-center',
          'transition-all duration-200 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          isDragging
            ? 'border-accent bg-accent/10 scale-[1.01]'
            : fileName
            ? 'border-success/40 bg-success/5'
            : 'border-border-default bg-elevated hover:border-accent/50 hover:bg-accent/5',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {/* Icon */}
        <div
          className={[
            'flex h-12 w-12 items-center justify-center rounded-xl',
            fileName ? 'bg-success/15 text-success' : 'bg-elevated text-text-muted',
          ].join(' ')}
        >
          {fileName ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div>
          {fileName ? (
            <>
              <p className="text-sm font-medium text-success">{fileName}</p>
              <p className="mt-1 text-xs text-text-muted">Click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-text-primary">{label}</p>
              <p className="mt-1 text-xs text-text-muted">
                {isDragging ? 'Drop it here!' : `Drag & drop or click to browse · ${hint}`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
