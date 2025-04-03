import { motion } from 'framer-motion';
import { Card, Group, Image, Text } from '@mantine/core';

type Props = {
  image: string;
  menge: number;
  datum: string;
  isDragging?: boolean;
};

export function GridItem({ image, menge, datum, isDragging }: Props) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section>
          <Image src={image} height={140} alt="Bild" />
        </Card.Section>

        <Group justify="space-between" mt="md" mb="xs">
          <Text fw={500}>Menge: {menge}</Text>
          <Text size="sm" color="dimmed">
            {datum}
          </Text>
        </Group>
      </Card>
    </motion.div>
  );
}
