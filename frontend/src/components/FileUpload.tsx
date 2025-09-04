"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // bytes
  acceptedTypes?: string[];
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes = [],
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors }) => {
          errors.forEach((error: any) => {
            if (error.code === 'file-too-large') {
              toast.error(
                `File ${file.name} is too large. Max size: ${maxSize / (1024 * 1024)}MB`
              );
            } else if (error.code === 'file-invalid-type') {
              toast.error(`File ${file.name} has invalid type`);
            } else {
              toast.error(`Error with file ${file.name}: ${error.message}`);
            }
          });
        });
      }

      if (acceptedFiles.length > 0) {
        const newFiles = [...selectedFiles, ...acceptedFiles].slice(0, maxFiles);
        setSelectedFiles(newFiles);
        onFilesSelected(newFiles);
        toast.success(`${acceptedFiles.length} file(s) added successfully!`);
      }
    },
    [selectedFiles, onFilesSelected, maxFiles, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept:
      acceptedTypes.length > 0
        ? acceptedTypes.reduce((acc, type) => {
            acc[type] = [];
            return acc;
          }, {} as Record<string, string[]>)
        : undefined,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone wrapper */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragActive && !isDragReject
            ? 'border-purple-400 bg-purple-50 scale-105'
            : isDragReject
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        }`}
      >
        <input {...getInputProps()} />

        {/* Animated Icon */}
        <motion.div
          animate={{
            y: isDragActive ? -10 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          {isDragReject ? (
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          )}
        </motion.div>

        {/* Dropzone text */}
        <div>
          {isDragActive ? (
            isDragReject ? (
              <>
                <p className="text-lg font-semibold text-red-600 mb-2">
                  Some files are not supported
                </p>
                <p className="text-sm text-red-500">Please check file types and sizes</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-purple-600 mb-2">
                  Drop files here! ✨
                </p>
                <p className="text-sm text-purple-500">
                  Release to add files to your upload queue
                </p>
              </>
            )
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Select Files to Upload
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop files here, or click to browse
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>
                  Maximum {maxFiles} files • Max size per file: {formatFileSize(maxSize)}
                </p>
                {acceptedTypes.length > 0 && (
                  <p>Accepted types: {acceptedTypes.join(', ')}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Files Preview */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{selectedFiles.length} file(s) selected</span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
              {selectedFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-gray-500">{formatFileSize(file.size)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
