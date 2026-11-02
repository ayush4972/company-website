import { crc32, inflateRawSync } from 'node:zlib';

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_FILE_BYTES / 3);
const MAX_XML_BYTES = 2 * 1024 * 1024;

function isPdf(file) {
    const text = file.toString('latin1');
    if (!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(text) || !/\b\d+\s+\d+\s+obj\b/.test(text)) return false;
    const end = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(text.slice(-1024));
    if (!end) return false;
    const offset = Number(end[1]);
    if (!Number.isSafeInteger(offset) || offset < 8 || offset >= file.length) return false;
    // Support traditional xref tables and the xref streams used by newer PDFs.
    return /^(?:xref\b|\d+\s+\d+\s+obj\b)/.test(text.slice(offset));
}

function isDoc(file) {
    const signature = Buffer.from('d0cf11e0a1b11ae1', 'hex');
    if (file.length < 512 || !file.subarray(0, 8).equals(signature) || file.readUInt16LE(28) !== 0xfffe) return false;
    const major = file.readUInt16LE(26);
    const shift = file.readUInt16LE(30);
    if (!((major === 3 && shift === 9) || (major === 4 && shift === 12))) return false;
    const size = 2 ** shift;
    if (file.length % size !== 0) return false;
    const sectors = file.length / size - 1;
    const fatCount = file.readUInt32LE(44);
    // A 3 MiB CFB file fits in the header's DIFAT; reject malformed chains.
    if (fatCount === 0 || fatCount > 109) return false;
    const fat = [];
    for (let i = 0; i < fatCount; i++) {
        const sector = file.readUInt32LE(76 + i * 4);
        if (sector >= sectors) return false;
        const start = (sector + 1) * size;
        for (let offset = 0; offset < size; offset += 4) fat.push(file.readUInt32LE(start + offset));
    }
    let sector = file.readUInt32LE(48);
    const visited = new Set();
    const streams = new Map();
    let root;
    while (sector !== 0xfffffffe) {
        if (sector >= sectors || sector >= fat.length || visited.has(sector)) return false;
        visited.add(sector);
        const start = (sector + 1) * size;
        for (let offset = 0; offset < size; offset += 128) {
            const entry = start + offset;
            const type = file[entry + 66];
            if (type === 0) continue;
            const length = file.readUInt16LE(entry + 64);
            if (length < 2 || length > 64 || length % 2 !== 0) return false;
            const name = file.toString('utf16le', entry, entry + length - 2);
            const length64 = file.readBigUInt64LE(entry + 120);
            if (length64 > BigInt(MAX_FILE_BYTES)) return false;
            const stream = { start: file.readUInt32LE(entry + 116), length: Number(length64) };
            if (type === 2) streams.set(name, stream);
            if (type === 5) root = stream;
        }
        sector = fat[sector];
    }
    const word = streams.get('WordDocument');
    const table = streams.get('0Table') || streams.get('1Table');
    if (!root || !word || word.length < 32 || !table?.length || file.readUInt32LE(56) !== 4096) return false;
    const readChain = (start, length, allocation, sectorSize, bytes, headerSize = 0) => {
        const chunks = [];
        const seen = new Set();
        let current = start;
        let received = 0;
        while (received < length) {
            const offset = current * sectorSize + headerSize;
            if (current >= allocation.length || seen.has(current) || offset + sectorSize > bytes.length) return null;
            seen.add(current);
            chunks.push(bytes.subarray(offset, offset + sectorSize));
            received += sectorSize;
            current = allocation[current];
        }
        return Buffer.concat(chunks).subarray(0, length);
    };
    let content;
    if (word.length >= 4096) content = readChain(word.start, word.length, fat, size, file, size);
    else {
        if (file.readUInt16LE(32) !== 6) return false;
        const miniFatCount = file.readUInt32LE(64);
        if (!miniFatCount || miniFatCount > sectors || !root.length) return false;
        const miniFatBytes = readChain(file.readUInt32LE(60), miniFatCount * size, fat, size, file, size);
        const miniStream = readChain(root.start, root.length, fat, size, file, size);
        if (!miniFatBytes || !miniStream) return false;
        const miniFat = [];
        for (let i = 0; i < miniFatBytes.length; i += 4) miniFat.push(miniFatBytes.readUInt32LE(i));
        content = readChain(word.start, word.length, miniFat, 64, miniStream);
    }
    // The Word binary stream starts with the File Information Block identifier.
    return content?.readUInt16LE(0) === 0xa5ec;
}

