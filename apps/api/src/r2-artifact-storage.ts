import type { ArtifactStorage, StoredArtifact } from "../../../packages/storage/src/artifact-storage.js";

export class R2ArtifactStorage implements ArtifactStorage {
  constructor(private readonly bucket: R2Bucket) {}

  async putArtifact(key: string, mediaType: string, content: ArrayBuffer): Promise<void> {
    await this.bucket.put(key, content, {
      httpMetadata: {
        contentType: mediaType
      }
    });
  }

  async getArtifact(key: string): Promise<StoredArtifact | null> {
    const object = await this.bucket.get(key);
    if (!object) {
      return null;
    }

    return {
      key,
      mediaType: object.httpMetadata?.contentType ?? "application/octet-stream",
      content: await object.arrayBuffer()
    };
  }
}
