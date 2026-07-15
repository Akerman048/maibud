export type PresignDocumentUploadRequest = {
  projectId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type PresignDocumentUploadResponse = {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
};

export type CompleteDocumentUploadRequest = {
  projectId: string;
  title: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
};

export type CompleteDocumentUploadResponse = {
  documentId: string;
  versionId: string;
  version: number;
};

export type PresignDocumentVersionUploadRequest = {
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type PresignDocumentVersionUploadResponse = {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
};

export type CompleteDocumentVersionUploadRequest = {
  objectKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
};

export type CompleteDocumentVersionUploadResponse = {
  documentId: string;
  versionId: string;
  version: number;
};