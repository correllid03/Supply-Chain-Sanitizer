import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, LineItem } from "../types";
import { CURRENCY_RATES, getCurrencyCode } from '../utils/currency';
import { translations } from '../utils/translations';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const invoiceSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: { 
      type: Type.STRING, 
      description: "The type of document. Classify strictly as 'INVOICE', 'PACKING SLIP', or 'BOL'. Default to 'INVOICE'." 
    },
    vendorName: { type: Type.STRING, description: "The name of the vendor or supplier issuing the invoice." },
    invoiceDate: { type: Type.STRING, description: "The date of the invoice in YYYY-MM-DD format." },
    totalAmount: { type: Type.NUMBER, description: "The total amount due on the invoice." },
    currencySymbol: { type: Type.STRING, description: "The currency symbol used in the invoice (e.g., $, €, £, ¥). Default to $ if unsure." },
    language: { type: Type.STRING, description: "The primary language of the document (e.g., English, Spanish, Thai, Vietnamese)." },
    languageConfidence: { type: Type.NUMBER, description: "Confidence score (0-100) for the detected language." },
    lineItems: {
      type: Type.ARRAY,
      description: "List of items purchased.",
      items: {
        type: Type.OBJECT,
        properties: {
          sku: { type: Type.STRING, description: "Stock Keeping Unit or Product Code." },
          description: { type: Type.STRING, description: "Description of the item." },
          glCategory: { type: Type.STRING, description: "Inferred General Ledger category based on item description." },
          quantity: { type: Type.NUMBER, description: "Quantity purchased." },
          unitPrice: { type: Type.NUMBER, description: "Price per individual unit." },
          totalAmount: { type: Type.NUMBER, description: "The total cost for this line item (usually quantity * unit price)." },
          glConfidence: { type: Type.NUMBER, description: "Confidence score (0-100) for the inferred GL category." },
          glReasoning: { type: Type.STRING, description: "Short explanation for why this GL category was chosen." }
        },
        required: ["description", "quantity", "unitPrice", "totalAmount", "glCategory"]
      }
    }
  },
  required: ["documentType", "vendorName", "totalAmount", "lineItems", "currencySymbol", "language"]
};

// Helper to clean garbage from numbers
export const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

// Generate realistic mock data
const generateMockInvoice = (): InvoiceData => {
  const vendors = ['Acme Supply Co.', 'Global Logistics Ltd.', 'Apex Components', 'Northside Services', 'Quantum Materials'];
  const categories = ['Raw Materials', 'Office Supplies', 'Freight', 'Maintenance', 'Professional Services'];
  const currencies = ['$', '€', '£', '¥'];
  
  const vendor = vendors[Math.floor(Math.random() * vendors.length)];
  const currency = currencies[Math.floor(Math.random() * currencies.length)];
  const itemCount = Math.floor(Math.random() * 8) + 3;
  
  const lineItems: LineItem[] = [];
  let total = 0;

  for (let i = 0; i < itemCount; i++) {
    const qty = Math.floor(Math.random() * 10) + 1;
    const price = parseFloat((Math.random() * 500 + 10).toFixed(2));
    const lineTotal = parseFloat((qty * price).toFixed(2));
    const cat = categories[Math.floor(Math.random() * categories.length)];
    
    lineItems.push({
      sku: `SKU-${Math.floor(Math.random() * 10000)}`,
      description: `Sample Item Description ${i + 1} - ${vendor} Part`,
      glCategory: cat,
      quantity: qty,
      unitPrice: price,
      totalAmount: lineTotal,
      glConfidence: Math.floor(Math.random() * 20) + 80,
      glReasoning: `Matched keywords in description with '${cat}'`
    });
    total += lineTotal;
  }

  return {
    id: crypto.randomUUID(),
    documentType: Math.random() > 0.8 ? 'PACKING SLIP' : 'INVOICE',
    vendorName: vendor,
    invoiceDate: new Date().toISOString().split('T')[0],
    totalAmount: parseFloat(total.toFixed(2)),
    currencySymbol: currency,
    lineItems: lineItems,
    isDemo: true,
    language: 'Original',
    detectedLanguage: 'English',
    languageConfidence: 99,
    confidenceScore: 'High',
    validationFlags: { 
      hasZeroPrices: false, 
      lowItemCount: false, 
      missingMetadata: false,
      unsupportedCurrency: false,
      unsupportedLanguage: false
    }
  };
};

const detectSensitiveData = (text: string, types: string[]): boolean => {
    if (!text) return false;
    // Basic regex patterns for sensitive data
    const patterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN-like
        /\b(?:\d[ -]*?){13,16}\b/, // Credit card-like
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
    ];
    return patterns.some(p => p.test(text));
};

