import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json();
    const { groups, items } = body ?? {};

    if (!Array.isArray(groups) || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Ungültige Datenstruktur' }, { status: 400 });
    }

    // 👉 Wenn alles leer ist → lösche alles vom User
    if (groups.length === 0 && items.length === 0) {
      const deletedItems = await prisma.shoppingItem.deleteMany({ where: { userId } });
      const deletedGroups = await prisma.shoppingGroup.deleteMany({ where: { userId } });

      return NextResponse.json({
        success: true,
        deletedItems: deletedItems.count,
        deletedGroups: deletedGroups.count,
      });
    }

    // 🔍 Nur gültige Gruppen
    const validGroups = groups.filter(
      (g: any) => g && typeof g.name === 'string' && g.name.trim().length > 0
    );

    // 🔍 Nur gültige Items
    const validItems = items.filter(
      (i: any) => i && typeof i.name === 'string' && i.name.trim().length > 0
    );

    // Optional: wenn Gruppen leer aber Items existieren -> ok (alles ungruppiert)
    // Aber: wenn Items komplett leer sind, speichern wir trotzdem Gruppen (z.B. leere Gruppe "Kuchen")
    if (validGroups.length === 0 && validItems.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Daten zum Speichern' }, { status: 400 });
    }

    // 🧹 Vorher alles löschen (erst Items, dann Gruppen wegen FK)
    await prisma.shoppingItem.deleteMany({ where: { userId } });
    await prisma.shoppingGroup.deleteMany({ where: { userId } });

    // ✅ Gruppen speichern
    const groupData = validGroups.map((g: any, idx: number) => ({
      userId,
      name: g.name.trim(),
      order: Number.isFinite(Number(g.order)) ? Number(g.order) : idx,
    }));

    // createMany gibt keine IDs zurück -> wir erzeugen IDs im Client (empfohlen).
    // Falls du IDs im Client setzt, kannst du hier auch "id: g.id" mitschicken.
    // Ich unterstütze beides:
    const groupDataWithIds = validGroups.map((g: any, idx: number) => ({
      id: typeof g.id === 'string' && g.id.trim().length > 0 ? g.id : undefined,
      userId,
      name: g.name.trim(),
      order: Number.isFinite(Number(g.order)) ? Number(g.order) : idx,
    }));

    // Prisma createMany erlaubt "id" nur, wenn es nicht undefined ist:
    const cleanedGroupData = groupDataWithIds.map(({ id, ...rest }: any) =>
      id ? { id, ...rest } : rest
    );

    if (cleanedGroupData.length > 0) {
      await prisma.shoppingGroup.createMany({ data: cleanedGroupData });
    }

    // Für FK-Sicherheit: nur groupId übernehmen, wenn sie in validGroups vorkommt
    const validGroupIds = new Set(
      validGroups
        .map((g: any) => (typeof g.id === 'string' ? g.id : null))
        .filter(Boolean)
    );

    // ✅ Items speichern
    const itemDataWithIds = validItems.map((i: any, idx: number) => ({
      id: typeof i.id === 'string' && i.id.trim().length > 0 ? i.id : undefined,
      userId,
      name: i.name.trim(),
      amount: typeof i.amount === 'string' ? i.amount : '',
      done: Boolean(i.done),
      order: Number.isFinite(Number(i.order)) ? Number(i.order) : idx,
      groupId: i.groupId && validGroupIds.has(i.groupId) ? i.groupId : null,
    }));

    const cleanedItemData = itemDataWithIds.map(({ id, ...rest }: any) =>
      id ? { id, ...rest } : rest
    );

    if (cleanedItemData.length > 0) {
      const result = await prisma.shoppingItem.createMany({ data: cleanedItemData });
      return NextResponse.json({ success: true, count: result.count });
    }

    // Falls nur Gruppen gespeichert wurden:
    return NextResponse.json({ success: true, count: 0 });
  } catch (error: any) {
    console.error('❌ Fehler beim Speichern Einkaufszettel:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Speichern' }, { status: 500 });
  }
}
