"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Link2,
  Copy,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Lock,
  Activity,
  Check,
  X,
  AlertCircle,
  BarChart3,
  ExternalLink,
  MoreVertical,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface Share {
  id: number;
  shareToken: string;
  shareUrl: string;
  contentCid: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  expiresAt?: string;
  maxViews?: number;
  currentViews: number;
  permissions: string[];
  isActive: boolean;
  isValid: boolean;
  hasPassword: boolean;
  lastAccessedAt?: string;
}

interface ShareManagementProps {
  walletAddress: string;
}

const ShareManagement: React.FC<ShareManagementProps> = ({ walletAddress }) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShare, setSelectedShare] = useState<Share | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchShares();
    fetchAnalytics();
  }, [walletAddress]);

  const fetchShares = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/shares/list?ownerId=${walletAddress}`
      );
      if (!response.ok) throw new Error('Failed to fetch shares');
      const data = await response.json();
      setShares(data.shares);
    } catch (error) {
      console.error('Error fetching shares:', error);
      toast.error('Failed to load shares');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/shares/analytics?ownerId=${walletAddress}`
      );
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleCopyLink = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleRevokeShare = async (shareId: number) => {
    if (!confirm('Are you sure you want to revoke this share link?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/shares/${shareId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to revoke share');

      toast.success('Share link revoked successfully');
      fetchShares();
    } catch (error) {
      console.error('Error revoking share:', error);
      toast.error('Failed to revoke share');
    }
  };

  const handleToggleActive = async (share: Share) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/shares/${share.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !share.isActive }),
        }
      );

      if (!response.ok) throw new Error('Failed to update share');

      toast.success(`Share link ${share.isActive ? 'disabled' : 'enabled'}`);
      fetchShares();
    } catch (error) {
      console.error('Error updating share:', error);
      toast.error('Failed to update share');
    }
  };

  const filteredShares = shares.filter((share) => {
    if (filter === 'active') return share.isValid && share.isActive;
    if (filter === 'expired') return !share.isValid || !share.isActive;
    return true;
  });

  const getStatusColor = (share: Share) => {
    if (!share.isActive) return 'text-gray-500';
    if (!share.isValid) return 'text-red-500';
    return 'text-green-500';
  };

  const getStatusText = (share: Share) => {
    if (!share.isActive) return 'Disabled';
    if (!share.isValid) return 'Expired';
    return 'Active';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Share Management</h2>
        <p className="text-gray-400">Manage and monitor your shared file links</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-white">
                {analytics.totalShares}
              </span>
            </div>
            <p className="text-sm text-gray-400">Total Shares</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">
                {analytics.activeShares}
              </span>
            </div>
            <p className="text-sm text-gray-400">Active Shares</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {analytics.totalViews}
              </span>
            </div>
            <p className="text-sm text-gray-400">Total Views</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <Lock className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl font-bold text-white">
                {analytics.passwordProtected}
              </span>
            </div>
            <p className="text-sm text-gray-400">Protected</p>
          </motion.div>
        </div>
      )}

      <div className="flex items-center space-x-2 mb-6">
        <Filter className="w-5 h-5 text-gray-400" />
        {['all', 'active', 'expired'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading shares...</p>
          </div>
        ) : filteredShares.length === 0 ? (
          <div className="p-8 text-center">
            <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No shares found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Security
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredShares.map((share) => (
                  <tr key={share.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {share.fileName || 'Unnamed File'}
                        </p>
                        {share.fileSize && (
                          <p className="text-xs text-gray-400">
                            {(share.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          share
                        )}`}
                      >
                        {getStatusText(share)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-white">
                          {share.currentViews}
                          {share.maxViews && ` / ${share.maxViews}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-300">
                        {formatDistanceToNow(new Date(share.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {share.expiresAt ? (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-300">
                            {format(new Date(share.expiresAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {share.hasPassword && (
                          <Lock className="w-4 h-4 text-yellow-400" title="Password protected" />
                        )}
                        {share.permissions.includes('edit') && (
                          <Edit className="w-4 h-4 text-blue-400" title="Edit permission" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleCopyLink(share.shareUrl)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => window.open(share.shareUrl, '_blank')}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Open link"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(share)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title={share.isActive ? 'Disable' : 'Enable'}
                        >
                          {share.isActive ? (
                            <X className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Check className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {analytics?.topShares && analytics.topShares.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
            Most Viewed Shares
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.topShares.map((share: any) => (
              <div
                key={share.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <p className="text-sm font-medium text-white mb-2">
                  {share.fileName || 'Unnamed File'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-400">
                    {share.views}
                  </span>
                  <span className="text-xs text-gray-400">views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareManagement;
