import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initializer for Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in server environment");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Endpoint to process invoice image with Gemini AI
app.post("/api/invoice/process-image", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "No image base64 provided" });
    }

    const ai = getGeminiClient();

    const prompt = `Analiza esta imagen real de factura de compra o ticket comercial y extrae con máxima precisión la información en formato JSON estricto.
Extrae los siguientes datos:
1. "supplier": {
     "name": "Razón social o nombre del proveedor",
     "taxId": "CUIT, RUT, RFC o número de identificación fiscal",
     "phone": "Teléfono si figura, sino cadena vacía",
     "email": "Email si figura, sino cadena vacía",
     "address": "Dirección fiscal si figura, sino cadena vacía"
   }
2. "invoiceNumber": "Número de comprobante/factura legible (ej: A0001-00004523)",
3. "date": "Fecha en formato YYYY-MM-DD",
4. "paymentMethod": "cash", "credit", o "bank_transfer",
5. "items": [
     {
       "description": "Nombre exacto o descripción del artículo/producto",
       "sku": "Código de producto o referencia si existe",
       "quantity": número (cantidad de unidades compradas, ej: 10),
       "unitPrice": número (precio unitario bruto o de lista),
       "discountPercent": número (porcentaje de descuento aplicado a este ítem, ej: 5 para 5%),
       "taxPercent": número (porcentaje de IVA aplicado, ej: 21 o 10.5),
       "netUnitCost": número (costo neto unitario final real calculado: unitPrice * (1 - discount/100) * (1 + tax/100) si el IVA forma parte del costo o según desglose),
       "subtotal": número (total del ítem en la factura: quantity * netUnitCost)
     }
   ],
6. "totalAmount": número total facturado

IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON válido sin bloques markdown ni texto explicativo adicional.`;

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.text || "";
    // Clean code blocks if present
    const cleanedJsonText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsedData = JSON.parse(cleanedJsonText);
      return res.json({ success: true, data: parsedData });
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", responseText);
      return res.status(500).json({
        error: "No se pudo interpretar el resultado de la IA como JSON estructurado",
        raw: responseText,
      });
    }
  } catch (err: any) {
    console.error("Error processing invoice image with Gemini:", err);
    return res.status(500).json({
      error: err?.message || "Error al procesar la factura con Gemini AI",
    });
  }
});

// Endpoint for matching product names using Gemini AI
app.post("/api/invoice/match-product", async (req, res) => {
  try {
    const { invoiceItemName, existingProducts } = req.body;
    if (!invoiceItemName || !Array.isArray(existingProducts)) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    if (existingProducts.length === 0) {
      return res.json({ matchedProductId: null, confidence: 0, reason: "No existing products in database" });
    }

    const ai = getGeminiClient();
    const prompt = `Tienes un artículo extraído de una factura: "${invoiceItemName}".
Y esta lista de productos existentes en la base de datos real:
${JSON.stringify(existingProducts.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })))}

Determina si "${invoiceItemName}" corresponde exactamente o con alta certeza a alguno de los productos existentes en la lista (teniendo en cuenta variaciones menores de tipeo, marcas o abreviaturas).
Si coincide con alguno, devuelve el ID de ese producto existente.
Si NO coincide claramente con ninguno o es un producto nuevo, devuelve matchedProductId: null.

Responde ÚNICAMENTE en JSON con el siguiente formato:
{
  "matchedProductId": "id_del_producto_o_null",
  "confidence": 0 a 100,
  "reason": "breve explicación"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);
    return res.json(result);
  } catch (err: any) {
    console.error("Error in match-product:", err);
    return res.status(500).json({ error: err?.message || "Error matching product" });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
