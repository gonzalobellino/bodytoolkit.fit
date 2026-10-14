import { useCallback, useRef, DragEvent } from 'react';

export interface UseFileDropzoneOptions {
  accept?: string[];
  onFileSelect: (file: File) => void;
  onDragActiveChange?: (active: boolean) => void;
}

export interface FileDropzoneHandlers {
  handleDragEnter: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useFileDropzone({
  accept = ['image/*', 'video/*'],
  onFileSelect,
  onDragActiveChange,
}: UseFileDropzoneOptions): FileDropzoneHandlers {
  // Counter to handle nested drag enter/leave events
  const dragCounterRef = useRef(0);
  const isFileDrag = useCallback((e: DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    return types.includes('Files') || types.includes('application/x-moz-file');
  }, []);
  
  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      onDragActiveChange?.(true);
    }
  }, [isFileDrag, onDragActiveChange]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      onDragActiveChange?.(false);
    }
  }, [isFileDrag, onDragActiveChange]);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
  }, [isFileDrag]);

  const handleDrop = useCallback((e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    onDragActiveChange?.(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check if file type is accepted
      const isAccepted = accept.some(type => {
        if (type.endsWith('/*')) {
          const category = type.replace('/*', '');
          return file.type.startsWith(category);
        }
        return file.type === type;
      });
      
      if (isAccepted) {
        onFileSelect(file);
      }
    }
  }, [accept, isFileDrag, onFileSelect, onDragActiveChange]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [onFileSelect]);

  return {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileChange,
  };
}
