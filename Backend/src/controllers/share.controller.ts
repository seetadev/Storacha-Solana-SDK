import { Request, Response } from "express";
import { eq, and, desc, or, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db/db.js";
import { shareLinks, shareAccessLog, depositAccount } from "../db/schema.js";


const generateShareToken = (): string => {
  return crypto.randomBytes(32).toString("base64url");
};


const isShareValid = (share: any): boolean => {
  if (!share.isActive) return false;
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return false;
  if (share.maxViews && share.currentViews >= share.maxViews) return false;
  return true;
};


export const createShareLink = async (req: Request, res: Response) => {
  try {
    const {
      contentCid,
      ownerId,
      expiresAt,
      maxViews,
      password,
      passwordHint,
      permissions,
      fileName,
      fileType,
      fileSize,
    } = req.body;

    const file = await db
      .select()
      .from(depositAccount)
      .where(
        and(
          eq(depositAccount.contentCid, contentCid),
          eq(depositAccount.depositKey, ownerId.toLowerCase())
        )
      )
      .limit(1);

    if (file.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found or you don't have permission to share it",
      });
    }

    const shareToken = generateShareToken();

    let passwordHash = null;
    if (password) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    const newShare = await db
      .insert(shareLinks)
      .values({
        shareToken,
        contentCid,
        ownerId: ownerId.toLowerCase(),
        fileName: fileName || file[0].fileName,
        fileType: fileType || file[0].fileType,
        fileSize: fileSize || file[0].fileSize,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxViews: maxViews || null,
        passwordHash,
        passwordHint: passwordHint || null,
        permissions: permissions || ["view"],
        metadata: {
          createdFrom: req.ip,
          userAgent: req.get("user-agent"),
        },
      })
      .returning();

    const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/share/${shareToken}`;

    res.status(201).json({
      success: true,
      message: "Share link created successfully",
      share: {
        id: newShare[0].id,
        shareToken: newShare[0].shareToken,
        shareUrl,
        expiresAt: newShare[0].expiresAt,
        maxViews: newShare[0].maxViews,
        permissions: newShare[0].permissions,
        hasPassword: !!passwordHash,
        passwordHint: newShare[0].passwordHint,
      },
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create share link",
    });
  }
};


export const getUserShareLinks = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required",
      });
    }

    const shares = await db
      .select({
        id: shareLinks.id,
        shareToken: shareLinks.shareToken,
        contentCid: shareLinks.contentCid,
        fileName: shareLinks.fileName,
        fileType: shareLinks.fileType,
        fileSize: shareLinks.fileSize,
        createdAt: shareLinks.createdAt,
        expiresAt: shareLinks.expiresAt,
        maxViews: shareLinks.maxViews,
        currentViews: shareLinks.currentViews,
        permissions: shareLinks.permissions,
        isActive: shareLinks.isActive,
        lastAccessedAt: shareLinks.lastAccessedAt,
        hasPassword: shareLinks.passwordHash,
      })
      .from(shareLinks)
      .where(eq(shareLinks.ownerId, (ownerId as string).toLowerCase()))
      .orderBy(desc(shareLinks.createdAt));

    const sharesWithUrls = shares.map((share) => ({
      ...share,
      shareUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/share/${share.shareToken}`,
      isValid: isShareValid(share),
      hasPassword: !!share.hasPassword,
    }));

    res.status(200).json({
      success: true,
      shares: sharesWithUrls,
      count: shares.length,
    });
  } catch (error) {
    console.error("Error fetching user share links:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch share links",
    });
  }
};


export const getShareDetails = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;

    const share = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.id, parseInt(shareId)))
      .limit(1);

    if (share.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    const accessLogs = await db
      .select()
      .from(shareAccessLog)
      .where(eq(shareAccessLog.shareId, parseInt(shareId)))
      .orderBy(desc(shareAccessLog.accessedAt))
      .limit(100);

    res.status(200).json({
      success: true,
      share: {
        ...share[0],
        shareUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/share/${share[0].shareToken}`,
        isValid: isShareValid(share[0]),
        hasPassword: !!share[0].passwordHash,
        passwordHash: undefined,
      },
      accessLogs,
      totalAccesses: accessLogs.length,
    });
  } catch (error) {
    console.error("Error fetching share details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch share details",
    });
  }
};


export const updateShareLink = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const {
      expiresAt,
      maxViews,
      password,
      passwordHint,
      permissions,
      isActive,
    } = req.body;

    const updateData: any = {};

    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (maxViews !== undefined) updateData.maxViews = maxViews;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (passwordHint !== undefined) updateData.passwordHint = passwordHint;

    if (password !== undefined) {
      if (password) {
        const saltRounds = 10;
        updateData.passwordHash = await bcrypt.hash(password, saltRounds);
      } else {
        updateData.passwordHash = null;
      }
    }

    const updatedShare = await db
      .update(shareLinks)
      .set(updateData)
      .where(eq(shareLinks.id, parseInt(shareId)))
      .returning();

    if (updatedShare.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Share link updated successfully",
      share: {
        ...updatedShare[0],
        shareUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/share/${updatedShare[0].shareToken}`,
        hasPassword: !!updatedShare[0].passwordHash,
        passwordHash: undefined,
      },
    });
  } catch (error) {
    console.error("Error updating share link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update share link",
    });
  }
};

