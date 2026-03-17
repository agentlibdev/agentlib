export type StoredArtifact = {
  key: string;
  mediaType: string;
  content: ArrayBuffer;
};

export interface ArtifactStorage {
  putArtifact(key: string, mediaType: string, content: ArrayBuffer): Promise<void>;
  getArtifact(key: string): Promise<StoredArtifact | null>;
}
