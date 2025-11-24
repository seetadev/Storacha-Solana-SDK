"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  File,
  Code,
  FileSpreadsheet,
  Archive
} from 'lucide-react';

interface FileThumbnailProps {
  file: {
    filename: string;
    type: string;
    url: string;
    size: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showFallback?: boolean;
}

const FileThumbnail: React.FC<FileThumbnailProps> = ({ 
  file, 
  size = 'md',
  showFallback = true 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const isImageFile = (type: string) => type.startsWith('image/');
  const isVideoFile = (type: string) => type.startsWith('video/');
  const isAudioFile = (type: string) => type.startsWith('audio/');
  const isPdfFile = (type: string) => type === 'application/pdf';
  const isSpreadsheet = (filename: string) => {
    const extensions = ['.xlsx', '.xls', '.csv'];
    return extensions.some(ext => filename.toLowerCase().endsWith(ext));
  };
  const isArchive = (filename: string) => {
    const extensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    return extensions.some(ext => filename.toLowerCase().endsWith(ext));
  };
  const isCodeFile = (filename: string) => {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.json', '.xml', '.yaml', '.yml', '.md', '.sol', '.rs'];
    return extensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getFileIcon = () => {
    if (isImageFile(file.type)) return Image;
    if (isVideoFile(file.type)) return Video;
    if (isAudioFile(file.type)) return Music;
    if (isPdfFile(file.type)) return FileText;
    if (isSpreadsheet(file.filename)) return FileSpreadsheet;
    if (isArchive(file.filename)) return Archive;
    if (isCodeFile(file.filename)) return Code;
    return File;
  };

  const getIconColor = () => {
    if (isImageFile(file.type)) return 'text-blue-400';
    if (isVideoFile(file.type)) return 'text-purple-400';
    if (isAudioFile(file.type)) return 'text-pink-400';
    if (isPdfFile(file.type)) return 'text-red-400';
    if (isSpreadsheet(file.filename)) return 'text-green-400';
    if (isArchive(file.filename)) return 'text-yellow-400';
    if (isCodeFile(file.filename)) return 'text-cyan-400';
    return 'text-gray-400';
  };

  const FileIcon = getFileIcon();
  const iconColor = getIconColor();

  if (isImageFile(file.type) && !imageError) {
    return (
      <div className={`${sizeClasses[size]} relative rounded-lg overflow-hidden bg-gray-800`}>
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="animate-pulse">
              <Image className={`${iconSizeClasses[size]} text-gray-600`} />
            </div>
          </div>
        )}
        <img
          src={file.url}
          alt={file.filename}
          className="w-full h-full object-cover"
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          loading="lazy"
        />
      </div>
    );
  }

  if (isVideoFile(file.type) && !imageError) {
    return (
      <div className={`${sizeClasses[size]} relative rounded-lg overflow-hidden bg-gray-800`}>
        <video
          className="w-full h-full object-cover"
          preload="metadata"
          onError={() => setImageError(true)}
        >
          <source src={`${file.url}#t=0.1`} type={file.type} />
        </video>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-1">
            <Video className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  if (showFallback || imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-gray-800 flex items-center justify-center`}>
        <FileIcon className={`${iconSizeClasses[size]} ${iconColor}`} />
      </div>
    );
  }

  return null;
};

export default FileThumbnail;

