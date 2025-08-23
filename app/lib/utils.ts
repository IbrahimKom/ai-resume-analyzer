/**
 * Convert a byte size into a human-readable string using KB, MB, or GB.
 * - Uses base 1024 for unit conversion.
 * - Rounds to 1 decimal place and trims trailing .0.
 * - Values < 0 are treated as 0.
 * - For any value < 1 KB, returns "0 KB" to keep units consistent with the requirement.
 */
export function formatSize(bytes: number): string {
  const safeBytes = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;

  const KB = 1024;
  const MB = 1024 * KB;
  const GB = 1024 * MB;

  const trim = (n: number) => {
    const s = n.toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  };

  if (safeBytes >= GB) {
    return `${trim(safeBytes / GB)} GB`;
  }
  if (safeBytes >= MB) {
    return `${trim(safeBytes / MB)} MB`;
  }
  if (safeBytes >= KB) {
    return `${trim(safeBytes / KB)} KB`;
  }
  // Below 1 KB: keep unit as KB per requirement
  return '0 KB';
}

export const generateUUID = () => crypto.randomUUID();
export default formatSize;
