

export interface TranslationDictionary {
  appTitle: string;
  sanitizer: string;
  toggleTheme: string;
  translateTo: string;
  interfaceLanguage: string;
  targetCurrency: string;
  original: string;
  heroTitle: string;
  heroSubtitle: string;
  financialData: string;
  dropZoneMain: string;
  dropZoneSub: string;
  uploadError: string;
  sanitizeAction: string;
  processing: string;
  activeDoc: string;
  sanitizeNew: string;
  extractedData: string;
  translating: string;
  exportCsv: string;
  
  // Sidebar
  sessionTrail: string;
  sessionStats: string;
  noDocs: string;
  riskDetected: string;
  clean: string;
  riskTag: string;
  totalDocs: string;
  totalValue: string;
  avgTime: string;
  topCategories: string;
  languages: string;
  seconds: string;
  sessionActive: string;
  sessionPrivacyInfo: string;
  spendingBreakdown: string;
  vendorFrequency: string;
  currencyDist: string;
  recentActivity: string;
  other: string;
  docComposition: string;
  
  // Editor
  documentType: string;
  vendorName: string;
  invoiceDate: string;
  currency: string;
  totalAmount: string;
  staleDataWarning: string;
  staleTag: string;
  lineItems: string;
  itemsDetected: string;
  sku: string;
  description: string;
  glCategory: string;
  qty: string;
  unitPrice: string;
  lineTotal: string;
  convertedTotal: string;
  exchangeRate: string;
  mathMismatch: string;
  expected: string;
  noLineItems: string;
  addLineItem: string;
  highRisk: string;
  recalculate: string;
  fixAll: string;
  sensitiveDetected: string;
  complianceWarning: string;
  
  // CSV Headers
  csvDocumentType: string;
  csvVendor: string;
  csvDate: string;
  csvTotalAmount: string;
  csvCurrency: string;
  csvSku: string;
  csvDescription: string;
  csvGlCategory: string;
  csvQuantity: string;
  csvUnitPrice: string;
  csvLineTotal: string;

  // Errors & Quality
  quotaError: string;
  quotaCooldown: string;
  readError: string;
  fileTypeError: string;
  analyzing: string;
  sanitizing: string;
  confidenceHigh: string;
  confidenceReview: string;
  verifyPrices: string;
  lowItemCount: string;
  tryAgain: string;
  clearData: string;
  clearDataConfirmTitle: string;
  clearDataConfirmMessage: string;
  dataClearedSuccess: string;

  // Examples
  tryExample: string;
  exampleReceipt: string;
  exampleMultilang: string;
  exampleCurrency: string;

  // Navigation
  home: string;
  newInvoice: string;
  history: string;
  unsavedChanges: string;
  exportAll: string;
  breadcrumbsProcessing: string;
  sessionMenu: string;

  // Batch
  filesSelected: string;
  sanitizeBatch: string;
  processingBatch: string;
  batchComplete: string;
  exportCombined: string;

  // Actions
  copied: string;
  copyToClipboard: string;
  printPdf: string;

  // Mobile Scan
  initScan: string;
  scanInvoice: string;
}

