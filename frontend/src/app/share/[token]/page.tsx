"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  Image,
  Video,
  Music,
  File,
  Lock,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SharedFile {
  cid: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  url: string;
  permissions: string[];
}

interface ShareInfo {
  expiresAt?: string;
  remainingViews?: number;
}

const PublicShareView = () => {
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<SharedFile | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (token) {
      checkShare();
    }
  }, [token]);

  const checkShare = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/public/share/${token}`,
        {
          method: 'GET',
        }
      );

      const data = await response.json();

      if (response.status === 401 && data.requiresPassword) {
        setRequiresPassword(true);
        setPasswordHint(data.passwordHint);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to access shared file');
      }

      setFile(data.file);
      setShareInfo(data.share);
    } catch (error: any) {
      console.error('Error accessing share:', error);
      setError(error.message || 'Failed to access shared file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/public/share/${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid password');
      }

      setFile(data.file);
      setShareInfo(data.share);
      setRequiresPassword(false);
      toast.success('Access granted!');
    } catch (error: any) {
      console.error('Error verifying password:', error);
      setError(error.message || 'Invalid password');
      toast.error('Invalid password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    setIsDownloading(true);
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="w-12 h-12" />;
    
    if (fileType.startsWith('image/')) return <Image className="w-12 h-12" />;
    if (fileType.startsWith('video/')) return <Video className="w-12 h-12" />;
    if (fileType.startsWith('audio/')) return <Music className="w-12 h-12" />;
    if (fileType.includes('pdf')) return <FileText className="w-12 h-12 text-red-500" />;
    
    return <File className="w-12 h-12" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Accessing shared file...</p>
        </div>
      </div>
    );
  }

  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gray-800 rounded-2xl p-8 border border-gray-700"
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <p className="text-sm text-gray-500">
                This link may have expired, been revoked, or reached its view limit.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-800 rounded-2xl p-8 border border-gray-700"
        >
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Password Protected</h2>
            <p className="text-gray-400">
              This file is password protected. Please enter the password to continue.
            </p>
            {passwordHint && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">
                  <strong>Hint:</strong> {passwordHint}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                required
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Access File'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (file) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-gray-800 rounded-2xl overflow-hidden border border-gray-700"
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                {getFileIcon(file.fileType)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  {file.fileName || 'Shared File'}
                </h1>
                <p className="text-white/80 mt-1">
                  {formatFileSize(file.fileSize)} • {file.fileType || 'Unknown type'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <p className="text-green-400">Access granted! You can now download this file.</p>
              </div>
            </div>

            {file.fileType?.startsWith('image/') && (
              <div className="bg-gray-900 rounded-lg p-4">
                <img
                  src={file.url}
                  alt={file.fileName}
                  className="w-full h-auto max-h-96 object-contain rounded"
                />
              </div>
            )}

            {shareInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shareInfo.expiresAt && (
                  <div className="flex items-center p-3 bg-gray-900/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Expires</p>
                      <p className="text-sm text-gray-300">
                        {format(new Date(shareInfo.expiresAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
                {shareInfo.remainingViews !== null && shareInfo.remainingViews !== undefined && (
                  <div className="flex items-center p-3 bg-gray-900/50 rounded-lg">
                    <Eye className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Remaining Views</p>
                      <p className="text-sm text-gray-300">
                        {shareInfo.remainingViews}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-blue-400 mr-2" />
                <p className="text-sm font-medium text-gray-300">Permissions</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {file.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs capitalize"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download File
                  </>
                )}
              </button>
              <button
                onClick={() => window.open(file.url, '_blank')}
                className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                View on IPFS
              </button>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-400">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>This link may expire or have limited views</li>
                    <li>Download the file if you need permanent access</li>
                    <li>Do not share this link without permission</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              Powered by Storacha • Decentralized Storage on Solana
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default PublicShareView;
