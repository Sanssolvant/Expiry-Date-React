'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconCamera,
  IconChefHat,
  IconCheck,
  IconChartBar,
  IconDeviceFloppy,
  IconHandMove,
  IconMicrophone,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Image,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

import { formatDateToDisplay } from '@/app/lib/dateUtils';
import { USER_SETTINGS_DEFAULTS } from '@/app/lib/user-settings';
import { calculateWarnLevel } from '@/app/lib/warnUtils';
import { parseAblauf, WarnLevel, warnPriority, type Filters } from '@/app/types';

import { CardCreateModal } from './CardCreateModal';
import { CardFilterMenu } from './CardFilterMenu';
import { GridItem } from './GridItem';
import { SpeechCreateModal } from './SpeechCreateModal';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { PhotoCreateModal } from './PhotoCreateModal';
import { InventoryStatsModal } from './InventoryStatsModal';
import { RecipeSuggestionsModal } from './RecipeSuggestionsModal';

export type CardData = {
  id: string;
  name: string;
  image: string;
  menge: number;
  einheit: string;
  ablaufdatum: string;
  kategorie: string;
  erfasstAm: string;
  warnLevel?: WarnLevel;
};

type DndGridProps = {
  warnBaldAb: number;
  warnAbgelaufenAb: number;
};

type LayoutMode = 'cards' | 'list' | 'compact';

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((x) => x.trim()).filter(Boolean)));
}

