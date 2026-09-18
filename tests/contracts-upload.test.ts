import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/lib/objectStorage", () => ({
  buildObjectKey: (institutionId: string, activityId: string, fileName: string) =>
    `contracts/${institutionId}/${activityId}/test-${fileName}`,
  createUploadUrl: vi.fn(async (key: string) => `https://mock-s3.example.com/${key}?upload`),
  createDownloadUrl: vi.fn(async (key: string) => `https://mock-s3.example.com/${key}?download`),
  headObject: vi.fn(),
  deleteObject: vi.fn(async () => undefined),
}));

import { headObject, deleteObject } from "../src/lib/objectStorage";
import { createApp } from "../src/app";
import { prisma } from "../src/db/prisma";
import { signToken } from "../src/middleware/auth";

const app = createApp();

describe("contract file upload flow (integration, object storage mocked)", () => {
  let institutionId: string;
  let activityId: string;
  let token: string;

  beforeAll(async () => {
    const institution = await prisma.institutionProfile.create({
      data: { name: `Upload-Test GmbH ${Date.now()}` },
    });
    institutionId = institution.id;

    const user = await prisma.user.create({
      data: {
        institutionId,
        email: `upload-test-${Date.now()}@example.com`,
        passwordHash: "x",
        name: "Test User",
        role: "AUSLAGERUNGSBEAUFTRAGTER",
      },
    });
    token = signToken({ userId: user.id, institutionId, role: user.role, name: user.name });

    const activity = await prisma.outsourcingActivity.create({
      data: { institutionId, name: "Test Auslagerung", category: "Test", scope: "AUSLAGERUNG" },
    });
    activityId = activity.id;
  });

  afterAll(async () => {
    await prisma.auditLogEvent.deleteMany({ where: { entityId: activityId } });
    await prisma.contract.deleteMany({ where: { activityId } });
    await prisma.outsourcingActivity.deleteMany({ where: { id: activityId } });
    await prisma.user.deleteMany({ where: { institutionId } });
    await prisma.institutionProfile.deleteMany({ where: { id: institutionId } });
    await prisma.$disconnect();
  });

  it("rejects a disallowed mime type on upload-url", async () => {
    const res = await request(app)
      .post(`/api/activities/${activityId}/contract/upload-url`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fileName: "malware.exe", fileMime: "application/x-msdownload", fileSize: 1000 });
    expect(res.status).toBe(422);
  });

  it("issues a pre-signed upload URL for an allowed file", async () => {
    const res = await request(app)
      .post(`/api/activities/${activityId}/contract/upload-url`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fileName: "vertrag.pdf", fileMime: "application/pdf", fileSize: 12345 });
    expect(res.status).toBe(200);
    expect(res.body.objectKey).toContain(activityId);
    expect(res.body.uploadUrl).toContain("upload");
  });

  it("rejects confirming a file that was never actually uploaded", async () => {
    vi.mocked(headObject).mockResolvedValueOnce(null);
    const res = await request(app)
      .put(`/api/activities/${activityId}/contract`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fileObjectKey: "contracts/fake-key", fileName: "vertrag.pdf", fileSize: 12345, fileMime: "application/pdf" });
    expect(res.status).toBe(422);
  });

  it("rejects confirming a file whose real size doesn't match the claim", async () => {
    vi.mocked(headObject).mockResolvedValueOnce({ size: 99, contentType: "application/pdf" });
    const res = await request(app)
      .put(`/api/activities/${activityId}/contract`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fileObjectKey: "contracts/real-key", fileName: "vertrag.pdf", fileSize: 12345, fileMime: "application/pdf" });
    expect(res.status).toBe(422);
  });

  it("records the file after confirming a real upload, and writes an audit log row", async () => {
    vi.mocked(headObject).mockResolvedValueOnce({ size: 12345, contentType: "application/pdf" });
    const res = await request(app)
      .put(`/api/activities/${activityId}/contract`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fileObjectKey: "contracts/real-key", fileName: "vertrag.pdf", fileSize: 12345, fileMime: "application/pdf" });
    expect(res.status).toBe(200);
    expect(res.body.fileObjectKey).toBe("contracts/real-key");

    const auditRows = await prisma.auditLogEvent.findMany({ where: { entityId: activityId, entityType: "Contract" } });
    expect(auditRows.length).toBeGreaterThan(0);
  });

  it("returns a pre-signed download URL once a file is on record", async () => {
    const res = await request(app)
      .get(`/api/activities/${activityId}/contract/download-url`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toContain("download");
  });

  it("deletes the previous object when the file is replaced", async () => {
    vi.mocked(headObject).mockResolvedValueOnce({ size: 999, contentType: "application/pdf" });
    const res = await request(app)
      .put(`/api/activities/${activityId}/contract`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fileObjectKey: "contracts/replacement-key", fileName: "vertrag-v2.pdf", fileSize: 999, fileMime: "application/pdf" });
    expect(res.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith("contracts/real-key");
  });

  it("removes the file via DELETE .../contract/file", async () => {
    const res = await request(app)
      .delete(`/api/activities/${activityId}/contract/file`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.fileObjectKey).toBeNull();
  });

  it("enforces RBAC — VIEWER cannot request an upload URL", async () => {
    const viewer = await prisma.user.create({
      data: { institutionId, email: `viewer-${Date.now()}@example.com`, passwordHash: "x", name: "Viewer", role: "VIEWER" },
    });
    const viewerToken = signToken({ userId: viewer.id, institutionId, role: "VIEWER", name: viewer.name });
    const res = await request(app)
      .post(`/api/activities/${activityId}/contract/upload-url`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ fileName: "vertrag.pdf", fileMime: "application/pdf", fileSize: 1000 });
    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: viewer.id } });
  });

  it("scopes activities to the caller's own institution — a different institution gets 404", async () => {
    const otherInstitution = await prisma.institutionProfile.create({ data: { name: `Other GmbH ${Date.now()}` } });
    const otherUser = await prisma.user.create({
      data: {
        institutionId: otherInstitution.id,
        email: `other-${Date.now()}@example.com`,
        passwordHash: "x",
        name: "Other User",
        role: "AUSLAGERUNGSBEAUFTRAGTER",
      },
    });
    const otherToken = signToken({ userId: otherUser.id, institutionId: otherInstitution.id, role: otherUser.role, name: otherUser.name });

    const res = await request(app)
      .post(`/api/activities/${activityId}/contract/upload-url`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ fileName: "vertrag.pdf", fileMime: "application/pdf", fileSize: 1000 });
    expect(res.status).toBe(404);

    await prisma.user.delete({ where: { id: otherUser.id } });
    await prisma.institutionProfile.delete({ where: { id: otherInstitution.id } });
  });
});
