import { NextResponse } from "next/server";
import OpenAI from "openai";
import { kategorien } from "@/app/types"; // ← Pfad ggf. anpassen

export const runtime = "nodejs";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/* ---------------- PROMPT ---------------- */

function buildImageAnalysisPrompt() {
    return `
Du analysierst ein Foto einer Produktsammlung (Vorrat oder Kühlschrank).

Ziel:
- Erkenne sichtbare Produkte (keine Marken erfinden)
- Zähle Einzelexemplare (z.B. jede Tomate), nicht Sträucher/Cluster/Verpackungen
- Mappe jedes Produkt auf GENAU EINE Kategorie aus der Liste
- Schätze ein branchenübliches Ablaufdatum nur wenn sinnvoll
- Gib confidence (0–1) an

Nutze AUSSCHLIESSLICH eine dieser Kategorien:
${kategorien.join(", ")}

Wenn unklar → "Sonstiges".

====================
KATEGORIE-MAPPING (verbindlich)
====================

OBST:
- Frisches Obst (Apfel, Banane, Orange, Birne, Trauben), lose oder im Netz

FRÜCHTE:
- Getrocknete Früchte (Rosinen, Datteln, Feigen), meist in Beuteln

GEMÜSE:
- Frisches Gemüse (Karotten, Paprika, Salat, Brokkoli, Zwiebeln)
- Tomaten zählen als Gemüse

FLEISCH:
- Fleisch, Geflügel
- Wurst, Schinken, Aufschnitt

MILCHPRODUKT:
- Milch, Joghurt, Quark, Skyr
- Käse, Butter, Sahne

BACKWARE:
- Brot, Brötchen, Toast, Baguette
- Kuchen nur wenn nicht klar Süßigkeit verpackt

GETREIDE:
- Nudeln, Reis, Mehl, Haferflocken, Couscous, Bulgur
- Müsli (nicht stark gezuckert)

SÜSSIGKEIT:
- Schokolade, Kekse, Riegel
- Bonbons, stark gezuckerte Snacks/Desserts

NUSS:
- Nüsse, Kerne, Erdnüsse

FLÜSSIGKEIT:
- Wasser, Saft, Softdrinks
- Öl, Essig

KONSERVE:
- Dosen, Gläser, Eingekochtes/Haltbares

TIEFKÜHL:
- Gefrorene Produkte (TK-Gemüse, TK-Pizza, Eis)
- Verpackung mit Frost/Eis sichtbar

SONSTIGES:
- Gewürze, Saucen, Mischprodukte, unklare Objekte

====================
VISUELLE HINWEISE (Heuristiken)
====================
- Glas/Dose → Konserve
- Eis/Reif/beschlagene Verpackung → Tiefkühl
- Karton/Becher/Käsepackung → Milchprodukt
- Netz/lose Ware → Obst oder Gemüse
- Bäckertüte → Backware
- Kleine bunte Verpackungen → Süßigkeit
- Transparente Beutel mit Körnern → Nuss oder Getreide

====================
ZÄHLREGELN (KRITISCH)
====================
- Bei einzelnen Exemplaren (z.B. Tomaten am Strauch): jede Frucht einzeln zählen.
- Liefere für jedes sichtbare Exemplar eine Instanz in instances (Bounding Box).
  - Koordinaten normalisiert auf 0..1000: x,y,w,h
  - c = Instanz-Confidence 0..1
- quantity MUSS exakt = Anzahl(instances) sein.
- Zusätzlich gib Range aus:
  - quantity_min = sicher sichtbar
  - quantity_max = plausibel sichtbar
  - quantity_best = dein bestes Urteil
- Wenn Overlap/Verdeckung: quantity_min < quantity_max und confidence für Menge reduzieren.

====================
ANTI-HALLUZINATION / QUALITÄT
====================
- NICHT raten, wenn etwas unklar ist
- Lieber weniger Items als falsche
- Keine Produkte annehmen, die nicht sichtbar sind
- Wenn unklar: category "Sonstiges" und confidence < 0.5
- unit ist IMMER erforderlich. Wenn keine Einheit erkennbar: "Stk".

====================
ABLAUFDATUM (expiry_guess)
====================
- Format: DD.MM.YYYY
- Nur schätzen, wenn Produktart klar erkennbar; sonst null
- Richtwerte:
  - Fleisch/Fisch: wenige Tage
  - Milchprodukte: 7–14 Tage
  - Obst/Gemüse: 3–7 Tage
  - Backware: 2–4 Tage
  - Konserve/Getreide: Monate

====================
OUTPUT (nur JSON)
====================
- Gib ausschließlich valides JSON im Schema zurück.
- notes immer als string (wenn nichts: "").
- expiry_guess immer vorhanden (wenn unklar: null).
- confidence immer vorhanden (0..1).
`;
}