export default function DndGrid({ warnBaldAb, warnAbgelaufenAb }: DndGridProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [photoOpen, setPhotoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [addingToShoppingListIds, setAddingToShoppingListIds] = useState<string[]>([]);

  const [rawCards, setRawCards] = useState<Omit<CardData, 'warnLevel'>[]>([]);
  const [speechOpen, setSpeechOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('cards');
  const [uiSettingsLoaded, setUiSettingsLoaded] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(
    USER_SETTINGS_DEFAULTS.inventoryCategories
  );
  const [unitOptions, setUnitOptions] = useState<string[]>(USER_SETTINGS_DEFAULTS.inventoryUnits);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [filters, setFilters] = useState<Filters>({
    name: '',
    kategorie: '',
    einheit: '',
    warnLevel: '',
    ablaufVon: null,
    ablaufBis: null,
    mengeVon: null,
    mengeBis: null,
    sort: 'manual',
  });

  const isMobile = useMediaQuery('(max-width: 500px)');

  const cards = useMemo(() => {
    return rawCards.map((card) => ({
      ...card,
      warnLevel: calculateWarnLevel(card.ablaufdatum, warnBaldAb, warnAbgelaufenAb),
    }));
  }, [rawCards, warnBaldAb, warnAbgelaufenAb]);

  const mergedCategoryOptions = useMemo(
    () => uniqueStrings([...categoryOptions, ...cards.map((card) => card.kategorie)]),
    [categoryOptions, cards]
  );
  const mergedUnitOptions = useMemo(
    () => uniqueStrings([...unitOptions, ...cards.map((card) => card.einheit)]),
    [unitOptions, cards]
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;

    const loadUiSettings = async () => {
      try {
        const res = await fetch('/api/user-settings', { method: 'GET', credentials: 'include' });
        if (!res.ok) {
          return;
        }

        const settings = await res.json();
        if (cancelled) {
          return;
        }

        const nextLayout = settings?.inventoryLayoutMode;
        if (nextLayout === 'cards' || nextLayout === 'list' || nextLayout === 'compact') {
          setLayoutMode(nextLayout);
        }

        const nextSort = settings?.inventorySortMode;
        if (nextSort === 'manual' || nextSort === 'expiry_asc' || nextSort === 'expiry_desc') {
          setFilters((prev) => ({ ...prev, sort: nextSort }));
        }

        if (Array.isArray(settings?.inventoryCategories)) {
          const nextCategories = uniqueStrings(
            settings.inventoryCategories.filter((x: unknown) => typeof x === 'string')
          );
          if (nextCategories.length > 0) {
            setCategoryOptions(nextCategories);
          }
        }

        if (Array.isArray(settings?.inventoryUnits)) {
          const nextUnits = uniqueStrings(
            settings.inventoryUnits.filter((x: unknown) => typeof x === 'string')
          );
          if (nextUnits.length > 0) {
            setUnitOptions(nextUnits);
          }
        }
      } catch {
        // fallback: local defaults
      } finally {
        if (!cancelled) {
          setUiSettingsLoaded(true);
        }
      }
    };

    loadUiSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uiSettingsLoaded) {
      return;
    }

    fetch('/api/user-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        inventoryLayoutMode: layoutMode,
        inventorySortMode: filters.sort,
      }),
    }).catch(() => {
      // non-blocking persistence
    });
  }, [uiSettingsLoaded, layoutMode, filters.sort]);

  useEffect(() => {
    const onInventoryOptionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        inventoryCategories?: string[];
        inventoryUnits?: string[];
      }>;

      if (Array.isArray(customEvent.detail?.inventoryCategories)) {
        const nextCategories = uniqueStrings(customEvent.detail.inventoryCategories);
        if (nextCategories.length > 0) {
          setCategoryOptions(nextCategories);
        }
      }

      if (Array.isArray(customEvent.detail?.inventoryUnits)) {
        const nextUnits = uniqueStrings(customEvent.detail.inventoryUnits);
        if (nextUnits.length > 0) {
          setUnitOptions(nextUnits);
        }
      }
    };

    window.addEventListener('inventory-options-updated', onInventoryOptionsUpdated as EventListener);
    return () => {
      window.removeEventListener(
        'inventory-options-updated',
        onInventoryOptionsUpdated as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const res = await fetch('/api/load-products', { method: 'GET', credentials: 'include' });
        const data = await res.json();

        if (res.ok && data.produkte) {
          const cardsFromDB = data.produkte.map((prod: any) => ({
            id: String(prod.id),
            name: prod.name,
            menge: prod.menge,
            einheit: prod.einheit,
            ablaufdatum: formatDateToDisplay(prod.ablaufdatum),
            erfasstAm: formatDateToDisplay(prod.erfasstAm),
            kategorie: prod.kategorie,
            image: prod.bildUrl || '',
          }));

          setRawCards(cardsFromDB);
        } else {
          console.warn('Ladefehler:', data?.error);
        }
      } catch (err) {
        console.error('❌ Fehler beim Kartenladen:', err);
      }
    };

    loadCards();
  }, []);

  const filteredCards = useMemo(() => {
    const result = cards
      .filter((card) => {
        const nameMatch = card.name.toLowerCase().includes(filters.name.toLowerCase());
        const kategorieMatch = !filters.kategorie || card.kategorie === filters.kategorie;
        const einheitMatch = !filters.einheit || card.einheit === filters.einheit;
        const warnLevelMatch = !filters.warnLevel || card.warnLevel === filters.warnLevel;

        const ablaufDate = new Date(card.ablaufdatum.split('.').reverse().join('-'));
        const ablaufVonMatch = !filters.ablaufVon || ablaufDate >= filters.ablaufVon;

        const ablaufBisMatch =
          !filters.ablaufBis ||
          ablaufDate <
          new Date(
            filters.ablaufBis.getFullYear(),
            filters.ablaufBis.getMonth(),
            filters.ablaufBis.getDate() + 1
          );

        const mengeVonMatch = filters.mengeVon == null || card.menge >= filters.mengeVon;
        const mengeBisMatch = filters.mengeBis == null || card.menge <= filters.mengeBis;

        return (
          nameMatch &&
          kategorieMatch &&
          einheitMatch &&
          warnLevelMatch &&
          ablaufVonMatch &&
          ablaufBisMatch &&
          mengeVonMatch &&
          mengeBisMatch
        );
      })
      .sort((a, b) => {
        // ✅ Manuell: Reihenfolge bleibt wie in rawCards
        if (filters.sort === 'manual') return 0;

        const aExp = parseAblauf(a.ablaufdatum);
        const bExp = parseAblauf(b.ablaufdatum);

        // expiry_desc: Längst haltbar zuerst
        if (filters.sort === 'expiry_desc') return bExp - aExp;

        // expiry_asc: Abgelaufen/Bald zuerst (Warnstufe), dann früheres Datum
        const aP = warnPriority[a.warnLevel ?? WarnLevel.OK] ?? 99;
        const bP = warnPriority[b.warnLevel ?? WarnLevel.OK] ?? 99;

        if (aP !== bP) return aP - bP;
        return aExp - bExp;
      });

    return result;
  }, [cards, filters]);

  const handleDragEnd = (event: DragEndEvent) => {
    // DnD nur im manuellen Sortiermodus
    if (filters.sort !== 'manual') return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setRawCards((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === activeId);
      const newIndex = prev.findIndex((c) => c.id === overId);

      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      const next = arrayMove(prev, oldIndex, newIndex);

      saveCardsToDB(next, true).catch(() => {
        notifications.show({
          title: 'Auto-Speichern fehlgeschlagen',
          message: 'Neue Reihenfolge wurde lokal gesetzt. Bitte später "Alle speichern" druecken.',
          color: 'red',
          icon: <IconX size={18} />,
        });
      });

      return next;
    });
  };

  const saveCardsToDB = async (cardsToSave: Omit<CardData, 'warnLevel'>[], silent = false) => {
    const res = await fetch('/api/save-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cards: cardsToSave }),
    });

    if (!res.ok) {
      if (!silent) {
        notifications.show({
          title: 'Fehler beim Speichern',
          message: 'Unbekannter Fehler beim Speichern',
          color: 'red',
          icon: <IconX size={18} />,
        });
      }
      throw new Error('save-products failed');
    }

    if (!silent) {
      const result = await res.json();
      notifications.show({
        title: 'Gespeichert',
        message: `${result.count ?? 'Alle'} Karten wurden erfolgreich gespeichert.`,
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
    }

    return true;
  };

  const handleCreateCard = async (card: CardData) => {
    const { warnLevel, ...cardWithoutWarn } = card;

    const exists = rawCards.find((c) => c.id === card.id);
    const nextRawCards = exists
      ? rawCards.map((c) => (c.id === card.id ? cardWithoutWarn : c))
      : [...rawCards, cardWithoutWarn];

    setRawCards(nextRawCards);
    setEditingCard(null);

    try {
      await saveCardsToDB(nextRawCards, true);
    } catch {
      notifications.show({
        title: 'Auto-Speichern fehlgeschlagen',
        message: 'Bitte Verbindung prüfen oder später „Alle speichern“ drücken.',
        color: 'red',
        icon: <IconX size={18} />,
      });
    }
  };

  const handleDelete = async (id: string) => {
    const nextRawCards = rawCards.filter((card) => card.id !== id);
    setRawCards(nextRawCards);

    try {
      await saveCardsToDB(nextRawCards, true);
    } catch {
      notifications.show({
        title: 'Auto-Speichern fehlgeschlagen',
        message: 'Löschen wurde lokal übernommen. Bitte später „Alle speichern“ drücken.',
        color: 'red',
        icon: <IconX size={18} />,
      });
    }
  };

  const handleAddToShoppingList = async (card: CardData) => {
    setAddingToShoppingListIds((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));

    try {
      const amount = `${card.menge} ${card.einheit}`.trim();
      const res = await fetch('/api/add-to-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: card.name,
          amount,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Hinzufügen fehlgeschlagen');
      }

      notifications.show({
        title: 'Einkaufszettel aktualisiert',
        message: data?.created
          ? `${card.name} wurde zum Einkaufszettel hinzugefügt.`
          : `${card.name} ist bereits auf dem Einkaufszettel.`,
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
    } catch (error: any) {
      notifications.show({
        title: 'Fehler',
        message: error?.message || 'Produkt konnte nicht auf den Einkaufszettel gelegt werden.',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setAddingToShoppingListIds((prev) => prev.filter((id) => id !== card.id));
    }
  };

  const handleCardClick = (card: CardData) => {
    setEditingCard(card);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = cards.map(({ warnLevel, ...rest }) => rest);
      await saveCardsToDB(payload, false);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // ✅ 3-Stage Icon + Tooltip
  const sortModeLabel =
    filters.sort === 'manual'
      ? 'Manuell (frei verschieben)'
      : filters.sort === 'expiry_asc'
        ? 'Bald/abgelaufen zuerst'
        : 'Längst haltbar zuerst';

  const sortTooltip = `Modus: ${sortModeLabel} — klicken zum Wechseln`;

  const sortIcon =
    filters.sort === 'manual'
      ? <IconHandMove size={18} />
      : filters.sort === 'expiry_desc'
        ? <IconSortDescending size={18} />
        : <IconSortAscending size={18} />;

  const sortColor = filters.sort === 'manual' ? 'green' : 'gray';
  const dndDisabled = filters.sort !== 'manual';
  const sortableStrategy =
    layoutMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy;

  return (
    <Stack>
      <SpeechCreateModal
        opened={speechOpen}
        onClose={() => setSpeechOpen(false)}
        onApply={({ parsed }) => {
          const unit = (parsed.einheit ?? 'Stk').trim();
          const cat = (parsed.kategorie ?? '').trim();

          setEditingCard({
            id: crypto.randomUUID(),
            name: (parsed.name ?? '').trim(),
            menge: Number(parsed.menge ?? 1),
            einheit: unit || 'Stk',
            kategorie: cat,
            ablaufdatum: parsed.ablaufdatum ?? formatDateToDisplay(new Date()),
            erfasstAm: formatDateToDisplay(new Date()),
            image: '',
          });

          setSpeechOpen(false);
          setModalOpen(true);
        }}
      />

      <PhotoCreateModal
        opened={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onApply={({ items }) => {
          const now = formatDateToDisplay(new Date());

          // Multi-create direkt in rawCards speichern (ohne extra Editing)
          const newCards = items.map((it) => ({
            id: crypto.randomUUID(),
            name: it.name,
            menge: Number(it.quantity ?? 1),
            einheit: (it.unit ?? 'Stk').trim() || 'Stk',
            kategorie: (it.category ?? '').trim(),
            ablaufdatum: it.expiry_guess ?? now,
            erfasstAm: now,
            image: '', // optional: du könntest das Foto auch speichern & URL setzen
          }));

          const nextRaw = [...rawCards, ...newCards];
          setRawCards(nextRaw);

          setPhotoOpen(false);

          // Auto-save wie du es schon machst:
          saveCardsToDB(nextRaw, true).catch(() => {
            notifications.show({
              title: 'Auto-Speichern fehlgeschlagen',
              message: 'Bitte später „Alle speichern“ drücken.',
              color: 'red',
              icon: <IconX size={18} />,
            });
          });
        }}
      />

      <CardCreateModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCard(null);
        }}
        onCreate={handleCreateCard}
        unitOptions={mergedUnitOptions}
        categoryOptions={mergedCategoryOptions}
        initialData={editingCard}
      />

      <InventoryStatsModal opened={statsOpen} onClose={() => setStatsOpen(false)} cards={cards} />
      <RecipeSuggestionsModal
        opened={recipesOpen}
        onClose={() => setRecipesOpen(false)}
        cards={cards}
      />

      {/* Toolbar */}
      <Box
        mt="md"
        style={{
          position: 'sticky',
          top: 'calc(var(--app-shell-header-offset, 60px) + 8px)',
          zIndex: 30,
          overflowX: isMobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: isDark ? 'rgba(37, 38, 43, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          border: `1px solid ${isDark ? theme.colors.dark[3] : theme.colors.gray[3]}`,
          borderRadius: 10,
          padding: 8,
          backdropFilter: 'blur(6px)',
          paddingBottom: 2,
        }}
      >
        <Group
          justify="center"
          wrap="nowrap"
          gap="xs"
          style={{
            flexWrap: 'nowrap',
            minWidth: isMobile ? 'max-content' : 'auto',
          }}
        >
          <Button variant="outline" onClick={() => setSpeechOpen(true)}>
            {isMobile ? (
              <IconMicrophone size={18} />
            ) : (
              <>
                <IconMicrophone size={18} style={{ marginRight: 10 }} /> Per Sprache
              </>
            )}
          </Button>

          <Button variant="outline" onClick={() => setPhotoOpen(true)}>
            {isMobile ? (
              <IconCamera size={18} />
            ) : (
              <>
                <IconCamera size={18} style={{ marginRight: 10 }} /> Per Bild
              </>
            )}
          </Button>

          <Button onClick={() => setModalOpen(true)}>
            {isMobile ? (
              <IconPlus size={18} />
            ) : (
              <>
                <IconPlus size={18} style={{ marginRight: 10 }} /> Karte hinzufügen
              </>
            )}
          </Button>

          <Button onClick={handleSave} color="green" variant="outline" loading={loading}>
            {isMobile ? (
              <IconDeviceFloppy size={18} />
            ) : (
              <>
                <IconDeviceFloppy size={18} style={{ marginRight: 10 }} /> Alle speichern
              </>
            )}
          </Button>

          <Button variant="outline" onClick={() => setStatsOpen(true)}>
            {isMobile ? (
              <IconChartBar size={18} />
            ) : (
              <>
                <IconChartBar size={18} style={{ marginRight: 10 }} /> Statistik
              </>
            )}
          </Button>

          <Button variant="outline" onClick={() => setRecipesOpen(true)}>
            {isMobile ? (
              <IconChefHat size={18} />
            ) : (
              <>
                <IconChefHat size={18} style={{ marginRight: 10 }} /> Rezepte
              </>
            )}
          </Button>

          <CardFilterMenu
            iconOnly={isMobile}
            filters={filters}
            setFilters={setFilters}
            categories={mergedCategoryOptions}
            units={mergedUnitOptions}
          />

          <SegmentedControl
            value={layoutMode}
            onChange={(value) => setLayoutMode(value as LayoutMode)}
            size={isMobile ? 'xs' : 'sm'}
            data={[
              { label: 'Karten', value: 'cards' },
              { label: 'Liste', value: 'list' },
              { label: 'Kompakt', value: 'compact' },
            ]}
          />

          <Group gap="xs" wrap="nowrap">
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Name suchen..."
              value={filters.name || ''}
              onChange={(e) => {
                const val = e?.currentTarget?.value ?? '';
                setFilters((prev) => ({ ...prev, name: val }));
              }}
              style={{ width: isMobile ? 160 : 300 }}
            />

            <Tooltip label={sortTooltip}>
              <ActionIcon
                variant={filters.sort === 'manual' ? 'filled' : 'default'}
                color={sortColor}
                size="lg"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    sort:
                      prev.sort === 'manual'
                        ? 'expiry_asc'
                        : prev.sort === 'expiry_asc'
                          ? 'expiry_desc'
                          : 'manual',
                  }))
                }
              >
                {sortIcon}
              </ActionIcon>
            </Tooltip>

            <ColorSchemeToggle />
          </Group>
        </Group>
      </Box>

      {/* Layout */}
      <Box
        p="md"
        style={{
          borderRadius: 8,
          backgroundColor: isDark ? theme.colors.dark[4] : theme.colors.gray[1],
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredCards.map((c) => c.id)} strategy={sortableStrategy}>
            {layoutMode === 'cards' ? (
              <SimpleGrid
                cols={{ base: 1, sm: 2, md: 4, lg: 6 }}
                spacing={{ base: 12, sm: 16, md: 20 }}
                verticalSpacing={{ base: 'md', sm: 'lg' }}
              >
                {filteredCards.map((card) => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    onDelete={handleDelete}
                    onAddToShoppingList={handleAddToShoppingList}
                    addToShoppingListLoading={addingToShoppingListIds.includes(card.id)}
                    onClick={handleCardClick}
                    dndDisabled={dndDisabled}
                  />
                ))}

                <Box
                  style={{
                    minHeight: 200,
                    borderRadius: 8,
                    border: '2px dashed #ccc',
                    backgroundColor: isDark ? theme.colors.dark[3] : theme.colors.gray[2],
                  }}
                />
              </SimpleGrid>
            ) : layoutMode === 'list' ? (
              <Stack gap="sm">
                {filteredCards.map((card) => (
                  <SortableListItem
                    key={card.id}
                    card={card}
                    onDelete={handleDelete}
                    onAddToShoppingList={handleAddToShoppingList}
                    addToShoppingListLoading={addingToShoppingListIds.includes(card.id)}
                    onClick={handleCardClick}
                    dndDisabled={dndDisabled}
                  />
                ))}
              </Stack>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="sm">
                {filteredCards.map((card) => (
                  <SortableCompactItem
                    key={card.id}
                    card={card}
                    onDelete={handleDelete}
                    onAddToShoppingList={handleAddToShoppingList}
                    addToShoppingListLoading={addingToShoppingListIds.includes(card.id)}
                    onClick={handleCardClick}
                    dndDisabled={dndDisabled}
                  />
                ))}
              </SimpleGrid>
            )}
          </SortableContext>
        </DndContext>

        {layoutMode !== 'cards' && filteredCards.length === 0 && (
          <Text size="sm" c="dimmed">
            Keine Produkte gefunden.
          </Text>
        )}
      </Box>
    </Stack>
  );
}

