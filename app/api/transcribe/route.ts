import OpenAI from 'openai';
import { einheiten, kategorien } from '@/app/types';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Mantine Select data kann string[] oder {value,label}[] sein */
function toAllowedList(arr: any[]): string[] {
  return (arr ?? [])
    .map((x) => {
      if (typeof x === 'string') {
        return x;
      }
      if (x && typeof x === 'object') {
        return x.value ?? x.label ?? '';
      }
      return '';
    })
    .filter(Boolean);
}

/** Heutiges Datum in Europe/Zurich als "DD.MM.YYYY" */
function todayZurichDDMMYYYY(): string {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function isValidGermanDate(str: any): str is string {
  return typeof str === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(str);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    // 1) Whisper -> Text
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'de',
      response_format: 'json',
    });

    const text = (transcription as any).text?.trim?.() ?? '';

    // 2) erlaubte Werte aus euren Listen
    const allowedUnits = toAllowedList(einheiten as any);
    const allowedCats = toAllowedList(kategorien as any);
    const todayStr = todayZurichDDMMYYYY();

    // 3) Text -> JSON (inkl. relativer Datumsangaben)
    const resp = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'Du extrahierst strukturierte Daten aus deutschem Text. Antworte NUR als reines JSON ohne Markdown oder Zusatztext.',
        },
        {
          role: 'user',
          content:
            `Text: "${text}"\n\n` +
            `HEUTIGES DATUM (Europe/Zurich): ${todayStr}\n\n` +
            `WICHTIG ZUM DATUM:\n` +
            `- Wenn im Text ein RELATIVES Ablaufdatum vorkommt (z.B. "in zwei Wochen", "morgen", "übermorgen", "in 3 Tagen", "nächsten Freitag"),\n` +
            `  rechne es IMMER in ein KONKRETES Datum um.\n` +
            `- Gib ablaufdatum IMMER als festes Datum im Format "DD.MM.YYYY" zurück.\n` +
            `- Wenn kein Ablaufdatum erwähnt ist: null.\n\n` +
            `EINHEIT MUSS EXAKT aus dieser Liste sein, sonst "Stk":\n` +
            `${JSON.stringify(allowedUnits)}\n\n` +
            `KATEGORIE MUSS EXAKT aus dieser Liste sein, sonst "":\n` +
            `${JSON.stringify(allowedCats)}\n\n` +
            `Gib NUR dieses JSON-Format zurück:\n` +
            `{"name":"", "menge": 1, "einheit":"Stk", "kategorie":"", "ablaufdatum":"DD.MM.YYYY"|null}\n\n` +
            `Regeln:\n` +
            `- name: Produktname kurz\n` +
            `- menge: Zahl, Default 1\n` +
            `- einheit: exakt aus Liste, sonst "Stk"\n` +
            `- kategorie: exakt aus Liste, sonst ""\n`,
        },
      ],
    });

    const raw = resp.output_text?.trim?.() ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { name: '', menge: 1, einheit: 'Stk', kategorie: '', ablaufdatum: null };
    }

    // 4) Safety Korrekturen
    if (!allowedUnits.includes(parsed.einheit)) {
      parsed.einheit = 'Stk';
    }
    if (!allowedCats.includes(parsed.kategorie)) {
      parsed.kategorie = '';
    }
    if (parsed.ablaufdatum != null && !isValidGermanDate(parsed.ablaufdatum)) {
      parsed.ablaufdatum = null;
    }

    return Response.json({ text, parsed });
  } catch (err: any) {
    if (err?.status === 429) {
      return Response.json(
        { error: 'OpenAI Kontingent/Quota überschritten. Bitte Billing/Usage prüfen.' },
        { status: 429 }
      );
    }
    return Response.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
