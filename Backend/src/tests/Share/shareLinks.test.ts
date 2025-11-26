import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { db } from "../../db/db.js";
import { shareLinks, shareAccessLog, depositAccount } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

const mockFile = {
  contentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  depositKey: "7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs",
  fileName: "test-file.pdf",
  fileType: "application/pdf",
  fileSize: 1024000,
  durationDays: 30,
  depositAmount: 1000000,
  depositSlot: 1,
  lastClaimedSlot: 1,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

describe("Share Links Functionality", () => {
  let testDepositId: number;
  let testShareId: number;
  let shareToken: string;

  beforeAll(async () => {
    const deposit = await db
      .insert(depositAccount)
      .values(mockFile)
      .returning();
    testDepositId = deposit[0].id;
  });

  afterAll(async () => {
    if (testShareId) {
      await db.delete(shareAccessLog).where(eq(shareAccessLog.shareId, testShareId));
      await db.delete(shareLinks).where(eq(shareLinks.id, testShareId));
    }
    if (testDepositId) {
      await db.delete(depositAccount).where(eq(depositAccount.id, testDepositId));
    }
  });

  describe("Share Link Creation", () => {
    it("should create a share link with basic settings", async () => {
      shareToken = crypto.randomBytes(32).toString("base64url");
      
      const newShare = await db
        .insert(shareLinks)
        .values({
          shareToken,
          contentCid: mockFile.contentCid,
          ownerId: mockFile.depositKey.toLowerCase(),
          fileName: mockFile.fileName,
          fileType: mockFile.fileType,
          fileSize: mockFile.fileSize,
          permissions: ["view"],
        })
        .returning();

      testShareId = newShare[0].id;

      expect(newShare[0]).toBeDefined();
      expect(newShare[0].shareToken).toBe(shareToken);
      expect(newShare[0].contentCid).toBe(mockFile.contentCid);
      expect(newShare[0].isActive).toBe(true);
      expect(newShare[0].currentViews).toBe(0);
    });

    it("should create a password-protected share link", async () => {
      const password = "testPassword123";
      const passwordHash = await bcrypt.hash(password, 10);
      const token = crypto.randomBytes(32).toString("base64url");

      const newShare = await db
        .insert(shareLinks)
        .values({
          shareToken: token,
          contentCid: mockFile.contentCid,
          ownerId: mockFile.depositKey.toLowerCase(),
          passwordHash,
          passwordHint: "Test password with 123",
          permissions: ["view"],
        })
        .returning();

      expect(newShare[0].passwordHash).toBeDefined();
      expect(newShare[0].passwordHint).toBe("Test password with 123");

      const isValid = await bcrypt.compare(password, newShare[0].passwordHash!);
      expect(isValid).toBe(true);

      await db.delete(shareLinks).where(eq(shareLinks.id, newShare[0].id));
    });

    it("should create a share link with expiration", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const token = crypto.randomBytes(32).toString("base64url");

      const newShare = await db
        .insert(shareLinks)
        .values({
          shareToken: token,
          contentCid: mockFile.contentCid,
          ownerId: mockFile.depositKey.toLowerCase(),
          expiresAt,
          permissions: ["view"],
        })
        .returning();

      expect(newShare[0].expiresAt).toBeDefined();
      expect(new Date(newShare[0].expiresAt!).getTime()).toBeGreaterThan(Date.now());

      await db.delete(shareLinks).where(eq(shareLinks.id, newShare[0].id));
    });

    it("should create a share link with view limit", async () => {
      const token = crypto.randomBytes(32).toString("base64url");

      const newShare = await db
        .insert(shareLinks)
        .values({
          shareToken: token,
          contentCid: mockFile.contentCid,
          ownerId: mockFile.depositKey.toLowerCase(),
          maxViews: 10,
          permissions: ["view"],
        })
        .returning();

      expect(newShare[0].maxViews).toBe(10);
      expect(newShare[0].currentViews).toBe(0);

      await db.delete(shareLinks).where(eq(shareLinks.id, newShare[0].id));
    });
  });

  describe("Share Link Access", () => {
    it("should retrieve share by token", async () => {
      const share = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.shareToken, shareToken))
        .limit(1);

      expect(share.length).toBe(1);
      expect(share[0].shareToken).toBe(shareToken);
    });

    it("should increment view count on access", async () => {
      const share = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.id, testShareId))
        .limit(1);

      const initialViews = share[0].currentViews;

      await db
        .update(shareLinks)
        .set({
          currentViews: initialViews + 1,
          lastAccessedAt: new Date(),
        })
        .where(eq(shareLinks.id, testShareId));

      const updatedShare = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.id, testShareId))
        .limit(1);

      expect(updatedShare[0].currentViews).toBe(initialViews + 1);
      expect(updatedShare[0].lastAccessedAt).toBeDefined();
    });

    it("should log access attempts", async () => {
      const accessLog = await db
        .insert(shareAccessLog)
        .values({
          shareId: testShareId,
          ipAddress: "127.0.0.1",
          userAgent: "Jest Test",
          accessType: "view",
          success: true,
        })
        .returning();

      expect(accessLog[0]).toBeDefined();
      expect(accessLog[0].shareId).toBe(testShareId);
      expect(accessLog[0].success).toBe(true);
    });
  });

  describe("Share Link Management", () => {
    it("should update share settings", async () => {
      const newExpiration = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const updated = await db
        .update(shareLinks)
        .set({
          expiresAt: newExpiration,
          maxViews: 20,
        })
        .where(eq(shareLinks.id, testShareId))
        .returning();

      expect(updated[0].maxViews).toBe(20);
      expect(new Date(updated[0].expiresAt!).getTime()).toBeGreaterThan(Date.now());
    });

    it("should disable/enable share link", async () => {
      await db
        .update(shareLinks)
        .set({ isActive: false })
        .where(eq(shareLinks.id, testShareId));

      let share = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.id, testShareId))
        .limit(1);

      expect(share[0].isActive).toBe(false);

      await db
        .update(shareLinks)
        .set({ isActive: true })
        .where(eq(shareLinks.id, testShareId));

      share = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.id, testShareId))
        .limit(1);

      expect(share[0].isActive).toBe(true);
    });

    it("should get all shares for a user", async () => {
      const userShares = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.ownerId, mockFile.depositKey.toLowerCase()));

      expect(userShares.length).toBeGreaterThan(0);
      expect(userShares.every(s => s.ownerId === mockFile.depositKey.toLowerCase())).toBe(true);
    });
  });

  describe("Share Link Validation", () => {
    it("should validate active share", async () => {
      const share = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.id, testShareId))
        .limit(1);

      const isValid = share[0].isActive && 
                     (!share[0].expiresAt || new Date(share[0].expiresAt) > new Date()) &&
                     (!share[0].maxViews || share[0].currentViews < share[0].maxViews);

      expect(isValid).toBe(true);
    });

    it("should detect expired share", async () => {
      const expiredToken = crypto.randomBytes(32).toString("base64url");
      const expiredShare = await db
        .insert(shareLinks)
        .values({
          shareToken: expiredToken,
          contentCid: mockFile.contentCid,
          ownerId: mockFile.depositKey.toLowerCase(),
          expiresAt: new Date(Date.now() - 1000), // Expired
          permissions: ["view"],
        })
        .returning();

      const isValid = (!expiredShare[0].expiresAt || new Date(expiredShare[0].expiresAt) > new Date());
      expect(isValid).toBe(false);

      await db.delete(shareLinks).where(eq(shareLinks.id, expiredShare[0].id));
    });

    it("should detect view limit reached", async () => {
      const limitedToken = crypto.randomBytes(32).toString("base64url");
      const limitedShare = await db
        .insert(shareLinks)
        .values({
          shareToken: limitedToken,
          contentCid: mockFile.contentCid,
          ownerId: mockFile.depositKey.toLowerCase(),
          maxViews: 5,
          currentViews: 5,
          permissions: ["view"],
        })
        .returning();

      const isValid = (!limitedShare[0].maxViews || limitedShare[0].currentViews < limitedShare[0].maxViews);
      expect(isValid).toBe(false);

      await db.delete(shareLinks).where(eq(shareLinks.id, limitedShare[0].id));
    });
  });
});
