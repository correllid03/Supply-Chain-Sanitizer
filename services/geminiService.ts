
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
          glCategory: { type: Type.STRING, description: "Inferred General Ledger category based on item description (e.g., 'Raw Materials', 'Office Supplies', 'Maintenance', 'IT Equipment', 'Services')." },
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

export const extractInvoiceData = async (file: File): Promise<InvoiceData> => {
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
            text: `Analyze this supply chain document image.

STRICT EXTRACTION RULES:
1. Document Classification: Classify the document type strictly as 'INVOICE', 'PACKING SLIP', or 'BOL' (Bill of Lading). Look for keywords like 'Invoice', 'Bill of Lading', 'Packing List', 'Delivery Note'.
2. Trust the Ink: Extract the Unit Price and Line Total EXACTLY as they appear visually on the document. Do NOT perform any math to calculate these fields. If the paper says 'Total: 2.19', extract '2.19', even if you think it should be higher based on multiplication.
3. Column Awareness: Pay close attention to column alignment. On handwritten receipts, if a number is in the right-most column, it is likely the Line Total, not the Unit Price.
4. Vendor Fallback: If a clear business logo or name is missing, use the document title (e.g., 'CASH SALE') as the Vendor Name.

Extract the document type, vendor name, invoice date, total amount, and currency symbol.
Extract all line items (SKU, description, quantity, price, and line total).
For each line item, infer a logical 'GL Category' (General Ledger) based on the description (e.g., Office Supplies, Inventory, Software, Logistics).
Ensure the output is strictly valid JSON matching the schema provided.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No data returned from Gemini.");
    }

    const data = JSON.parse(text) as InvoiceData;
    return data;

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
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
    // Simplify payload to save tokens
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
            text: `Translate the 'description' and 'glCategory' fields in the following JSON to ${targetLanguage}. 
            Return a JSON object with an 'items' array containing objects with 'index', 'translatedDescription', and 'translatedCategory'.
            Ensure technical terms relevant to supply chain and accounting are translated accurately.
            
            Input JSON:
            ${JSON.stringify(payload)}`
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
    
    // Create a map for easy lookup
    const translationMap = new Map(result.items.map(i => [i.index, i]));

    // Merge translations back into original items
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
    return items; // Return original items on error
  }
};

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
