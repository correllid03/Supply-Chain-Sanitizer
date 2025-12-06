
export interface LineItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  glCategory: string;
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
  originalLineItems?: LineItem[]; // Backup of the original extraction for reverting/re-translating
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
}