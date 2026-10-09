/** Creates a random, collision-resistant identifier (RFC 4122 v4 UUID). */
export function createId(): string {
  return crypto.randomUUID();
}
