import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData, LineItem } from "../types";
import { CURRENCY_RATES, getCurrencyCode } from '../utils/currency';
import { translations } from '../utils/translations';

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
const cleanNumber = (val: any): number => {
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
  // If AI detected a language, check if we have a translation dictionary for it
  if (data.language && data.language !== 'Original') {
      const supportedLangs = Object.keys(translations);
      // Expanded whitelist for common European/Asian trade languages even if UI doesn't fully support them yet
      const extendedWhitelist = [...supportedLangs, 'Italian', 'French', 'Dutch', 'Portuguese', 'Swedish', 'Danish'];
      
      const isSupported = extendedWhitelist.some(lang => lang.toLowerCase() === data.language?.toLowerCase());
      
      // CONFIDENCE OVERRIDE: If confidence is > 90%, we trust it even if we don't have a UI translation for it.
      // This prevents flagging valid invoices as "unsupported" just because we lack a dictionary.
      const confidence = data.languageConfidence || 0;
      
      if (!isSupported && confidence < 90) {
           console.warn(`Unsupported Language Detected: ${data.language} (Confidence: ${confidence}%)`);
           flags.unsupportedLanguage = true;
      }
  }

  // Determine Confidence Score
  let score: 'High' | 'Medium' | 'Low' = 'High';
  
  if (flags.missingMetadata || flags.unsupportedCurrency) {
    score = 'Low';
  } else if (flags.hasZeroPrices || flags.lowItemCount) {
    // Note: Removed unsupportedLanguage from Medium score trigger if confidence is high
    score = 'Medium';
  }

  // Check 6: PII / Sensitive Data Detection (Basic Heuristics)
  const sensitiveTypes: string[] = [];
  const textContent = JSON.stringify(data);
  
  if (detectSensitiveData(data.vendorName || '', [])) sensitiveTypes.push('Vendor PII');
  data.lineItems.forEach(item => {
      if (detectSensitiveData(item.description, [])) {
          if (!sensitiveTypes.includes('Description PII')) sensitiveTypes.push('Description PII');
      }
  });

  // Regex checks for common PII patterns
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(textContent)) sensitiveTypes.push('SSN');
  if (/\b(?:\d[ -]*?){13,16}\b/.test(textContent)) sensitiveTypes.push('Credit Card');

  return {
    ...data,
    confidenceScore: score,
    validationFlags: flags,
    hasSensitiveData: sensitiveTypes.length > 0,
    sensitiveDataTypes: sensitiveTypes.length > 0 ? sensitiveTypes : undefined
  };
};

// Helper for sensitive data keywords
const detectSensitiveData = (text: string, types: string[]): boolean => {
    const keywords = ["SSN", "Social Security", "Tax ID", "EIN", "Taxpayer", "Passport", "Driver License", "Credit Card", "Account Number"];
    const lowerText = text.toLowerCase();
    return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
};

// Local Learning System
const applyLearnedCorrections = (items: LineItem[]): LineItem[] => {
    try {
        const learnedData = localStorage.getItem('ester_learned_corrections');
        if (!learnedData) return items;
        
        const corrections = JSON.parse(learnedData) as Record<string, string>; // keyword -> category
        
        return items.map(item => {
            const descLower = item.description.toLowerCase();
            // Check if description contains any learned keyword
            const matchedKeyword = Object.keys(corrections).find(key => descLower.includes(key.toLowerCase()));
            
            if (matchedKeyword) {
                return {
                    ...item,
                    glCategory: corrections[matchedKeyword],
                    glReasoning: `Learned from previous correction: '${matchedKeyword}' -> '${corrections[matchedKeyword]}'`,
                    glConfidence: 99
                };
            }
            return item;
        });
    } catch (e) {
        return items;
    }
};

export const extractInvoiceData = async (file: File, isDemoMode: boolean = false): Promise<InvoiceData> => {
  if (isDemoMode) {
    await new Promise(resolve => setTimeout(resolve, 2000));
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
            text: `Analyze this supply chain document.
CORE OBJECTIVE: EXTRACT EVERY SINGLE LINE ITEM.
LANGUAGE DETECTION RULES:
- Scan for "Rechnung", "Steuernummer", "USt" -> Source Language = German
- Scan for "請求書", "円", "税" -> Source Language = Japanese
- Scan for "Facture", "TVA" -> Source Language = French
- Scan for "Fattura", "IVA" -> Source Language = Italian

1. Extract SKU, Description, Quantity, Unit Price, Total.
2. Infer 'glCategory' for each item. Provide 'glConfidence' (0-100) and 'glReasoning'.
3. Detect the document 'language' (e.g. English, German, Japanese). Provide 'languageConfidence' (0-100).
4. Identify 'currencySymbol' or code.
5. Clean numbers (remove symbols).
Output JSON.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    }).catch(e => {
       if (e.message?.includes('429') || e.status === 429) {
         const error: any = new Error('Quota Exceeded');
         error.code = 'QUOTA_EXCEEDED';
         throw error;
       }
       throw e;
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");

    const data = JSON.parse(text) as InvoiceData;

    // Post-processing
    let sanitizedLineItems = data.lineItems.map(item => {
      let unitPrice = cleanNumber(item.unitPrice);
      let totalAmount = cleanNumber(item.totalAmount);
      let quantity = cleanNumber(item.quantity);

      if ((unitPrice === 0) && quantity > 0 && totalAmount > 0) unitPrice = parseFloat((totalAmount / quantity).toFixed(2));
      if (totalAmount === 0 && quantity > 0 && unitPrice > 0) totalAmount = parseFloat((quantity * unitPrice).toFixed(2));

      return { ...item, quantity, unitPrice, totalAmount };
    });
    
    // Apply Learning
    sanitizedLineItems = applyLearnedCorrections(sanitizedLineItems);

    const result = {
      ...data,
      totalAmount: cleanNumber(data.totalAmount),
      lineItems: sanitizedLineItems,
      detectedLanguage: data.language // Map extracted language to detected
    };

    return assessExtractionQuality(result);

  } catch (error: any) {
    if (!error.code) error.code = 'GENERIC';
    throw error;
  }
};

export const translateLineItems = async (items: LineItem[], targetLanguage: string): Promise<LineItem[]> => {
  if (items.length === 0) return items;
  try {
     const prompt = `Translate 'description' and 'glCategory' to ${targetLanguage}. Return JSON array of objects with index, translatedDescription, translatedCategory. Input: ${JSON.stringify(items.map((item, i) => ({index: i, desc: item.description, cat: item.glCategory})))}`;
     
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json" }
     });
     const raw = JSON.parse(response.text);
     
     const translationMap = raw.reduce((acc: any, curr: any) => {
         acc[curr.index] = curr;
         return acc;
     }, {});

     return items.map((item, index) => {
         const translation = translationMap[index];
         if (translation) {
             return { ...item, description: translation.translatedDescription || item.description, glCategory: translation.translatedCategory || item.glCategory };
         }
         return item;
     });
  } catch (e) {
      return items;
  }
};

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}