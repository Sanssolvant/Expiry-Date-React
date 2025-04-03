import { useState } from 'react';
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
import { Box, SimpleGrid } from '@mantine/core';
import { GridItem } from './GridItem';

type CardData = {
  id: string;
  image: string;
  menge: number;
  datum: string;
};

const initialCards: CardData[] = [
  { id: '1', image: '', menge: 1, datum: '2025-04-01' },
  { id: '2', image: '', menge: 2, datum: '2025-04-02' },
  { id: '3', image: '', menge: 3, datum: '2025-04-03' },
  { id: '4', image: '', menge: 4, datum: '2025-04-04' },
];

const TOTAL_SLOTS = 9;

export default function DndGrid() {
  const [cards, setCards] = useState<CardData[]>(initialCards);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  // Leere Slots auffüllen (visuell)
  const visibleCards = [...cards];
  const emptySlotCount = TOTAL_SLOTS - visibleCards.length;

  return (
    <Box bg="gray.1" p="md" style={{ borderRadius: 8 }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3 }}
            spacing={{ base: 10, sm: 20 }}
            verticalSpacing={{ base: 'md', sm: 'xl' }}
          >
            {visibleCards.map((card) => (
              <SortableCard key={card.id} card={card} />
            ))}

            {Array.from({ length: emptySlotCount }).map((_, i) => (
              <Box
                key={`empty-${i}`}
                bg="gray.2"
                style={{
                  minHeight: 200,
                  borderRadius: 8,
                  border: '2px dashed #ccc',
                }}
              />
            ))}
          </SimpleGrid>
        </SortableContext>
      </DndContext>
    </Box>
  );
}

function SortableCard({ card }: { card: CardData }) {
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
    <motion.div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <GridItem image={card.image} menge={card.menge} datum={card.datum} isDragging={isDragging} />
    </motion.div>
  );
}
