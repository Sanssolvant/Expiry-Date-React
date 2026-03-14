import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

type IncomingGroup = {
  id?: unknown;
  name?: unknown;
  order?: unknown;
};

type IncomingItem = {
  id?: unknown;
  name?: unknown;
  amount?: unknown;
  done?: unknown;
  order?: unknown;
  groupId?: unknown;
};

type NormalizedGroup = {
  id: string;
  name: string;
  order: number;
};

type NormalizedItem = {
  id: string;
  name: string;
  amount: string;
  done: boolean;
  order: number;
  groupId: string | null;
};

function normalizeOrder(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function normalizeGroup(group: IncomingGroup, idx: number): NormalizedGroup | null {
  if (!group || typeof group.name !== 'string' || group.name.trim().length === 0) {
    return null;
  }

  const id = typeof group.id === 'string' && group.id.trim().length > 0 ? group.id.trim() : randomUUID();
  return {
    id,
    name: group.name.trim(),
    order: normalizeOrder(group.order, idx),
  };
}

function normalizeItem(item: IncomingItem, idx: number, validGroupIds: Set<string>): NormalizedItem | null {
  if (!item || typeof item.name !== 'string' || item.name.trim().length === 0) {
    return null;
  }

  const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id.trim() : randomUUID();
  const rawGroupId = typeof item.groupId === 'string' ? item.groupId.trim() : '';

  return {
    id,
    name: item.name.trim(),
    amount: typeof item.amount === 'string' ? item.amount.trim() : '',
    done: Boolean(item.done),
    order: normalizeOrder(item.order, idx),
    groupId: rawGroupId && validGroupIds.has(rawGroupId) ? rawGroupId : null,
  };
}

function sameGroup(a: { name: string; order: number }, b: NormalizedGroup) {
  return a.name === b.name && a.order === b.order;
}

function sameItem(
  a: { name: string; amount: string; done: boolean; order: number; groupId: string | null },
  b: NormalizedItem
) {
  return (
    a.name === b.name &&
    (a.amount || '') === (b.amount || '') &&
    Boolean(a.done) === Boolean(b.done) &&
    a.order === b.order &&
    (a.groupId || null) === (b.groupId || null)
  );
}

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
      return NextResponse.json({ error: 'Ungueltige Datenstruktur' }, { status: 400 });
    }

    const normalizedGroups = (groups as IncomingGroup[])
      .map((group, idx) => normalizeGroup(group, idx))
      .filter((group): group is NormalizedGroup => group != null);

    const validGroupIds = new Set(normalizedGroups.map((group) => group.id));
    const normalizedItems = (items as IncomingItem[])
      .map((item, idx) => normalizeItem(item, idx, validGroupIds))
      .filter((item): item is NormalizedItem => item != null);

    if (normalizedGroups.length === 0 && normalizedItems.length === 0) {
      const [deletedItems, deletedGroups] = await prisma.$transaction([
        prisma.shoppingItem.deleteMany({ where: { userId } }),
        prisma.shoppingGroup.deleteMany({ where: { userId } }),
      ]);

      return NextResponse.json({
        success: true,
        deletedItems: deletedItems.count,
        deletedGroups: deletedGroups.count,
      });
    }

    const [existingGroups, existingItems] = await prisma.$transaction([
      prisma.shoppingGroup.findMany({
        where: { userId },
        select: { id: true, name: true, order: true },
      }),
      prisma.shoppingItem.findMany({
        where: { userId },
        select: { id: true, name: true, amount: true, done: true, order: true, groupId: true },
      }),
    ]);

    const existingGroupsById = new Map(existingGroups.map((group) => [group.id, group]));
    const existingItemsById = new Map(existingItems.map((item) => [item.id, item]));

    const incomingGroupIds = new Set(normalizedGroups.map((group) => group.id));
    const incomingItemIds = new Set(normalizedItems.map((item) => item.id));

    const groupsToDelete = existingGroups
      .map((group) => group.id)
      .filter((id) => !incomingGroupIds.has(id));
    const itemsToDelete = existingItems
      .map((item) => item.id)
      .filter((id) => !incomingItemIds.has(id));

    const groupsToCreate = normalizedGroups.filter((group) => !existingGroupsById.has(group.id));
    const groupsToUpdate = normalizedGroups.filter((group) => {
      const existing = existingGroupsById.get(group.id);
      return existing && !sameGroup(existing, group);
    });

    const itemsToCreate = normalizedItems.filter((item) => !existingItemsById.has(item.id));
    const itemsToUpdate = normalizedItems.filter((item) => {
      const existing = existingItemsById.get(item.id);
      return existing && !sameItem(existing, item);
    });

    await prisma.$transaction(async (tx) => {
      if (itemsToDelete.length > 0) {
        await tx.shoppingItem.deleteMany({
          where: {
            userId,
            id: { in: itemsToDelete },
          },
        });
      }

      for (const group of groupsToCreate) {
        await tx.shoppingGroup.create({
          data: {
            id: group.id,
            userId,
            name: group.name,
            order: group.order,
          },
        });
      }

      for (const group of groupsToUpdate) {
        await tx.shoppingGroup.update({
          where: { id: group.id },
          data: {
            name: group.name,
            order: group.order,
          },
        });
      }

      for (const item of itemsToCreate) {
        await tx.shoppingItem.create({
          data: {
            id: item.id,
            userId,
            name: item.name,
            amount: item.amount,
            done: item.done,
            order: item.order,
            groupId: item.groupId,
          },
        });
      }

      for (const item of itemsToUpdate) {
        await tx.shoppingItem.update({
          where: { id: item.id },
          data: {
            name: item.name,
            amount: item.amount,
            done: item.done,
            order: item.order,
            groupId: item.groupId,
          },
        });
      }

      if (groupsToDelete.length > 0) {
        await tx.shoppingGroup.deleteMany({
          where: {
            userId,
            id: { in: groupsToDelete },
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      groupsCreated: groupsToCreate.length,
      groupsUpdated: groupsToUpdate.length,
      groupsDeleted: groupsToDelete.length,
      itemsCreated: itemsToCreate.length,
      itemsUpdated: itemsToUpdate.length,
      itemsDeleted: itemsToDelete.length,
    });
  } catch (error: any) {
    console.error('Fehler beim Speichern Einkaufszettel:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Speichern' }, { status: 500 });
  }
}