function SortableCard({
  card,
  onDelete,
  onAddToShoppingList,
  addToShoppingListLoading,
  onClick,
  dndDisabled,
}: {
  card: CardData;
  onDelete: (id: string) => void;
  onAddToShoppingList: (card: CardData) => void;
  addToShoppingListLoading: boolean;
  onClick: (card: CardData) => void;
  dndDisabled: boolean;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id: card.id,
    disabled: dndDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    width: '100%',
    height: '100%',
    touchAction: 'pan-y' as const,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dndDisabled ? {} : listeners)}
      onClick={() => onClick(card)}
    >
      <GridItem
        name={card.name}
        image={card.image}
        menge={card.menge}
        einheit={card.einheit}
        ablaufdatum={card.ablaufdatum}
        erfasstAm={card.erfasstAm}
        kategorie={card.kategorie}
        warnLevel={card.warnLevel ?? calculateWarnLevel(card.ablaufdatum)}
        isDragging={isDragging}
        onAddToShoppingList={() => onAddToShoppingList(card)}
        addToShoppingListLoading={addToShoppingListLoading}
        onDelete={() => onDelete(card.id)}
      />
    </motion.div>
  );
}

function SortableListItem({
  card,
  onDelete,
  onAddToShoppingList,
  addToShoppingListLoading,
  onClick,
  dndDisabled,
}: {
  card: CardData;
  onDelete: (id: string) => void;
  onAddToShoppingList: (card: CardData) => void;
  addToShoppingListLoading: boolean;
  onClick: (card: CardData) => void;
  dndDisabled: boolean;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id: card.id,
    disabled: dndDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    touchAction: 'pan-y' as const,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dndDisabled ? {} : listeners)}
    >
      <InventoryListItem
        card={card}
        onDelete={onDelete}
        onAddToShoppingList={onAddToShoppingList}
        addToShoppingListLoading={addToShoppingListLoading}
        onClick={onClick}
      />
    </motion.div>
  );
}

