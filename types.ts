
export interface LineItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  glCategory: string;
  // AI Enhancements
  glConfidence?: number; // 0-100
  glReasoning?: string;
}

export interface InvoiceData {
  id: string; // Unique session ID
  documentType: string;
  vendorName: string;
  invoiceDate: string;
  totalAmount: number;
  currencySymbol: string;
  lineItems: LineItem[];
  language?: string; // Tracks the current language of the data (e.g., 'Original', 'English')
  detectedLanguage?: string; // The language detected by AI during extraction
  originalLineItems?: LineItem[]; // Backup of the original extraction for reverting/re-translating
  processingTimeMs?: number; // Time taken to process this document
  isDemo?: boolean; // Flag for mock data
  
  // Quality Indicators
  validationFlags?: {
    hasZeroPrices?: boolean;
    lowItemCount?: boolean;
    missingMetadata?: boolean;
    unsupportedCurrency?: boolean; // New flag
    unsupportedLanguage?: boolean; // New flag
  };
  confidenceScore?: 'High' | 'Medium' | 'Low';
  
  // Sensitive Data
  hasSensitiveData?: boolean;
  sensitiveDataTypes?: string[];
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error' | 'quota_cooldown';
  message?: string;
  errorCode?: 'QUOTA_EXCEEDED' | 'READ_ERROR' | 'INVALID_FILE' | 'GENERIC';
  retryIn?: number; // Seconds until retry
}
