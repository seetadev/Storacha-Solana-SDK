"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Image, 
  Video, 
  Music, 
  File,
  Code,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from 'lucide-react';
import Button from './Button';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    cid: string;
    filename: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: string;
  } | null;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (file && isOpen) {
      loadPreview();
    }
  }, [file, isOpen]);

  const loadPreview = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (isTextFile(file.type) || isCodeFile(file.filename)) {
        const response = await fetch(file.url);
        if (response.ok) {
          const text = await response.text();
          setPreviewContent(text);
        } else {
          throw new Error('Failed to load file content');
        }
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load preview');
      setLoading(false);
    }
  };

  const isImageFile = (type: string) => type.startsWith('image/');
  const isVideoFile = (type: string) => type.startsWith('video/');
  const isAudioFile = (type: string) => type.startsWith('audio/');
  const isPdfFile = (type: string) => type === 'application/pdf';
  const isTextFile = (type: string) => 
    type.startsWith('text/') || 
    type === 'application/json' ||
    type === 'application/xml';
  
  const isCodeFile = (filename: string) => {
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.md', '.sol', '.rs'];
    return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getFileIcon = (type: string, filename: string) => {
    if (isImageFile(type)) return Image;
    if (isVideoFile(type)) return Video;
    if (isAudioFile(type)) return Music;
    if (isPdfFile(type)) return FileText;
    if (isCodeFile(filename)) return Code;
    if (isTextFile(type)) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    if (!file) return;
    
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(100);
    setRotation(0);
  };

  const renderPreview = () => {
    if (!file) return null;

    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
          <File className="w-16 h-16 mb-4" />
          <p>{error}</p>
          <p className="text-sm mt-2">This file type cannot be previewed</p>
        </div>
      );
    }

    if (isImageFile(file.type)) {
      return (
        <div className="relative bg-black/50 rounded-lg overflow-hidden">
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
              title="Reset"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center min-h-[400px] max-h-[600px] overflow-auto p-4">
            <img 
              src={file.url} 
              alt={file.filename}
              className="max-w-full h-auto transition-transform duration-300"
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              }}
              onError={() => setError('Failed to load image')}
            />
          </div>
        </div>
      );
    }

    if (isVideoFile(file.type)) {
      return (
        <div className="bg-black rounded-lg overflow-hidden">
          <video 
            controls 
            className="w-full max-h-[600px]"
            preload="metadata"
          >
            <source src={file.url} type={file.type} />
            Your browser does not support video preview.
          </video>
        </div>
      );
    }

    if (isAudioFile(file.type)) {
      return (
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="flex flex-col items-center">
            <Music className="w-24 h-24 text-purple-400 mb-6" />
            <p className="text-white mb-4">{file.filename}</p>
            <audio controls className="w-full max-w-md">
              <source src={file.url} type={file.type} />
              Your browser does not support audio preview.
            </audio>
          </div>
        </div>
      );
    }

    if (isPdfFile(file.type)) {
      return (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <iframe
            src={`${file.url}#toolbar=0`}
            className="w-full h-[600px]"
            title={file.filename}
          />
        </div>
      );
    }

    if ((isTextFile(file.type) || isCodeFile(file.filename)) && previewContent) {
      const language = file.filename.split('.').pop() || 'text';
      return (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-400">{file.filename}</span>
            <span className="text-xs text-gray-500">{language.toUpperCase()}</span>
          </div>
          <pre className="p-4 overflow-auto max-h-[500px] text-sm">
            <code className="text-gray-300 whitespace-pre-wrap">
              {previewContent.length > 50000 
                ? previewContent.substring(0, 50000) + '\n\n... (file truncated for preview)'
                : previewContent
              }
            </code>
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <File className="w-16 h-16 mb-4" />
        <p className="text-lg mb-2">{file.filename}</p>
        <p className="text-sm">Preview not available for this file type</p>
        <Button
          onClick={handleDownload}
          className="mt-4"
          icon={Download}
        >
          Download to View
        </Button>
      </div>
    );
  };

  if (!file) return null;

  const FileIcon = getFileIcon(file.type, file.filename);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-3">
                <FileIcon className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white truncate max-w-md">
                    {file.filename}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  size="sm"
                  icon={Download}
                >
                  Download
                </Button>
                <Button
                  onClick={() => window.open(file.url, '_blank')}
                  variant="secondary"
                  size="sm"
                  icon={ExternalLink}
                >
                  Open Original
                </Button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              {renderPreview()}
            </div>

            <div className="bg-gray-800 px-6 py-3 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>CID: {file.cid}</span>
                <span>Type: {file.type || 'Unknown'}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilePreviewModal;