function docxXml(file) {
    // Read the bounded central directory, not arbitrary PK strings in the payload.
    let end = -1;
    for (let i = file.length - 22; i >= Math.max(0, file.length - 65557); i--) {
        if (file.readUInt32LE(i) === 0x06054b50 && i + 22 + file.readUInt16LE(i + 20) === file.length) { end = i; break; }
    }
    if (end < 0 || file.readUInt16LE(end + 4) !== 0 || file.readUInt16LE(end + 6) !== 0) return null;
    const count = file.readUInt16LE(end + 10);
    const directorySize = file.readUInt32LE(end + 12);
    const directoryStart = file.readUInt32LE(end + 16);
    let cursor = directoryStart;
    if (!count || count > 1024 || file.readUInt16LE(end + 8) !== count || cursor + directorySize !== end) return null;
    const xml = new Map();
    const names = new Set();
    for (let i = 0; i < count; i++) {
        if (cursor + 46 > end || file.readUInt32LE(cursor) !== 0x02014b50) return null;
        const flags = file.readUInt16LE(cursor + 8);
        const method = file.readUInt16LE(cursor + 10);
        const compressed = file.readUInt32LE(cursor + 20);
        const expanded = file.readUInt32LE(cursor + 24);
        const nameLength = file.readUInt16LE(cursor + 28);
        const extraLength = file.readUInt16LE(cursor + 30);
        const commentLength = file.readUInt16LE(cursor + 32);
        const local = file.readUInt32LE(cursor + 42);
        const next = cursor + 46 + nameLength + extraLength + commentLength;
        if (next > end || local + 30 > directoryStart || file.readUInt16LE(cursor + 34) !== 0) return null;
        const name = file.toString('utf8', cursor + 46, cursor + 46 + nameLength);
        if (names.has(name) || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..')) return null;
        names.add(name);
        if (flags & 1 || ![0, 8].includes(method)) return null;
        if (file.readUInt32LE(local) !== 0x04034b50) return null;
        if (file.readUInt16LE(local + 6) !== flags || file.readUInt16LE(local + 8) !== method) return null;
        const localNameLength = file.readUInt16LE(local + 26);
        const localExtraLength = file.readUInt16LE(local + 28);
        const data = local + 30 + localNameLength + localExtraLength;
        if (data + compressed > directoryStart || file.toString('utf8', local + 30, local + 30 + localNameLength) !== name) return null;
        if (name === '[Content_Types].xml' || name === 'word/document.xml') {
            if (!expanded || expanded > MAX_XML_BYTES) return null;
            const bytes = file.subarray(data, data + compressed);
            const content = method === 0 ? bytes : inflateRawSync(bytes, { maxOutputLength: MAX_XML_BYTES });
            if (content.length !== expanded || crc32(content) !== file.readUInt32LE(cursor + 16)) return null;
            xml.set(name, content.toString('utf8'));
        }
        cursor = next;
    }
    return cursor === end ? xml : null;
}

function isDocx(file) {
    if (file.length < 22 || file.readUInt32LE(0) !== 0x04034b50) return false;
    const xml = docxXml(file);
    const types = xml?.get('[Content_Types].xml') || '';
    const document = xml?.get('word/document.xml') || '';
    return /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml/.test(types)
        && /<(?:[\w.-]+:)?document\b/.test(document)
        && /<(?:[\w.-]+:)?body\b/.test(document)
        && /<\/(?:[\w.-]+:)?document\s*>/.test(document)
        && /(?:schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main|purl\.oclc\.org\/ooxml\/wordprocessingml\/main)/.test(document);
}

export function validateAttachment(filename, fileBase64) {
    if (filename === undefined && fileBase64 === undefined) return {};
    if (typeof filename !== 'string' || typeof fileBase64 !== 'string') throw new Error('Please attach a PDF, DOC, or DOCX file.');
    const name = filename.trim();
    if (!name || name.length > 200 || /[\x00-\x1f\x7f/\\]/.test(name) || !/\.(pdf|doc|docx)$/i.test(name)) throw new Error('Please attach a PDF, DOC, or DOCX file with a valid filename.');
    if (fileBase64.length > MAX_BASE64_LENGTH) {
        const error = new Error('CV file is too large. Please keep it at 3 MB or smaller.');
        error.status = 413;
        throw error;
    }
    // The round trip below rejects misplaced padding and noncanonical pad bits.
    // Avoid a repeated-group regex, which can exhaust the stack on a 3 MiB file.
    if (!fileBase64 || fileBase64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(fileBase64)) throw new Error('The CV could not be read. Please choose the original file again.');
    const file = Buffer.from(fileBase64, 'base64');
    if (!file.length || file.length > MAX_FILE_BYTES || file.toString('base64') !== fileBase64) throw new Error('The CV could not be read. Please choose the original file again.');
    const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
    let valid = false;
    try { valid = extension === 'pdf' ? isPdf(file) : extension === 'doc' ? isDoc(file) : isDocx(file); }
    catch { valid = false; }
    if (!valid) throw new Error('The CV contents do not match its file type. Please upload an original PDF, DOC, or DOCX file.');
    return { filename: name, fileBase64 };
}
