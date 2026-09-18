import { ValidationError } from "../../utils/errors";

export const ALLOWED_CONTRACT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
]);

export const MAX_CONTRACT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function assertValidContractFile(fileMime: string, fileSize: number): void {
  if (!ALLOWED_CONTRACT_MIME_TYPES.has(fileMime)) {
    throw new ValidationError(`Dateityp "${fileMime}" ist für Vertragsdokumente nicht zulässig`);
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_CONTRACT_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `Dateigröße muss zwischen 1 Byte und ${MAX_CONTRACT_FILE_SIZE_BYTES / (1024 * 1024)} MB liegen`
    );
  }
}
