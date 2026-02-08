export interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
  needsValidation?: boolean;
  validationStatus?: 'verified' | 'corrected';
  isValidatorResponse?: boolean; // Added for debugging, might not be needed in final version
  displayInChat?: boolean; // New property
  isFinalHtml?: boolean; // Added for final HTML output
}