function SortableCompactItem({
  card,
  onDelete,
  onAddToShoppingList,
  addToShoppingListLoading,
  onClick,
  dndDisabled,
}: {
  card: CardData;
  onDelete: (id: string) => void;
  onAddToShoppingList: (card: CardData) => void;
  addToShoppingListLoading: boolean;
  onClick: (card: CardData) => void;
  dndDisabled: boolean;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id: card.id,
    disabled: dndDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    touchAction: 'pan-y' as const,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dndDisabled ? {} : listeners)}
    >
      <InventoryCompactItem
        card={card}
        onDelete={onDelete}
        onAddToShoppingList={onAddToShoppingList}
        addToShoppingListLoading={addToShoppingListLoading}
        onClick={onClick}
      />
    </motion.div>
  );
}

type InventoryItemProps = {
  card: CardData;
  onDelete: (id: string) => void;
  onAddToShoppingList: (card: CardData) => void;
  addToShoppingListLoading: boolean;
  onClick: (card: CardData) => void;
};

function warnBadge(w: WarnLevel) {
  if (w === WarnLevel.OK) return { color: 'green' as const, text: 'Frisch' };
  if (w === WarnLevel.BALD) return { color: 'yellow' as const, text: 'Bald' };
  return { color: 'red' as const, text: 'Abgelaufen' };
}

