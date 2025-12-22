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
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconCheck,
  IconDeviceFloppy,
  IconHandMove,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  TextInput,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

import { formatDateToDisplay } from '@/app/lib/dateUtils';
import { calculateWarnLevel } from '@/app/lib/warnUtils';
import { parseAblauf, WarnLevel, warnPriority } from '@/app/types';
import type { Filters } from '@/app/types';

import { CardCreateModal } from './CardCreateModal';
import { CardFilterMenu } from './CardFilterMenu';
import { GridItem } from './GridItem';
import { SettingsMenu } from './SettingsMenu';
import { SpeechCreateModal } from './SpeechCreateModal';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { PhotoCreateModal } from './PhotoCreateModal';

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

export default function DndGrid() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [photoOpen, setPhotoOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [warnBaldAb, setWarnBaldAb] = useState(3);
  const [warnAbgelaufenAb, setWarnAbgelaufenAb] = useState(0);

  const [rawCards, setRawCards] = useState<Omit<CardData, 'warnLevel'>[]>([]);
  const [speechOpen, setSpeechOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);

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

  useEffect(() => setMounted(true), []);

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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/user-settings', { method: 'GET', credentials: 'include' });

        if (res.ok) {
          const settings = await res.json();
          if (settings.warnLevelBald != null) setWarnBaldAb(settings.warnLevelBald);
          if (settings.warnLevelExpired != null) setWarnAbgelaufenAb(settings.warnLevelExpired);
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Einstellungen:', error);
      }
    };

    loadSettings();
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
    // ✅ Wenn Sortierung aktiv ist, lassen wir Drag nicht zu
    if (filters.sort !== 'manual') return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setRawCards((prev) => arrayMove(prev, oldIndex, newIndex));
    }
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
        initialData={editingCard}
      />

      {/* Toolbar */}
      <Box
        mt="md"
        style={{
          overflowX: isMobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
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
            🎙️
          </Button>

          <Button variant="outline" onClick={() => setPhotoOpen(true)}>
            📷
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

          <CardFilterMenu iconOnly={isMobile} filters={filters} setFilters={setFilters} />

          <SettingsMenu
            iconOnly={isMobile}
            baldAb={warnBaldAb}
            abgelaufenAb={warnAbgelaufenAb}
            setBaldAb={setWarnBaldAb}
            setAbgelaufenAb={setWarnAbgelaufenAb}
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

      {/* Grid */}
      <Box
        p="md"
        style={{
          borderRadius: 8,
          backgroundColor: isDark ? theme.colors.dark[4] : theme.colors.gray[1],
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredCards.map((c) => c.id)} strategy={rectSortingStrategy}>
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
                  onClick={handleCardClick}
                  dndDisabled={filters.sort !== 'manual'}
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
          </SortableContext>
        </DndContext>
      </Box>
    </Stack>
  );
}

function SortableCard({
  card,
  onDelete,
  onClick,
  dndDisabled,
}: {
  card: CardData;
  onDelete: (id: string) => void;
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
        onDelete={() => onDelete(card.id)}
      />
    </motion.div>
  );
}