// Assess extraction quality and assign confidence score/flags
const assessExtractionQuality = (data: InvoiceData): InvoiceData => {
  const flags = {
    hasZeroPrices: false,
    lowItemCount: false,
    missingMetadata: false,
    unsupportedCurrency: false,
    unsupportedLanguage: false
  };

  // Check 1: Zero Prices
  const zeroPriceItems = data.lineItems.filter(i => i.unitPrice === 0 && i.totalAmount === 0);
  if (zeroPriceItems.length > 0 && data.lineItems.length > 0) {
    flags.hasZeroPrices = true;
  }

  // Check 2: Low Item Count (Heuristic for complex docs)
  if (data.lineItems.length < 2) {
    flags.lowItemCount = true;
  }

  // Check 3: Metadata Health
  if (!data.vendorName || data.vendorName.toLowerCase() === 'unknown' || data.totalAmount === 0) {
    flags.missingMetadata = true;
  }

  // Check 4: Unsupported Currency
  const code = getCurrencyCode(data.currencySymbol);
  if (!CURRENCY_RATES[code]) {
      console.warn(`Unsupported Currency Detected: ${data.currencySymbol} (${code})`);
      flags.unsupportedCurrency = true;
  }

  // Check 5: Unsupported Language
  if (data.language && data.language !== 'Original') {
      const supportedLangs = Object.keys(translations);
      const extendedWhitelist = [...supportedLangs, 'Italian', 'French', 'Dutch', 'Portuguese', 'Swedish', 'Danish'];
      const isSupported = extendedWhitelist.some(lang => lang.toLowerCase() === data.language?.toLowerCase());
      const confidence = data.languageConfidence || 0;
      
      if (!isSupported && confidence < 90) {
           flags.unsupportedLanguage = true;
      }
  }

  // Determine Confidence Score
  let score: 'High' | 'Medium' | 'Low' = 'High';
  
  if (flags.missingMetadata || flags.unsupportedCurrency) {
    score = 'Low';
  } else if (flags.hasZeroPrices || flags.lowItemCount) {
    score = 'Medium';
  }

  // Check 6: PII / Sensitive Data Detection
  const sensitiveTypes: string[] = [];
  
  if (detectSensitiveData(data.vendorName || '', [])) sensitiveTypes.push('Vendor PII');
  data.lineItems.forEach(item => {
      if (detectSensitiveData(item.description, [])) {
          if (!sensitiveTypes.includes('Description PII')) sensitiveTypes.push('Description PII');
      }
  });

  if (sensitiveTypes.length > 0) {
      data.hasSensitiveData = true;
      data.sensitiveDataTypes = sensitiveTypes;
  }

  data.confidenceScore = score;
  data.validationFlags = flags;

  return data;
};

const fileToGenerativePart = async (file: File) => {
  return new Promise<{inlineData: {data: string, mimeType: string}}>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractInvoiceData = async (file: File, isDemoMode: boolean): Promise<InvoiceData> => {
    if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1500));
        return generateMockInvoice();
    }

    const imagePart = await fileToGenerativePart(file);
    const model = 'gemini-2.5-flash';

    const prompt = `Extract invoice data from this image. 
    Analyze the layout to identify Vendor, Date, Total Amount, Currency, and Line Items.
    Infer GL Categories for items.
    Detect the document language.
    Return JSON matching the specified schema.`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [imagePart, { text: prompt }]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: invoiceSchema,
                temperature: 0.1
            }
        });
        
        const rawData = JSON.parse(response.text || '{}');
        const processedData: InvoiceData = {
            ...rawData,
            id: crypto.randomUUID(),
            lineItems: rawData.lineItems || [],
            invoiceDate: rawData.invoiceDate || new Date().toISOString().split('T')[0],
            currencySymbol: rawData.currencySymbol || '$',
            language: rawData.language || 'Original',
            originalLineItems: rawData.lineItems || []
        };
        
        return assessExtractionQuality(processedData);
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        if (error.message?.includes('429')) {
             const e: any = new Error('Quota Exceeded');
             e.code = 'QUOTA_EXCEEDED';
             throw e;
        }
        throw error;
    }
};

export const translateLineItems = async (items: LineItem[], targetLanguage: string): Promise<LineItem[]> => {
    const prompt = `Translate the description of these invoice items into ${targetLanguage}.
    Return a JSON array of objects with 'index' and 'translatedDescription'.
    
    Items:
    ${items.map((item, i) => `${i}: ${item.description}`).join('\n')}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            index: { type: Type.NUMBER },
                            translatedDescription: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const translations = JSON.parse(response.text || '[]');
        const translationMap: Record<number, string> = {};
        translations.forEach((t: any) => {
            translationMap[t.index] = t.translatedDescription;
        });

        return items.map((item, i) => ({
            ...item,
            description: translationMap[i] || item.description
        }));
    } catch (error) {
        console.error("Translation Error:", error);
        return items;
    }
};

export const analyzeBatch = async (invoices: InvoiceData[]): Promise<any> => {
    // 1. Minify data to save tokens (Gemini doesn't need UI flags to find fraud)
    const cleanData = invoices.map(inv => ({
        vendor: inv.vendorName,
        date: inv.invoiceDate,
        total: inv.totalAmount,
        currency: inv.currencySymbol,
        items: inv.lineItems.map(item => ({
            desc: item.description,
            qty: item.quantity,
            price: item.unitPrice,
            total: item.totalAmount,
            category: item.glCategory
        }))
    }));

    const prompt = `
    ACT AS A SENIOR SUPPLY CHAIN AUDITOR. 
    Analyze this batch of ${invoices.length} invoices for strategic insights.

    DATASET:
    ${JSON.stringify(cleanData)}

    DETECT THESE PATTERNS:
    1. PRICE VARIANCES: Same item bought at different prices?
    2. VENDOR CONSOLIDATION: Buying same category (e.g. Office Supplies) from multiple vendors?
    3. BULK OPPORTUNITIES: Multiple small orders to same vendor?
    4. DUPLICATE VENDORS: "Office Depot" vs "Office Depot Inc".

    OUTPUT STRICT JSON ONLY:
    {
      "insights": [
        {
          "type": "critical" | "warning" | "opportunity",
          "title": "Short Headline",
          "message": "2-sentence explanation with numbers.",
          "potential_savings": "$XX.XX" (optional)
        }
      ]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{ "insights": [] }');
    } catch (error) {
        console.error("Audit Failed:", error);
        return { insights: [] };
    }
};