export const revokeShareLink = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;

    const deletedShare = await db
      .delete(shareLinks)
      .where(eq(shareLinks.id, parseInt(shareId)))
      .returning();

    if (deletedShare.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Share link revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking share link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revoke share link",
    });
  }
};

export const accessSharedFile = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.shareToken, token))
      .limit(1);

    if (share.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    const shareData = share[0];

    if (!isShareValid(shareData)) {
      let reason = "Share link is no longer valid";
      if (!shareData.isActive) reason = "Share link has been revoked";
      else if (shareData.expiresAt && new Date(shareData.expiresAt) < new Date()) {
        reason = "Share link has expired";
      } else if (shareData.maxViews && shareData.currentViews >= shareData.maxViews) {
        reason = "Share link has reached maximum views";
      }

      await db.insert(shareAccessLog).values({
        shareId: shareData.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        accessType: "view",
        success: false,
      });

      return res.status(403).json({
        success: false,
        message: reason,
      });
    }

    if (shareData.passwordHash) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: "Password required",
          passwordHint: shareData.passwordHint,
          requiresPassword: true,
        });
      }

      const passwordValid = await bcrypt.compare(password, shareData.passwordHash);
      if (!passwordValid) {
        await db.insert(shareAccessLog).values({
          shareId: shareData.id,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          accessType: "view",
          success: false,
        });

        return res.status(401).json({
          success: false,
          message: "Invalid password",
          passwordHint: shareData.passwordHint,
        });
      }
    }

    const file = await db
      .select()
      .from(depositAccount)
      .where(eq(depositAccount.contentCid, shareData.contentCid))
      .limit(1);

    if (file.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    await db
      .update(shareLinks)
      .set({
        currentViews: shareData.currentViews + 1,
        lastAccessedAt: new Date(),
      })
      .where(eq(shareLinks.id, shareData.id));

    await db.insert(shareAccessLog).values({
      shareId: shareData.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      accessType: "view",
      success: true,
    });

    res.status(200).json({
      success: true,
      file: {
        cid: file[0].contentCid,
        fileName: shareData.fileName || file[0].fileName,
        fileType: shareData.fileType || file[0].fileType,
        fileSize: shareData.fileSize || file[0].fileSize,
        url: `https://w3s.link/ipfs/${file[0].contentCid}${file[0].fileName ? `/${file[0].fileName}` : ""}`,
        permissions: shareData.permissions,
      },
      share: {
        expiresAt: shareData.expiresAt,
        remainingViews: shareData.maxViews ? shareData.maxViews - shareData.currentViews - 1 : null,
      },
    });
  } catch (error) {
    console.error("Error accessing shared file:", error);
    res.status(500).json({
      success: false,
      message: "Failed to access shared file",
    });
  }
};


export const verifySharePassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const share = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.shareToken, token))
      .limit(1);

    if (share.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Share link not found",
      });
    }

    const shareData = share[0];

    if (!shareData.passwordHash) {
      return res.status(400).json({
        success: false,
        message: "This share link is not password protected",
      });
    }

    const passwordValid = await bcrypt.compare(password, shareData.passwordHash);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
        passwordHint: shareData.passwordHint,
      });
    }

    res.status(200).json({
      success: true,
      message: "Password verified successfully",
    });
  } catch (error) {
    console.error("Error verifying share password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify password",
    });
  }
};

export const getShareAnalytics = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required",
      });
    }

    const userShares = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.ownerId, (ownerId as string).toLowerCase()));

    if (userShares.length === 0) {
      return res.status(200).json({
        success: true,
        analytics: {
          totalShares: 0,
          activeShares: 0,
          totalViews: 0,
          passwordProtected: 0,
          expired: 0,
        },
      });
    }

    const shareIds = userShares.map((s) => s.id);

    const accessLogs = await db
      .select()
      .from(shareAccessLog)
      .where(
        or(...shareIds.map((id) => eq(shareAccessLog.shareId, id)))
      );

    const now = new Date();
    const analytics = {
      totalShares: userShares.length,
      activeShares: userShares.filter((s) => s.isActive && (!s.expiresAt || new Date(s.expiresAt) > now)).length,
      totalViews: userShares.reduce((sum, s) => sum + s.currentViews, 0),
      passwordProtected: userShares.filter((s) => s.passwordHash).length,
      expired: userShares.filter((s) => s.expiresAt && new Date(s.expiresAt) <= now).length,
      recentAccesses: accessLogs
        .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
        .slice(0, 10),
      viewsByDay: {},
      topShares: userShares
        .sort((a, b) => b.currentViews - a.currentViews)
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          fileName: s.fileName,
          views: s.currentViews,
          createdAt: s.createdAt,
        })),
    };

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Error fetching share analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
};
