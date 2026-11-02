const MAX_CV_BYTES = 3 * 1024 * 1024;

/** Native FormData supplies an empty, unnamed File when no CV was selected. */
export function validateCareerFile(file) {
  if (!file?.name) return false;
  if (!file.size) throw new Error('The selected CV is empty. Please choose a non-empty PDF, DOC, or DOCX file.');
  if (file.size > MAX_CV_BYTES) throw new Error('Your CV must be 3 MB or smaller. Please choose a smaller file.');
  if (!/\.(pdf|doc|docx)$/i.test(file.name)) throw new Error('Please choose a PDF, DOC, or DOCX file.');
  return true;
}
