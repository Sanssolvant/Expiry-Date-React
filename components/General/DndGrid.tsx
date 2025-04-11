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
import { IconCheck, IconDeviceFloppy, IconPlus, IconX } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { formatDateToDisplay } from '@/app/lib/dateUtils';
import { calculateWarnLevel } from '@/app/lib/warnUtils';
import { WarnLevel } from '@/app/types';
import { CardCreateModal } from './CardCreateModal';
import { CardFilterMenu } from './CardFilterMenu';
import { GridItem } from './GridItem';
import { SettingsMenu } from './SettingsMenu';

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
  const [loading, setLoading] = useState(false);
  const [warnBaldAb, setWarnBaldAb] = useState(3);
  const [warnAbgelaufenAb, setWarnAbgelaufenAb] = useState(0);
  const [rawCards, setRawCards] = useState<Omit<CardData, 'warnLevel'>[]>([]);

  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [filters, setFilters] = useState({
    name: '',
    kategorie: '',
    einheit: '',
    warnLevel: '',
    ablaufVon: null as Date | null,
    ablaufBis: null as Date | null,
    mengeVon: null,
    mengeBis: null,
  });

  const isMobile = useMediaQuery('(max-width: 500px)'); // oder '(max-width: 768px)' je nach Wunsch

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
        const res = await fetch('/api/user-settings', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const settings = await res.json();
          if (settings.warnLevelBald != null) {
            setWarnBaldAb(settings.warnLevelBald);
          }
          if (settings.warnLevelExpired != null) {
            setWarnAbgelaufenAb(settings.warnLevelExpired);
          }
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Einstellungen:', error);
      }
    };

    loadSettings();
  }, []);

  const filteredCards = cards.filter((card) => {
    const nameMatch = card.name.toLowerCase().includes(filters.name.toLowerCase());
    const kategorieMatch = !filters.kategorie || card.kategorie === filters.kategorie;
    const einheitMatch = !filters.einheit || card.einheit === filters.einheit;
    const warnLevelMatch = !filters.warnLevel || card.warnLevel === filters.warnLevel;

    const ablaufDate = new Date(card.ablaufdatum.split('.').reverse().join('-'));
    const ablaufVonMatch = !filters.ablaufVon || ablaufDate >= filters.ablaufVon;
    const ablaufBisMatch = !filters.ablaufBis || ablaufDate <= filters.ablaufBis;

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
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setRawCards((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const handleCreateCard = (card: CardData) => {
    const { warnLevel, ...cardWithoutWarn } = card;
    const exists = rawCards.find((c) => c.id === card.id);
    if (exists) {
      setRawCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    } else {
      setRawCards((prev) => [...prev, cardWithoutWarn]);
    }
    setEditingCard(null);
  };

  const handleDelete = (id: string) => {
    setRawCards((prev) => prev.filter((card) => card.id !== id));
  };

  const handleCardClick = (card: CardData) => {
    setEditingCard(card);
    setModalOpen(true);
  };

  if (!mounted) {
    return null;
  }

  const handleSave = async () => {
    setLoading(true);

    const payload = cards.map(({ warnLevel, ...rest }) => rest);

    const res = await fetch('/api/save-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 🔐 Damit Session gesendet wird!
      body: JSON.stringify({ cards: payload }),
    });

    if (res.ok) {
      const result = await res.json();

      notifications.show({
        title: 'Gespeichert',
        message: `${result.count ?? 'Alle'} Karten wurden erfolgreich gespeichert.`,
        color: 'teal',
        icon: <IconCheck size={18} />,
      });
    } else {
      const error = await res.json();
      notifications.show({
        title: 'Fehler beim Speichern',
        message: error?.error || 'Unbekannter Fehler beim Speichern',
        color: 'red',
        icon: <IconX size={18} />,
      });
    }

    setLoading(false);
  };

  return (
    <Stack>
      <CardCreateModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCard(null);
        }}
        onCreate={handleCreateCard}
        initialData={editingCard}
      />

      <Group mt="md" justify="center">
        <Button onClick={() => setModalOpen(true)}>
          {isMobile ? (
            <IconPlus size={18} />
          ) : (
            <>
              {' '}
              <IconPlus size={18} style={{ marginRight: 10 }} /> Karte hinzufügen{' '}
            </>
          )}
        </Button>

        <Button onClick={handleSave} color="green" variant="outline" loading={loading}>
          {isMobile ? (
            <IconDeviceFloppy size={18} />
          ) : (
            <>
              {' '}
              <IconDeviceFloppy size={18} style={{ marginRight: 10 }} /> Alle speichern{' '}
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
      </Group>

      <Box
        p="md"
        style={{
          borderRadius: 8,
          backgroundColor: isDark ? theme.colors.dark[4] : theme.colors.gray[1],
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
            <SimpleGrid
              cols={{ base: 2, sm: 4, md: 6 }}
              spacing={{ base: 10, sm: 20 }}
              verticalSpacing={{ base: 'md', sm: 'xl' }}
            >
              {filteredCards.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  onDelete={handleDelete}
                  onClick={handleCardClick}
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
}: {
  card: CardData;
  onDelete: (id: string) => void;
  onClick: (card: CardData) => void;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    width: '100%',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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
        warnLevel={card.warnLevel ?? calculateWarnLevel(card.ablaufdatum)} // 🔥 Fallback
        isDragging={isDragging}
        onDelete={() => onDelete(card.id)}
      />
    </motion.div>
  );
}
