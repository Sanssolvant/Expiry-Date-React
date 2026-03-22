'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  IconBarcode,
  IconCamera,
  IconCheck,
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

import { formatDateToDisplay, formatDateToStorage, parseDateFromString } from '@/app/lib/dateUtils';
import { invalidateProductsCache, loadProductsCached } from '@/app/lib/products-client-cache';
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
import { BarcodeCreateModal } from './BarcodeCreateModal';

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
type InventoryViewMode = 'flat' | 'grouped';
type SaveSyncStatus = 'synced' | 'pending' | 'error';

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((x) => x.trim()).filter(Boolean)));
}

function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function compareCardsBySort(a: CardData, b: CardData, sortMode: Filters['sort']) {
  if (sortMode === 'manual') {
    return 0;
  }

  const aExp = parseAblauf(a.ablaufdatum);
  const bExp = parseAblauf(b.ablaufdatum);
  const aDateInvalid = Number.isNaN(aExp);
  const bDateInvalid = Number.isNaN(bExp);

  if (aDateInvalid && bDateInvalid) {
    return 0;
  }
  if (aDateInvalid) {
    return 1;
  }
  if (bDateInvalid) {
    return -1;
  }

  if (sortMode === 'expiry_desc') {
    return bExp - aExp;
  }

  const aP = warnPriority[a.warnLevel ?? WarnLevel.OK] ?? 99;
  const bP = warnPriority[b.warnLevel ?? WarnLevel.OK] ?? 99;

  if (aP !== bP) {
    return aP - bP;
  }
  return aExp - bExp;
}

