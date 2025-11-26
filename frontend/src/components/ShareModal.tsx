"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Calendar,
  Eye,
  Lock,
  Link2,
  Check,
  AlertCircle,
  QrCode,
  Mail,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    cid: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
  walletAddress: string;
}

interface ShareSettings {
  expiresAt?: string;
  maxViews?: number;
  password?: string;
  passwordHint?: string;
  permissions: string[];
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  file,
  walletAddress,
}) => {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    permissions: ['view'],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const expirationPresets = [
    { label: '1 Hour', value: 1, unit: 'hour' },
    { label: '24 Hours', value: 24, unit: 'hour' },
    { label: '7 Days', value: 7, unit: 'day' },
    { label: '30 Days', value: 30, unit: 'day' },
    { label: 'Never', value: null, unit: null },
  ];

  const handleCreateShare = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/shares/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentCid: file.cid,
          ownerId: walletAddress,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          ...shareSettings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      setShareUrl(data.share.shareUrl);
      
      if (data.share.shareUrl) {
        const qrData = await QRCode.toDataURL(data.share.shareUrl);
        setQrCodeDataUrl(qrData);
      }

      toast.success('Share link created successfully!');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExpirationPreset = (preset: any) => {
    if (preset.value === null) {
      setShareSettings({ ...shareSettings, expiresAt: undefined });
    } else {
      const expirationDate = new Date();
      if (preset.unit === 'hour') {
        expirationDate.setHours(expirationDate.getHours() + preset.value);
      } else if (preset.unit === 'day') {
        expirationDate.setDate(expirationDate.getDate() + preset.value);
      }
      setShareSettings({
        ...shareSettings,
        expiresAt: expirationDate.toISOString(),
      });
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`Shared file: ${file.fileName || 'File'}`);
    const body = encodeURIComponent(
      `I've shared a file with you. You can access it here:\n\n${shareUrl}\n\n${
        shareSettings.password ? 'Note: This link is password protected.' : ''
      }`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl mx-4 bg-gray-900 rounded-2xl shadow-2xl border border-gray-800"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Link2 className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Share File</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Sharing</p>
              <p className="text-white font-medium">{file.fileName || 'File'}</p>
              {file.fileSize && (
                <p className="text-sm text-gray-400 mt-1">
                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>

            {!shareUrl ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    <Calendar className="inline w-4 h-4 mr-2" />
                    Expiration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {expirationPresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleExpirationPreset(preset)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          (preset.value === null && !shareSettings.expiresAt) ||
                          (shareSettings.expiresAt && preset.label !== 'Never')
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {shareSettings.expiresAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Expires: {format(new Date(shareSettings.expiresAt), 'PPp')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    <Eye className="inline w-4 h-4 mr-2" />
                    View Limit
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    min="1"
                    value={shareSettings.maxViews || ''}
                    onChange={(e) =>
                      setShareSettings({
                        ...shareSettings,
                        maxViews: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty for unlimited views
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    <Lock className="inline w-4 h-4 mr-2" />
                    Password Protection
                  </label>
                  <input
                    type="password"
                    placeholder="Optional password"
                    value={shareSettings.password || ''}
                    onChange={(e) =>
                      setShareSettings({
                        ...shareSettings,
                        password: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none mb-2"
                  />
                  {shareSettings.password && (
                    <input
                      type="text"
                      placeholder="Password hint (optional)"
                      value={shareSettings.passwordHint || ''}
                      onChange={(e) =>
                        setShareSettings({
                          ...shareSettings,
                          passwordHint: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Advanced Settings
                  </button>
                  {showAdvanced && (
                    <div className="mt-3 p-4 bg-gray-800/50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Permissions
                      </label>
                      <div className="space-y-2">
                        {['view', 'comment', 'edit'].map((perm) => (
                          <label key={perm} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={shareSettings.permissions.includes(perm)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setShareSettings({
                                    ...shareSettings,
                                    permissions: [...shareSettings.permissions, perm],
                                  });
                                } else {
                                  setShareSettings({
                                    ...shareSettings,
                                    permissions: shareSettings.permissions.filter(
                                      (p) => p !== perm
                                    ),
                                  });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-300 capitalize">
                              {perm}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateShare}
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Share Link...' : 'Generate Share Link'}
                </button>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Check className="w-5 h-5 text-green-400 mr-2" />
                      <p className="text-green-400 font-medium">Share link created!</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-3">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowQRCode(!showQRCode)}
                      className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Code
                    </button>
                    <button
                      onClick={handleSendEmail}
                      className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </button>
                  </div>

                  {showQRCode && qrCodeDataUrl && (
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  )}

                  <div className="p-4 bg-gray-800/50 rounded-lg space-y-2 text-sm">
                    {shareSettings.expiresAt && (
                      <div className="flex items-center text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        Expires: {format(new Date(shareSettings.expiresAt), 'PPp')}
                      </div>
                    )}
                    {shareSettings.maxViews && (
                      <div className="flex items-center text-gray-400">
                        <Eye className="w-4 h-4 mr-2" />
                        Limited to {shareSettings.maxViews} views
                      </div>
                    )}
                    {shareSettings.password && (
                      <div className="flex items-center text-gray-400">
                        <Lock className="w-4 h-4 mr-2" />
                        Password protected
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-400">
                        Anyone with this link can access your file according to the permissions
                        you've set. Share responsibly.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end p-6 border-t border-gray-800">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {shareUrl ? 'Done' : 'Cancel'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;