/* ---------------- ROUTE ---------------- */

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const image = formData.get("image");

        if (!(image instanceof File)) {
            return NextResponse.json(
                { error: "Kein Bild im Feld 'image' gefunden" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await image.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mime = image.type || "image/jpeg";
        const dataUrl = `data:${mime};base64,${base64}`;

        const schema = {
            type: "object",
            additionalProperties: false,
            properties: {
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            name: { type: "string" },
                            // Menge: wir liefern mehrere Felder; serverseitig normalisieren wir quantity aus instances.length
                            quantity: { type: "integer" },
                            quantity_min: { type: "integer" },
                            quantity_max: { type: "integer" },
                            quantity_best: { type: "integer" },
                            unit: { type: "string" },
                            category: { type: "string", enum: [...kategorien] },
                            expiry_guess: { anyOf: [{ type: "string" }, { type: "null" }] },
                            confidence: { type: "number" },
                            instances: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        // Normalisierte Bounding Box Koordinaten (0..1000)
                                        x: { type: "integer" },
                                        y: { type: "integer" },
                                        w: { type: "integer" },
                                        h: { type: "integer" },
                                        c: { type: "number" },
                                    },
                                    required: ["x", "y", "w", "h", "c"],
                                },
                            },
                        },
                        required: [
                            "name",
                            "quantity",
                            "quantity_min",
                            "quantity_max",
                            "quantity_best",
                            "unit",
                            "category",
                            "expiry_guess",
                            "confidence",
                            "instances",
                        ],
                    },
                },
                notes: { type: "string" },
            },
            required: ["items", "notes"],
        } as const;



        const response = await client.responses.create({
            model: "gpt-5.2",
            input: [
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: buildImageAnalysisPrompt() },
                        {
                            type: "input_image",
                            image_url: dataUrl,
                            detail: "high",
                        },
                    ],
                },
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "product_collection_parse", // ✅ REQUIRED
                    strict: true,
                    schema,
                },
            },
        });

        const raw = response.output_text ?? "{}";
        const parsed = JSON.parse(raw);

        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        const normalizedItems = items.map((it: any) => {
            const instances = Array.isArray(it?.instances) ? it.instances : [];
            const qFromInstances = instances.length > 0 ? instances.length : null;

            const quantityBest = Number.isFinite(it?.quantity_best) ? Number(it.quantity_best) : null;
            const quantity = Number.isFinite(it?.quantity) ? Number(it.quantity) : 1;

            const finalQuantity = qFromInstances ?? quantityBest ?? quantity;

            const qMin = Number.isFinite(it?.quantity_min) ? Number(it.quantity_min) : finalQuantity;
            const qMax = Number.isFinite(it?.quantity_max) ? Number(it.quantity_max) : finalQuantity;
            const qBest = quantityBest ?? finalQuantity;

            return {
                name: String(it?.name ?? "").trim(),
                quantity: Math.max(1, Math.round(finalQuantity)),
                quantity_min: Math.max(1, Math.round(qMin)),
                quantity_max: Math.max(1, Math.round(qMax)),
                quantity_best: Math.max(1, Math.round(qBest)),
                unit: String(it?.unit ?? "Stk").trim() || "Stk",
                category: String(it?.category ?? "Sonstiges").trim() || "Sonstiges",
                expiry_guess: it?.expiry_guess ?? null,
                confidence: typeof it?.confidence === "number" ? it.confidence : 0.5,
                instances,
            };
        }).filter((it: any) => it.name.length > 0);

        return NextResponse.json({
            items: normalizedItems,
            notes: typeof parsed?.notes === "string" ? parsed.notes : "",
        });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err?.message ?? "Serverfehler" },
            { status: 500 }
        );
    }
}