function InventoryListItem({
  card,
  onDelete,
  onAddToShoppingList,
  addToShoppingListLoading,
  onClick,
}: InventoryItemProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const b = warnBadge(card.warnLevel ?? WarnLevel.OK);

  return (
    <Paper withBorder p="sm" radius="md" onClick={() => onClick(card)} style={{ cursor: 'pointer' }}>
      <Group align="flex-start" gap="sm" wrap="nowrap">
        {card.image && card.image.trim() !== '' ? (
          <Image src={card.image} alt={card.name} h={72} w={72} radius="sm" fit="cover" />
        ) : (
          <Center
            h={72}
            w={72}
            style={{
              borderRadius: 8,
              backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
            }}
          >
            <Text size="xs" c="dimmed">
              Kein Bild
            </Text>
          </Center>
        )}

        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
            <Text fw={600} style={{ wordBreak: 'break-word' }}>
              {card.name}
            </Text>
            <Badge color={b.color} variant="light">
              {b.text}
            </Badge>
          </Group>

          <Group gap="xs" wrap="wrap">
            <Badge variant="outline">
              {card.menge} {card.einheit}
            </Badge>
            <Badge variant="outline">{card.kategorie || 'Ohne Kategorie'}</Badge>
          </Group>

          <Text size="sm" c="dimmed" style={{ wordBreak: 'break-word' }}>
            Erfasst: {card.erfasstAm} | Ablauf: {card.ablaufdatum}
          </Text>

          <Group gap="xs" wrap="wrap">
            <Button
              variant="light"
              size="xs"
              loading={addToShoppingListLoading}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAddToShoppingList(card);
              }}
            >
              Auf Liste
            </Button>
            <Button
              variant="outline"
              color="red"
              size="xs"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
            >
              Löschen
            </Button>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

function InventoryCompactItem({
  card,
  onDelete,
  onAddToShoppingList,
  addToShoppingListLoading,
  onClick,
}: InventoryItemProps) {
  const b = warnBadge(card.warnLevel ?? WarnLevel.OK);

  return (
    <Card withBorder radius="md" p="sm" onClick={() => onClick(card)} style={{ cursor: 'pointer' }}>
      <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" style={{ wordBreak: 'break-word' }}>
            {card.name}
          </Text>
          <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>
            {card.menge} {card.einheit} | {card.kategorie || 'Ohne Kategorie'}
          </Text>
          <Text size="xs">Ablauf: {card.ablaufdatum}</Text>
        </Stack>
        <Badge color={b.color} variant="light">
          {b.text}
        </Badge>
      </Group>

      <Group gap="xs" wrap="wrap" mt="sm">
        <Button
          variant="light"
          size="xs"
          loading={addToShoppingListLoading}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAddToShoppingList(card);
          }}
        >
          Auf Liste
        </Button>
        <Button
          variant="outline"
          color="red"
          size="xs"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
        >
          Löschen
        </Button>
      </Group>
    </Card>
  );
}


