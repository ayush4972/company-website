import { sendCareersEmail } from '../backend/mailer.js';
import { createSubmissionHandler } from '../backend/submissionHandler.js';

export default createSubmissionHandler('careers', sendCareersEmail);
