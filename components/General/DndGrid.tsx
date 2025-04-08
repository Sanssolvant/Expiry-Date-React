'use client';

import { useEffect, useState } from 'react';
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
import { formatDateToDisplay } from '@/app/lib/dateUtils';
import { CardCreateModal } from './CardCreateModal';
import { GridItem } from './GridItem';

export type WarnLevel = 'ok' | 'bald' | 'abgelaufen';

export type CardData = {
  id: string;
  name: string;
  image: string;
  menge: number;
  einheit: string;
  ablaufdatum: string;
  kategorie: string;
  erfasstAm: string;
  warnLevel: WarnLevel;
};

export default function DndGrid() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
            warnLevel: prod.warnLevel,
          }));

          setCards(cardsFromDB);
        } else {
          console.warn('Ladefehler:', data?.error);
        }
      } catch (err) {
        console.error('❌ Fehler beim Kartenladen:', err);
      }
    };

    loadCards();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setCards((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const handleCreateCard = (card: CardData) => {
    const exists = cards.find((c) => c.id === card.id);
    if (exists) {
      setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    } else {
      setCards((prev) => [...prev, card]);
    }
    setEditingCard(null);
  };

  const handleDelete = (id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
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
    const res = await fetch('/api/save-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 🔐 Damit Session gesendet wird!
      body: JSON.stringify({ cards }),
    });

    if (res.ok) {
      const result = await res.json();
      // console.error('Gespeichert:', result);
      // Optional: Toast oder Erfolgsmeldung
    } else {
      const error = await res.json();
      // console.error('Fehler:', error);
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

      <Group mt="md">
        <Button onClick={() => setModalOpen(true)}>Karte hinzufügen</Button>
        <Button onClick={handleSave} color="green" variant="outline" loading={loading}>
          Alle speichern
        </Button>
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
              cols={{ base: 3, sm: 4, md: 5 }}
              spacing={{ base: 10, sm: 20 }}
              verticalSpacing={{ base: 'md', sm: 'xl' }}
            >
              {cards.map((card) => (
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
        warnLevel={card.warnLevel}
        isDragging={isDragging}
        onDelete={() => onDelete(card.id)}
      />
    </motion.div>
  );
}