export default function DndGrid({ warnBaldAb, warnAbgelaufenAb }: DndGridProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [photoOpen, setPhotoOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [addingToShoppingListIds, setAddingToShoppingListIds] = useState<string[]>([]);
  const [saveSyncStatus, setSaveSyncStatus] = useState<SaveSyncStatus>('synced');
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastAutoSaveSnapshotRef = useRef('');

  const [rawCards, setRawCards] = useState<Omit<CardData, 'warnLevel'>[]>([]);
  const [speechOpen, setSpeechOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('cards');
  const [inventoryViewMode, setInventoryViewMode] = useState<InventoryViewMode>('flat');
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

  const isMobile = useMediaQuery('(max-width: 48em)') ?? false;

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

  const persistInventoryOptions = async (nextCategories: string[], nextUnits: string[]) => {
    try {
      await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          inventoryCategories: nextCategories,
          inventoryUnits: nextUnits,
        }),
      });
    } catch {
      // non-blocking persistence
    }
  };

  const saveBarcodeTemplate = async (barcode: string, card: Omit<CardData, 'warnLevel'>) => {
    try {
      const res = await fetch('/api/barcode-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          barcode,
          name: card.name,
          kategorie: card.kategorie,
          einheit: card.einheit,
          image: card.image,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Barcode-Vorlage konnte nicht gespeichert werden.');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Barcode-Vorlage',
        message:
          error?.message ||
          'Karte wurde gespeichert, aber die Barcode-Vorlage konnte nicht aktualisiert werden.',
        color: 'orange',
        icon: <IconX size={18} />,
      });
    }
  };

  const handleAddCategoryOption = (category: string) => {
    const normalized = category.trim();
    if (!normalized) {
      return;
    }

    const nextCategories = uniqueStrings([...categoryOptions, normalized]);
    if (nextCategories.length === categoryOptions.length) {
      return;
    }

    setCategoryOptions(nextCategories);
    window.dispatchEvent(
      new CustomEvent('inventory-options-updated', {
        detail: { inventoryCategories: nextCategories, inventoryUnits: unitOptions },
      })
    );
    void persistInventoryOptions(nextCategories, unitOptions);
  };

  const handleAddUnitOption = (unit: string) => {
    const normalized = unit.trim();
    if (!normalized) {
      return;
    }

    const nextUnits = uniqueStrings([...unitOptions, normalized]);
    if (nextUnits.length === unitOptions.length) {
      return;
    }

    setUnitOptions(nextUnits);
    window.dispatchEvent(
      new CustomEvent('inventory-options-updated', {
        detail: { inventoryCategories: categoryOptions, inventoryUnits: nextUnits },
      })
    );
    void persistInventoryOptions(categoryOptions, nextUnits);
  };

  useEffect(() => {
    const savedViewMode = window.localStorage.getItem('inventory-view-mode');
    if (savedViewMode === 'flat' || savedViewMode === 'grouped') {
      setInventoryViewMode(savedViewMode);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    window.localStorage.setItem('inventory-view-mode', inventoryViewMode);
  }, [inventoryViewMode, mounted]);

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
        const products = await loadProductsCached();
        const cardsFromDB = products.map((prod: any) => ({
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
        lastAutoSaveSnapshotRef.current = JSON.stringify(cardsFromDB);
        setSaveSyncStatus('synced');
      } catch (err) {
        console.error('❌ Fehler beim Kartenladen:', err);
      }
    };

    loadCards();
  }, []);

  useEffect(() => {
    const onOpenInventoryStats = () => {
      setStatsOpen(true);
    };

    window.addEventListener('open-inventory-stats', onOpenInventoryStats);
    return () => {
      window.removeEventListener('open-inventory-stats', onOpenInventoryStats);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const filteredCards = useMemo(() => {
    const result = cards
      .filter((card) => {
        const nameMatch = card.name.toLowerCase().includes(filters.name.toLowerCase());
        const kategorieMatch = !filters.kategorie || card.kategorie === filters.kategorie;
        const einheitMatch = !filters.einheit || card.einheit === filters.einheit;
        const warnLevelMatch = !filters.warnLevel || card.warnLevel === filters.warnLevel;

        let ablaufDate: Date;
        try {
          ablaufDate = parseDateFromString(card.ablaufdatum);
        } catch {
          return false;
        }
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
      .sort((a, b) => compareCardsBySort(a, b, filters.sort));

    return result;
  }, [cards, filters]);

  const groupedCards = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        displayName: string;
        cards: CardData[];
        warnLevel: WarnLevel;
        nextExpiry: string | null;
      }
    >();

    for (const card of filteredCards) {
      const normalizedName = normalizeProductName(card.name);
      const key = normalizedName || `unnamed-${card.id}`;
      const existingGroup = grouped.get(key);

      if (!existingGroup) {
        grouped.set(key, {
          key,
          displayName: card.name.trim() || 'Unbenanntes Produkt',
          cards: [card],
          warnLevel: card.warnLevel ?? WarnLevel.OK,
          nextExpiry: card.ablaufdatum,
        });
        continue;
      }

      existingGroup.cards.push(card);

      const cardWarn = card.warnLevel ?? WarnLevel.OK;
      const currentWarnPriority = warnPriority[existingGroup.warnLevel] ?? 99;
      const cardWarnPriority = warnPriority[cardWarn] ?? 99;
      if (cardWarnPriority < currentWarnPriority) {
        existingGroup.warnLevel = cardWarn;
      }

      const currentExpiry = existingGroup.nextExpiry ? parseAblauf(existingGroup.nextExpiry) : Number.NaN;
      const nextExpiry = parseAblauf(card.ablaufdatum);
      if (Number.isNaN(currentExpiry) || (!Number.isNaN(nextExpiry) && nextExpiry < currentExpiry)) {
        existingGroup.nextExpiry = card.ablaufdatum;
      }
    }

    return Array.from(grouped.values());
  }, [filteredCards]);

  const handleDragEnd = (event: DragEndEvent) => {
    // DnD nur im manuellen Sortiermodus
    if (filters.sort !== 'manual') {return;}

    const { active, over } = event;
    if (!over || active.id === over.id) {return;}

    const activeId = String(active.id);
    const overId = String(over.id);

    setRawCards((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === activeId);
      const newIndex = prev.findIndex((c) => c.id === overId);

      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      const next = arrayMove(prev, oldIndex, newIndex);

      scheduleAutoSave(next);

      return next;
    });
  };

  const saveCardsToDB = async (cardsToSave: Omit<CardData, 'warnLevel'>[], silent = false) => {
    setSaveSyncStatus('pending');

    let payload: Omit<CardData, 'warnLevel'>[];
    try {
      payload = cardsToSave.map((card) => ({
        ...card,
        ablaufdatum: formatDateToStorage(card.ablaufdatum),
        erfasstAm: formatDateToStorage(card.erfasstAm),
      }));
    } catch {
      setSaveSyncStatus('error');
      if (!silent) {
        notifications.show({
          title: 'Fehler beim Speichern',
          message: 'Mindestens ein Datum ist ungültig.',
          color: 'red',
          icon: <IconX size={18} />,
        });
      }
      throw new Error('invalid date payload');
    }

    const res = await fetch('/api/save-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cards: payload }),
    });

    if (!res.ok) {
      setSaveSyncStatus('error');
      if (!silent) {
        notifications.show({
          title: 'Fehler beim Speichern',
          message: 'Änderungen konnten nicht mit dem Server synchronisiert werden.',
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
        message: `${result.count ?? 'Alle'} Karten wurden erfolgreich synchronisiert.`,
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
    }
    setSaveSyncStatus('synced');
    invalidateProductsCache();
    return true;
  };

  const scheduleAutoSave = (nextCards: Omit<CardData, 'warnLevel'>[]) => {
    const snapshot = JSON.stringify(nextCards);
    if (snapshot === lastAutoSaveSnapshotRef.current) {
      return;
    }

    setSaveSyncStatus('pending');

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      saveCardsToDB(nextCards, true)
        .then(() => {
          lastAutoSaveSnapshotRef.current = snapshot;
        })
        .catch(() => {
          setSaveSyncStatus('error');
          notifications.show({
            title: 'Auto-Speichern fehlgeschlagen',
            message: 'Änderungen sind lokal vorhanden, aber nicht synchronisiert.',
            color: 'red',
            icon: <IconX size={18} />,
          });
        });
    }, 450);
  };

  const handleCreateCard = async (card: CardData) => {
    const { warnLevel, ...cardWithoutWarn } = card;
    const barcodeForTemplate = pendingBarcode;

    const exists = rawCards.find((c) => c.id === card.id);
    const hasSameProductName =
      !exists &&
      rawCards.some((c) => normalizeProductName(c.name) === normalizeProductName(cardWithoutWarn.name));
    const nextRawCards = exists
      ? rawCards.map((c) => (c.id === card.id ? cardWithoutWarn : c))
      : [...rawCards, cardWithoutWarn];

    setRawCards(nextRawCards);
    setEditingCard(null);
    setPendingBarcode(null);

    if (barcodeForTemplate) {
      void saveBarcodeTemplate(barcodeForTemplate, cardWithoutWarn);
    }

    if (hasSameProductName) {
      notifications.show({
        title: 'Neue Charge gespeichert',
        message:
          'Das Produkt wurde mit eigenem Ablaufdatum hinzugefügt und in der Gruppenansicht zusammengefasst.',
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
    }

    scheduleAutoSave(nextRawCards);
  };

  const handleCreateCards = async (cardsToCreate: CardData[]) => {
    if (cardsToCreate.length === 0) {
      return;
    }

    const normalizedCards = cardsToCreate.map(({ warnLevel, ...card }) => card);
    const barcodeForTemplate = pendingBarcode;
    const hasSameProductName = normalizedCards.some((card) =>
      rawCards.some(
        (existingCard) => normalizeProductName(existingCard.name) === normalizeProductName(card.name)
      )
    );
    const nextRawCards = [...rawCards, ...normalizedCards];

    setRawCards(nextRawCards);
    setEditingCard(null);
    setPendingBarcode(null);

    if (barcodeForTemplate) {
      void saveBarcodeTemplate(barcodeForTemplate, normalizedCards[0]);
    }

    notifications.show({
      title: 'Chargen gespeichert',
      message:
        normalizedCards.length === 1
          ? '1 Charge wurde hinzugefügt.'
          : `${normalizedCards.length} Chargen wurden hinzugefügt.`,
      color: 'teal',
      icon: <IconCheck size={18} />,
    });

    if (hasSameProductName) {
      notifications.show({
        title: 'Gruppierung aktiv',
        message: 'Gleiche Produktnamen werden in der Gruppenansicht automatisch zusammengefasst.',
        color: 'blue',
      });
    }

    scheduleAutoSave(nextRawCards);
  };

  const handleDelete = async (id: string) => {
    const nextRawCards = rawCards.filter((card) => card.id !== id);
    setRawCards(nextRawCards);

    scheduleAutoSave(nextRawCards);
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
    setPendingBarcode(null);
    setEditingCard(card);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveSyncStatus('pending');
    try {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
      const payload = cards.map(({ warnLevel, ...rest }) => rest);
      await saveCardsToDB(payload, false);
      lastAutoSaveSnapshotRef.current = JSON.stringify(payload);
      setSaveSyncStatus('synced');
    } catch {
      setSaveSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {return null;}

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
  const dndDisabled = inventoryViewMode === 'grouped' || filters.sort !== 'manual';
  const sortableStrategy =
    layoutMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy;
  const saveStatusLabel =
    saveSyncStatus === 'synced'
      ? 'Synchronisiert'
      : saveSyncStatus === 'pending'
        ? 'Synchronisiere...'
        : 'Nicht synchronisiert';
  const saveStatusColor =
    saveSyncStatus === 'synced' ? 'teal' : saveSyncStatus === 'pending' ? 'blue' : 'red';

  return (
    <Stack>
      <SpeechCreateModal
        opened={speechOpen}
        onClose={() => setSpeechOpen(false)}
        onApply={({ items }) => {
          setPendingBarcode(null);
          const now = formatDateToDisplay(new Date());

          const newCards = items.map((item) => ({
            id: crypto.randomUUID(),
            name: item.name.trim(),
            menge: Math.max(1, Math.round(Number(item.menge ?? 1))),
            einheit: (item.einheit ?? 'Stk').trim() || 'Stk',
            kategorie: (item.kategorie ?? '').trim(),
            ablaufdatum: item.ablaufdatum ?? now,
            erfasstAm: now,
            image: '',
          }));

          const nextRaw = [...rawCards, ...newCards];
          setRawCards(nextRaw);
          setSpeechOpen(false);
          notifications.show({
            title: 'Produkte hinzugefügt',
            message:
              newCards.length === 1
                ? '1 Produkt wurde aus Sprache gespeichert.'
                : `${newCards.length} Produkte wurden aus Sprache gespeichert.`,
            color: 'teal',
            icon: <IconCheck size={18} />,
          });
          scheduleAutoSave(nextRaw);
        }}
      />

      <PhotoCreateModal
        opened={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onApply={({ items }) => {
          setPendingBarcode(null);
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

          scheduleAutoSave(nextRaw);
        }}
      />

      <BarcodeCreateModal
        opened={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onApply={({ barcode, template }) => {
          const cleanedName = (template?.name ?? '').trim();
          const cleanedCategory = (template?.kategorie ?? '').trim();
          const cleanedUnit = (template?.einheit ?? 'Stk').trim() || 'Stk';
          const cleanedImage = (template?.image ?? '').trim();
          const now = formatDateToDisplay(new Date());

          setPendingBarcode(barcode);
          setEditingCard({
            id: crypto.randomUUID(),
            name: cleanedName,
            menge: 1,
            einheit: cleanedUnit,
            kategorie: cleanedCategory,
            ablaufdatum: now,
            erfasstAm: now,
            image: cleanedImage,
          });

          setBarcodeOpen(false);
          setModalOpen(true);
        }}
      />

      <CardCreateModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCard(null);
          setPendingBarcode(null);
        }}
        onCreate={handleCreateCard}
        onCreateMany={handleCreateCards}
        unitOptions={mergedUnitOptions}
        categoryOptions={mergedCategoryOptions}
        initialData={editingCard}
        onAddUnitOption={handleAddUnitOption}
        onAddCategoryOption={handleAddCategoryOption}
        barcodeValue={pendingBarcode}
        preferredCreateMode={inventoryViewMode === 'grouped' ? 'batch' : 'single'}
      />

      <InventoryStatsModal opened={statsOpen} onClose={() => setStatsOpen(false)} cards={cards} />

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

          <Button variant="outline" onClick={() => setBarcodeOpen(true)}>
            {isMobile ? (
              <IconBarcode size={18} />
            ) : (
              <>
                <IconBarcode size={18} style={{ marginRight: 10 }} /> Per Barcode
              </>
            )}
          </Button>

          <Button
            onClick={() => {
              setPendingBarcode(null);
              setModalOpen(true);
            }}
          >
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

          <Badge color={saveStatusColor} variant={isDark ? 'filled' : 'light'} radius="sm">
            {saveStatusLabel}
          </Badge>

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

          <SegmentedControl
            value={inventoryViewMode}
            onChange={(value) => setInventoryViewMode(value as InventoryViewMode)}
            size={isMobile ? 'xs' : 'sm'}
            data={[
              { label: 'Einzeln', value: 'flat' },
              { label: 'Gruppiert', value: 'grouped' },
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
        p={{ base: 'xs', sm: 'md' }}
        style={{
          borderRadius: 8,
          backgroundColor: isDark ? theme.colors.dark[4] : theme.colors.gray[1],
        }}
      >
        {inventoryViewMode === 'grouped' ? (
          <Stack gap="md">
            {groupedCards.map((groupedCard) => {
              const statusBadge = warnBadge(groupedCard.warnLevel);
              return (
                <Paper key={groupedCard.key} withBorder p="sm" radius="md">
                  <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
                    <Box>
                      <Text fw={700}>{groupedCard.displayName}</Text>
                      <Text size="xs" c="dimmed">
                        {groupedCard.cards.length} Chargen
                      </Text>
                    </Box>
                    <Group gap="xs" wrap="wrap">
                      <Badge color={statusBadge.color} variant="light">
                        {statusBadge.text}
                      </Badge>
                      <Badge variant="outline">Nächster Ablauf: {groupedCard.nextExpiry ?? 'n/a'}</Badge>
                    </Group>
                  </Group>
                  <Stack mt="sm" gap="xs">
                    {groupedCard.cards.map((card) => (
                      <InventoryListItem
                        key={card.id}
                        card={card}
                        onDelete={handleDelete}
                        onAddToShoppingList={handleAddToShoppingList}
                        addToShoppingListLoading={addingToShoppingListIds.includes(card.id)}
                        onClick={handleCardClick}
                      />
                    ))}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        ) : (
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
        )}

        {inventoryViewMode === 'grouped' && groupedCards.length === 0 && (
          <Text size="sm" c="dimmed">
            Keine Produkte gefunden.
          </Text>
        )}

        {inventoryViewMode === 'flat' && layoutMode !== 'cards' && filteredCards.length === 0 && (
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
  if (w === WarnLevel.OK) {return { color: 'green' as const, text: 'Frisch' };}
  if (w === WarnLevel.BALD) {return { color: 'yellow' as const, text: 'Bald' };}
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
