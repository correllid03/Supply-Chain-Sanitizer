
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, LineItem } from "../types";

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
          totalAmount: { type: Type.NUMBER, description: "The total cost for this line item (usually quantity * unit price)." }
        },
        required: ["description", "quantity", "unitPrice", "totalAmount", "glCategory"]
      }
    }
  },
  required: ["documentType", "vendorName", "totalAmount", "lineItems", "currencySymbol"]
};

// Helper to clean garbage from numbers (e.g. "2953.2!" -> 2953.2)
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Remove currency symbols, commas, exclamation marks, etc. Keep digits and dots.
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
    
    lineItems.push({
      sku: `SKU-${Math.floor(Math.random() * 10000)}`,
      description: `Sample Item Description ${i + 1} - ${vendor} Part`,
      glCategory: categories[Math.floor(Math.random() * categories.length)],
      quantity: qty,
      unitPrice: price,
      totalAmount: lineTotal
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
    confidenceScore: 'High',
    validationFlags: { hasZeroPrices: false, lowItemCount: false, missingMetadata: false }
  };
};

// Assess extraction quality and assign confidence score/flags
const assessExtractionQuality = (data: InvoiceData): InvoiceData => {
  const flags = {
    hasZeroPrices: false,
    lowItemCount: false,
    missingMetadata: false
  };

  // Check 1: Zero Prices
  const zeroPriceItems = data.lineItems.filter(i => i.unitPrice === 0 && i.totalAmount === 0);
  if (zeroPriceItems.length > 0 && data.lineItems.length > 0) {
    flags.hasZeroPrices = true;
  }

  // Check 2: Low Item Count (Heuristic for complex docs)
  if (data.lineItems.length < 3) {
    flags.lowItemCount = true;
  }

  // Check 3: Metadata Health
  if (!data.vendorName || data.vendorName.toLowerCase() === 'unknown' || data.totalAmount === 0) {
    flags.missingMetadata = true;
  }

  // Determine Confidence Score
  let score: 'High' | 'Medium' | 'Low' = 'High';
  
  if (flags.missingMetadata) {
    score = 'Low';
  } else if (flags.hasZeroPrices || flags.lowItemCount) {
    score = 'Medium';
  }

  return {
    ...data,
    confidenceScore: score,
    validationFlags: flags
  };
};

export const extractInvoiceData = async (file: File, isDemoMode: boolean = false): Promise<InvoiceData> => {
  // DEMO MODE BYPASS
  if (isDemoMode) {
    console.log("Demo Mode Active: Generating mock data...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    return generateMockInvoice();
  }

  try {
    const base64Data = await fileToGenerativePart(file);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: `Analyze this supply chain document image to extract structured data.

CORE OBJECTIVE: EXTRACT EVERY SINGLE LINE ITEM. 
- If there are 50 items, extract 50 items. 
- Do NOT stop early.
- Be exhaustive.

1. LINE ITEM EXTRACTION (ROW BY ROW):
   - Scan the main table row by row.
   - Ignore slight column misalignments; use context to identify the row.
   - **SKU**: Look for codes. If missing, leave blank.
   - **Description**: Capture the full text.
   - **Unit Price**: Look for 'Price', 'Rate', 'Unit Cost'. If a column is blank but you see a Total, infer it.
   - **Total**: Look for 'Amount', 'Ext Price'.

2. NUMERIC DATA CLEANING:
   - Remove currency symbols ($) and commas (,) from numbers.
   - Return raw numbers (e.g. 1200.50).

3. DOCUMENT METADATA:
   - Classify Document Type (Invoice, Packing Slip, BOL).
   - Extract Vendor Name and Invoice Date.
   - Identify Currency Symbol ($ is default).

4. OUTPUT FORMAT:
   - Strictly adhere to the JSON schema.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
        temperature: 0.1,
        maxOutputTokens: 8192, // Maximize token limit for long lists
      },
    }).catch(e => {
       // Catch and rethrow specific API errors
       if (e.message?.includes('429') || e.status === 429 || e.message?.includes('Resource has been exhausted')) {
         const error: any = new Error('Quota Exceeded');
         error.code = 'QUOTA_EXCEEDED';
         throw error;
       }
       throw e;
    });

    const text = response.text;
    if (!text) {
      const error: any = new Error("No data returned from Gemini.");
      error.code = 'READ_ERROR';
      throw error;
    }

    const data = JSON.parse(text) as InvoiceData;

    // POST-PROCESSING & SANITIZATION
    const sanitizedLineItems = data.lineItems.map(item => {
      let unitPrice = cleanNumber(item.unitPrice);
      let totalAmount = cleanNumber(item.totalAmount);
      let quantity = cleanNumber(item.quantity);

      // Fallback: Calculate Unit Price if missing but Total is present
      if ((unitPrice === 0) && quantity > 0 && totalAmount > 0) {
        unitPrice = parseFloat((totalAmount / quantity).toFixed(2));
      }

      // Fallback: Calculate Total if missing
      if (totalAmount === 0 && quantity > 0 && unitPrice > 0) {
        totalAmount = parseFloat((quantity * unitPrice).toFixed(2));
      }

      return {
        ...item,
        quantity,
        unitPrice,
        totalAmount
      };
    });

    const sanitizedData = {
      ...data,
      totalAmount: cleanNumber(data.totalAmount),
      lineItems: sanitizedLineItems
    };

    // Quality Check
    return assessExtractionQuality(sanitizedData);

  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    // Standardize error throwing
    if (!error.code) {
        error.code = 'GENERIC';
    }
    throw error;
  }
};

const translationSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          translatedDescription: { type: Type.STRING },
          translatedCategory: { type: Type.STRING }
        },
        required: ["index", "translatedDescription", "translatedCategory"]
      }
    }
  }
};

export const translateLineItems = async (items: LineItem[], targetLanguage: string): Promise<LineItem[]> => {
  if (items.length === 0) return items;

  try {
    const payload = items.map((item, idx) => ({
      index: idx,
      description: item.description,
      glCategory: item.glCategory
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: `Translate 'description' and 'glCategory' to ${targetLanguage}. Return JSON with 'items' array.
            Input: ${JSON.stringify(payload)}`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: translationSchema
      }
    });

    const text = response.text;
    if (!text) return items;

    const result = JSON.parse(text) as { items: { index: number, translatedDescription: string, translatedCategory: string }[] };
    const translationMap = new Map(result.items.map(i => [i.index, i]));

    return items.map((item, index) => {
      const translation = translationMap.get(index);
      if (translation) {
        return {
          ...item,
          description: translation.translatedDescription,
          glCategory: translation.translatedCategory
        };
      }
      return item;
    });

  } catch (error) {
    console.error("Translation Error:", error);
    return items;
  }
};

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
