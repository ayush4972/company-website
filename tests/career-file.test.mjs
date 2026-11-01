import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCareerFile } from '../frontend/js/career-file.js';

test('no CV selection remains optional, but a selected zero-byte CV is rejected', () => {
  assert.equal(validateCareerFile(new File([], '')), false);
  assert.throws(() => validateCareerFile(new File([], 'cv.pdf')), /selected CV is empty/);
});

test('a permitted nonempty file passes while unsupported or oversized CVs fail', () => {
  assert.equal(validateCareerFile(new File(['test content'], 'CV.PDF')), true);
  assert.throws(() => validateCareerFile(new File(['test content'], 'cv.exe')), /PDF, DOC, or DOCX/);
  assert.throws(() => validateCareerFile(new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'cv.docx')), /3 MB or smaller/);
});