const baseEnglish: TranslationDictionary = {
    appTitle: "E.S.T.E.R.",
    sanitizer: "Beta",
    toggleTheme: "Toggle Theme",
    translateTo: "Data Output",
    interfaceLanguage: "Interface Language",
    targetCurrency: "Target Currency",
    original: "Original",
    heroTitle: "Digitize Your",
    financialData: "Financial Data",
    heroSubtitle: "Extraction System for Transactional Entity Reconciliation. Transforming unstructured chaos into transformed, ERP-ready data.",
    dropZoneMain: "Drop invoices here",
    dropZoneSub: "Batch processing supported (Max 5)",
    uploadError: "Failed to extract data. Please try a clearer image.",
    sanitizeAction: "TRANSFORM DOCUMENT",
    processing: "Extracting data...",
    activeDoc: "Active Document",
    sanitizeNew: "Transform New File",
    extractedData: "EXTRACTED DATA",
    translating: "Translating...",
    exportCsv: "Export CSV",
    sessionTrail: "Session Audit Trail",
    sessionStats: "Session Analytics",
    noDocs: "No documents processed yet.",
    riskDetected: "Risk Detected",
    clean: "Transformed",
    riskTag: "RISK",
    totalDocs: "Total Documents",
    totalValue: "Total Value (USD)",
    avgTime: "Avg Transformation Time",
    topCategories: "Top GL Categories",
    languages: "Languages Detected",
    seconds: "s",
    sessionActive: "Session active: {minutes}m",
    sessionPrivacyInfo: "All data is stored in your browser session only. Data will be cleared when you close this tab or browser.",
    spendingBreakdown: "Spending by GL Category",
    vendorFrequency: "Top Vendors",
    currencyDist: "Currency Distribution",
    recentActivity: "Session Activity",
    other: "Other",
    docComposition: "Doc Composition",
    documentType: "DOCUMENT TYPE",
    vendorName: "Vendor Name",
    invoiceDate: "Invoice Date",
    currency: "Currency",
    totalAmount: "Total Amount",
    staleDataWarning: "Stale Data (> 2 Years)",
    staleTag: "STALE",
    lineItems: "LINE ITEMS",
    itemsDetected: "items detected",
    sku: "SKU",
    description: "Description",
    glCategory: "GL Category",
    qty: "Qty",
    unitPrice: "Unit Price",
    lineTotal: "Total",
    convertedTotal: "Converted Total",
    exchangeRate: "Rate",
    mathMismatch: "Math Mismatch",
    expected: "Expected",
    noLineItems: "No line items extracted. Use the button below to add one.",
    addLineItem: "Add Line Item",
    highRisk: "High Risk",
    recalculate: "Fix",
    fixAll: "Recalculate All",
    sensitiveDetected: "Sensitive Information Detected",
    complianceWarning: "Handle with care and ensure compliance with data protection regulations.",
    csvDocumentType: "Document Type",
    csvVendor: "Vendor",
    csvDate: "Date",
    csvTotalAmount: "Total Amount",
    csvCurrency: "Currency",
    csvSku: "SKU",
    csvDescription: "Description",
    csvGlCategory: "GL Category",
    csvQuantity: "Quantity",
    csvUnitPrice: "Unit Price",
    csvLineTotal: "Line Total",
    quotaError: "Processing limit reached.",
    quotaCooldown: "Retrying in",
    readError: "Unable to read document. Try a clearer image.",
    fileTypeError: "Invalid file. Please upload an Image or PDF.",
    analyzing: "Analyzing document structure...",
    sanitizing: "Transforming input data...",
    confidenceHigh: "High Confidence",
    confidenceReview: "Review Recommended",
    verifyPrices: "Verify Prices",
    lowItemCount: "Low Item Count",
    tryAgain: "Try Again",
    clearData: "Clear All Session Data",
    clearDataConfirmTitle: "Clear All Session Data?",
    clearDataConfirmMessage: "This will permanently delete all processed invoices from this session. This action cannot be undone.",
    dataClearedSuccess: "All data cleared. Your session is now empty.",
    tryExample: "Try an Example:",
    exampleReceipt: "Simple Receipt (USD)",
    exampleMultilang: "Manufacturing (JPN)",
    exampleCurrency: "Travel Invoice (EUR)",
    home: "Home",
    newInvoice: "New Invoice",
    history: "Audit Trail",
    unsavedChanges: "You have unsaved changes. Are you sure you want to start a new invoice?",
    exportAll: "Export Combined CSV",
    breadcrumbsProcessing: "Processing...",
    sessionMenu: "Session & Analytics",
    filesSelected: "files selected",
    sanitizeBatch: "TRANSFORM {count} DOCUMENTS",
    processingBatch: "Transforming {current} of {total}: {filename}...",
    batchComplete: "Batch transformation complete!",
    exportCombined: "Export Combined CSV",
    copied: "Copied to clipboard!",
    copyToClipboard: "Copy to Clipboard",
    printPdf: "Print / Save as PDF",
    initScan: "INITIALIZE SCAN",
    scanInvoice: "Scan Invoice"
};

// For now, we populate other languages with English defaults to prevent crashes
// In a real app, these would be proper translations
export const translations: Record<string, TranslationDictionary> = {
  English: { ...baseEnglish },
  Spanish: { ...baseEnglish, appTitle: "E.S.T.E.R. (ES)" },
  French: { ...baseEnglish, appTitle: "E.S.T.E.R. (FR)" },
  German: { ...baseEnglish, appTitle: "E.S.T.E.R. (DE)" },
  Chinese: { ...baseEnglish, appTitle: "E.S.T.E.R. (CN)" },
  Japanese: { ...baseEnglish, appTitle: "E.S.T.E.R. (JP)" },
  Portuguese: { ...baseEnglish, appTitle: "E.S.T.E.R. (PT)" },
  Hindi: { ...baseEnglish, appTitle: "E.S.T.E.R. (HI)" },
  Arabic: { ...baseEnglish, appTitle: "E.S.T.E.R. (AR)" },
  Korean: { ...baseEnglish, appTitle: "E.S.T.E.R. (KR)" },
  Italian: { ...baseEnglish, appTitle: "E.S.T.E.R. (IT)" }
};