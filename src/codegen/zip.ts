export interface ZipEntry {
  path: string;
  content: string | Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/** Compute standard IEEE 802.3 CRC-32 checksum used by PKZIP headers. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(now: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, now.getFullYear());
  const dosDate = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  return { dosTime, dosDate };
}

/**
 * Create a standards-compliant PKZIP binary archive (STORE method + UTF-8 filenames)
 * suitable for browser Blob downloads and Node unit verification without external dependencies.
 */
export function createZipArchive(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const { dosTime, dosDate } = dosDateTime(new Date());

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const cleanPath = entry.path.replace(/^\/+/, "").replace(/\\/g, "/");
    const nameBytes = encoder.encode(cleanPath);
    const dataBytes =
      typeof entry.content === "string" ? encoder.encode(entry.content) : entry.content;
    const sum = crc32(dataBytes);
    const size = dataBytes.length;

    // 30-byte Local File Header
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local header signature
    lv.setUint16(4, 20, true); // version needed (2.0)
    lv.setUint16(6, 0x0800, true); // UTF-8 filename encoding flag
    lv.setUint16(8, 0, true); // compression: STORE
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, sum, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    // 46-byte Central Directory Header
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 filename encoding flag
    cv.setUint16(10, 0, true); // compression: STORE
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, localOffset, true);
    central.set(nameBytes, 46);

    localParts.push(local, dataBytes);
    centralParts.push(central);
    localOffset += local.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((acc, part) => acc + part.length, 0);

  // 22-byte End of Central Directory Record
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, localOffset, true);
  ev.setUint16(20, 0, true);

  const totalLength = localOffset + centralSize + eocd.length;
  const archive = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of localParts) {
    archive.set(part, pos);
    pos += part.length;
  }
  for (const part of centralParts) {
    archive.set(part, pos);
    pos += part.length;
  }
  archive.set(eocd, pos);

  return archive;
}
