'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

type EinkaufsGruppe = {
  id: string;
  name: string;
  order: number;
};

type EinkaufsItem = {
  id: string;
  name: string;
  amount: string;
  done: boolean;
  order: number;
  groupId: string | null;
};

type LoadResponse = {
  groups: EinkaufsGruppe[];
  items: EinkaufsItem[];
};

const UNGROUPED_CONTAINER = 'container:ungrouped';
const groupContainerId = (groupId: string) => `container:group:${groupId}`;

function isContainerId(id: string) {
  return id.startsWith('container:');
}

function DroppableContainer({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        outline: isOver ? '1px solid rgba(34,139,230,0.6)' : 'none',
        borderRadius: 8,
      }}
    >
      {children}
    </div>
  );
}

function SortableItemWrapper({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}


function uid() {
  // crypto.randomUUID() ist in modernen Browsern verfügbar
  // fallback für ältere:
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ShoppingList() {
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState<EinkaufsGruppe[]>([]);
  const [items, setItems] = useState<EinkaufsItem[]>([]);

  // add item
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // group modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // rename group inline
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // autosave
  const saveTimer = useRef<number | null>(null);
  const lastSavedRef = useRef<string>(''); // used to skip identical saves
  const isHydratedRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const getContainerOfId = (id: string, list: EinkaufsItem[]) => {
    if (isContainerId(id)) return id;

    const item = list.find((x) => x.id === id);
    if (!item) return UNGROUPED_CONTAINER;

    return item.groupId ? groupContainerId(item.groupId) : UNGROUPED_CONTAINER;
  };

  const getIdsInContainer = (containerId: string, list: EinkaufsItem[]) => {
    const groupId =
      containerId === UNGROUPED_CONTAINER
        ? null
        : containerId.replace('container:group:', '');

    return list
      .filter((it) => (groupId ? it.groupId === groupId : it.groupId == null))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((it) => it.id);
  };

  const normalizeOrders = (list: EinkaufsItem[]) => {
    // ordnet `order` je Gruppe neu von 0..n
    const next = [...list];
    const groupIds = new Set<string | null>(next.map((x) => x.groupId ?? null));

    Array.from(groupIds).forEach((gid) => {
      const ids = next
        .filter((it) => (gid ? it.groupId === gid : it.groupId == null))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((it) => it.id);

      ids.forEach((id, idx) => {
        const i = next.findIndex((x) => x.id === id);
        if (i !== -1) next[i] = { ...next[i], order: idx };
      });
    });

    return next;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const current = items;

    const fromContainer = getContainerOfId(activeId, current);
    const toContainer = getContainerOfId(overId, current);

    // Wenn Ziel ein Container ist, drop ans Ende
    const overIsContainer = isContainerId(overId);

    const fromIds = getIdsInContainer(fromContainer, current);
    const toIds = getIdsInContainer(toContainer, current);

    const activeIndex = fromIds.indexOf(activeId);
    if (activeIndex === -1) return;

    let nextItems = [...current];

    // ZielgruppenId bestimmen
    const targetGroupId =
      toContainer === UNGROUPED_CONTAINER
        ? null
        : toContainer.replace('container:group:', '');

    // 1) Falls Container-Wechsel: groupId aktualisieren
    if (fromContainer !== toContainer) {
      nextItems = nextItems.map((it) =>
        it.id === activeId ? { ...it, groupId: targetGroupId } : it
      );
    }

    // 2) Position berechnen
    const toIdsAfterMove = (() => {
      const fromNow = fromContainer === toContainer ? fromIds : fromIds.filter((id) => id !== activeId);
      const toNow = fromContainer === toContainer ? fromIds : toIds;

      // Insert index
      if (overIsContainer) {
        return [...toNow.filter((id) => id !== activeId), activeId];
      } else {
        const overIndex = toNow.indexOf(overId);
        const base = toNow.filter((id) => id !== activeId);
        const insertAt = overIndex === -1 ? base.length : overIndex;
        const copy = [...base];
        copy.splice(insertAt, 0, activeId);
        return copy;
      }
    })();

    // 3) order in betroffenen Containern neu setzen
    const affectedContainers = new Set<string>([fromContainer, toContainer]);

    affectedContainers.forEach((cId) => {
      const gid =
        cId === UNGROUPED_CONTAINER ? null : cId.replace('container:group:', '');

      const ids =
        cId === toContainer ? toIdsAfterMove : getIdsInContainer(cId, nextItems);

      ids.forEach((id, idx) => {
        const i = nextItems.findIndex((x) => x.id === id);
        if (i !== -1) nextItems[i] = { ...nextItems[i], order: idx, groupId: gid };
      });
    });

    // 4) final normalize (sicher)
    nextItems = normalizeOrders(nextItems);

    setItems(nextItems);
    scheduleSave(groups, nextItems);
  };


  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [groups]
  );

  const itemsByGroup = useMemo(() => {
    const map = new Map<string | null, EinkaufsItem[]>();
    for (const it of items) {
      const key = it.groupId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    Array.from(map.entries()).forEach(([k, arr]) => {
      arr.sort((a: EinkaufsItem, b: EinkaufsItem) => {
        return (a.order ?? 0) - (b.order ?? 0);
      });
      map.set(k, arr);
    });
    return map;
  }, [items]);

  const ungroupedItems = itemsByGroup.get(null) ?? [];

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/load-shopping-list', { method: 'GET' });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || `Load failed (${res.status})`);
      }
      const data = (await res.json()) as LoadResponse;

      setGroups(Array.isArray(data.groups) ? data.groups : []);
      setItems(Array.isArray(data.items) ? data.items : []);

      // pick first group as default selection, otherwise ungrouped
      const firstGroup = (Array.isArray(data.groups) ? data.groups : []).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      )[0];
      setSelectedGroupId(firstGroup?.id ?? null);

      // mark hydration and snapshot
      isHydratedRef.current = true;
      lastSavedRef.current = JSON.stringify({
        groups: Array.isArray(data.groups) ? data.groups : [],
        items: Array.isArray(data.items) ? data.items : [],
      });
    } catch (e: any) {
      notifications.show({
        title: 'Fehler',
        message: e?.message || 'Konnte Einkaufszettel nicht laden',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveNow(nextGroups = groups, nextItems = items) {
    const payload = { groups: nextGroups, items: nextItems };
    const snapshot = JSON.stringify(payload);

    // skip identical
    if (snapshot === lastSavedRef.current) return;

    try {
      const res = await fetch('/api/save-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: snapshot,
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || `Save failed (${res.status})`);
      }

      lastSavedRef.current = snapshot;
    } catch (e: any) {
      notifications.show({
        title: 'Speichern fehlgeschlagen',
        message: e?.message || 'Bitte später erneut versuchen',
        color: 'red',
      });
    }
  }

  function scheduleSave(nextGroups = groups, nextItems = items) {
    if (!isHydratedRef.current) return; // don't save before first load

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveNow(nextGroups, nextItems);
    }, 350);
  }

  useEffect(() => {
    load();
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- actions

  function addItem() {
    const name = newName.trim();
    const amount = newAmount.trim();

    if (!name) return;

    const next: EinkaufsItem = {
      id: uid(),
      name,
      amount,
      done: false,
      order: items.length,
      groupId: selectedGroupId ?? null,
    };

    const nextItems = [...items, next];
    setItems(nextItems);
    setNewName('');
    setNewAmount('');
    scheduleSave(groups, nextItems);
  }

  function toggleDone(itemId: string) {
    const nextItems = items.map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it
    );
    setItems(nextItems);
    scheduleSave(groups, nextItems);
  }

  function deleteItem(itemId: string) {
    const nextItems = items.filter((it) => it.id !== itemId);
    setItems(nextItems);
    scheduleSave(groups, nextItems);
  }

  function openCreateGroup() {
    setNewGroupName('');
    setGroupModalOpen(true);
  }

  function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;

    const nextGroup: EinkaufsGruppe = {
      id: uid(),
      name,
      order: groups.length,
    };

    const nextGroups = [...groups, nextGroup];
    setGroups(nextGroups);
    setSelectedGroupId(nextGroup.id);
    setGroupModalOpen(false);
    scheduleSave(nextGroups, items);
  }

  function startEditGroup(groupId: string, currentName: string) {
    setEditingGroupId(groupId);
    setEditingGroupName(currentName);
  }

  function commitEditGroup() {
    if (!editingGroupId) return;
    const name = editingGroupName.trim();
    if (!name) return;

    const nextGroups = groups.map((g) =>
      g.id === editingGroupId ? { ...g, name } : g
    );
    setGroups(nextGroups);
    setEditingGroupId(null);
    setEditingGroupName('');
    scheduleSave(nextGroups, items);
  }

  function deleteGroup(groupId: string) {
    const nextGroups = groups.filter((g) => g.id !== groupId);
    const nextItems = items.map((it) =>
      it.groupId === groupId ? { ...it, groupId: null } : it
    );

    setGroups(nextGroups);
    setItems(nextItems);

    if (selectedGroupId === groupId) {
      const first = [...nextGroups].sort((a, b) => a.order - b.order)[0];
      setSelectedGroupId(first?.id ?? null);
    }

    scheduleSave(nextGroups, nextItems);
  }

  // ------- render helpers

  function renderItemRow(it: EinkaufsItem) {
    return (
      <Card key={it.id} withBorder radius="md" p="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <Checkbox checked={it.done} onChange={() => toggleDone(it.id)} mt={2} />
            <div>
              <Text
                fw={600}
                style={{
                  textDecoration: it.done ? 'line-through' : 'none',
                  opacity: it.done ? 0.6 : 1,
                }}
              >
                {it.name}
              </Text>
              {it.amount?.trim() ? (
                <Text size="sm" c="dimmed">
                  {it.amount}
                </Text>
              ) : null}
            </div>
          </Group>

          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => deleteItem(it.id)}
            aria-label="Löschen"
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Card>
    );
  }

  function groupHeader(g: EinkaufsGruppe) {
    const isEditing = editingGroupId === g.id;

    return (
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          {isEditing ? (
            <TextInput
              value={editingGroupName}
              onChange={(e) => setEditingGroupName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditGroup();
                if (e.key === 'Escape') {
                  setEditingGroupId(null);
                  setEditingGroupName('');
                }
              }}
              onBlur={commitEditGroup}
              placeholder="Gruppenname"
            />
          ) : (
            <Group gap="sm" wrap="nowrap">
              <Title order={4}>{g.name}</Title>
              <Badge variant="light">
                {(itemsByGroup.get(g.id) ?? []).length}
              </Badge>
            </Group>
          )}
        </Group>

        <Group gap="xs">
          {!isEditing ? (
            <ActionIcon
              variant="subtle"
              onClick={() => startEditGroup(g.id, g.name)}
              aria-label="Gruppe umbenennen"
            >
              <IconEdit size={18} />
            </ActionIcon>
          ) : null}

          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => deleteGroup(g.id)}
            aria-label="Gruppe löschen"
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    );
  }

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <>
      <Modal
        opened={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title="Neue Gruppe"
        centered
      >
        <Stack>
          <TextInput
            label="Gruppenname"
            placeholder="z.B. Kuchen"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createGroup();
            }}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={createGroup}>
            Gruppe erstellen
          </Button>
        </Stack>
      </Modal>

      <Stack gap="md">
        {/* Add row */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-end">
            <Group gap="md" align="flex-end" style={{ flex: 1 }}>
              <TextInput
                label="Lebensmittel"
                placeholder="z.B. Mehl"
                value={newName}
                onChange={(e) => setNewName(e.currentTarget.value)}
                style={{ flex: 2 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                }}
              />
              <TextInput
                label="Menge"
                placeholder="z.B. 200g"
                value={newAmount}
                onChange={(e) => setNewAmount(e.currentTarget.value)}
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                }}
              />
              <Select
                label="Gruppe"
                placeholder="Ungruppiert"
                value={selectedGroupId}
                onChange={(value) => setSelectedGroupId(value ?? null)}
                data={sortedGroups.map((g) => ({ value: g.id, label: g.name }))}
                clearable
                searchable
                nothingFoundMessage="Keine Gruppen"
                style={{ flex: 1 }}
              />
            </Group>

            <Group>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={openCreateGroup}
              >
                Gruppe
              </Button>

              <Button leftSection={<IconCheck size={16} />} onClick={addItem}>
                Hinzufügen
              </Button>
            </Group>
          </Group>

          <Divider my="md" />

          <Group justify="space-between">
            <Text c="dimmed" size="sm">
              Ungruppiert: {ungroupedItems.length}
            </Text>
            <Button variant="subtle" onClick={() => saveNow()}>
              Jetzt speichern
            </Button>
          </Group>
        </Card>

        {/* Groups */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* Groups */}
          <Stack gap="lg">
            {sortedGroups.map((g) => {
              const containerId = groupContainerId(g.id);
              const groupItems = itemsByGroup.get(g.id) ?? [];
              const groupItemIds = groupItems.map((x) => x.id);

              return (
                <DroppableContainer key={g.id} id={containerId}>
                  <Card withBorder radius="md" p="md">
                    {groupHeader(g)}
                    <Divider my="md" />

                    <SortableContext items={groupItemIds} strategy={verticalListSortingStrategy}>
                      {groupItems.length === 0 ? (
                        <Text c="dimmed" size="sm">
                          Keine Einträge
                        </Text>
                      ) : (
                        <Stack gap="sm">
                          {groupItems.map((it) => (
                            <SortableItemWrapper key={it.id} id={it.id}>
                              {renderItemRow(it)}
                            </SortableItemWrapper>
                          ))}
                        </Stack>
                      )}
                    </SortableContext>
                  </Card>
                </DroppableContainer>
              );
            })}

            {/* Ungrouped */}
            {(() => {
              const containerId = UNGROUPED_CONTAINER;
              const ungrouped = ungroupedItems;
              const ungroupedIds = ungrouped.map((x) => x.id);

              return (
                <DroppableContainer id={containerId}>
                  <Card withBorder radius="md" p="md">
                    <Group justify="space-between" align="center">
                      <Group gap="sm" wrap="nowrap">
                        <Title order={4}>Ungruppiert</Title>
                        <Badge variant="light">{ungrouped.length}</Badge>
                      </Group>
                    </Group>
                    <Divider my="md" />

                    <SortableContext items={ungroupedIds} strategy={verticalListSortingStrategy}>
                      {ungrouped.length === 0 ? (
                        <Text c="dimmed" size="sm">
                          Keine Einträge
                        </Text>
                      ) : (
                        <Stack gap="sm">
                          {ungrouped.map((it) => (
                            <SortableItemWrapper key={it.id} id={it.id}>
                              {renderItemRow(it)}
                            </SortableItemWrapper>
                          ))}
                        </Stack>
                      )}
                    </SortableContext>
                  </Card>
                </DroppableContainer>
              );
            })()}
          </Stack>
        </DndContext>
      </Stack>
    </>
  );
}
