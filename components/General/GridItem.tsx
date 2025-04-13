import { IconPhoto } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { Badge, Button, Card, Center, Image, Text } from '@mantine/core';
import { WarnLevel } from '@/app/types';

type Props = {
  image: string;
  name: string;
  menge: number;
  einheit: string;
  ablaufdatum: string;
  erfasstAm: string;
  kategorie: string;
  warnLevel: WarnLevel;
  isDragging?: boolean;
  onDelete?: () => void;
};

export function GridItem({
  image,
  name,
  menge,
  einheit,
  ablaufdatum,
  erfasstAm,
  kategorie,
  warnLevel,
  isDragging,
  onDelete,
}: Props) {
  console.error('📷 GridItem Image:', image);

  const warnColor =
    warnLevel === WarnLevel.OK ? 'green' : warnLevel === WarnLevel.BALD ? 'yellow' : 'red';

  return (
    <motion.div
      layout
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        width: '100%',
        height: 270,
        display: 'flex',
      }}
    >
      <Card
        shadow="sm"
        padding="sm"
        radius="md"
        withBorder
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Bild oder Icon */}
        <Card.Section>
          {image && image.trim() !== '' ? (
            <Image
              src={image}
              height={90}
              fit="cover"
              radius="sm"
              alt={name}
              style={{ width: '100%', objectFit: 'cover', objectPosition: 'center' }} // ✅
            />
          ) : (
            <Center style={{ height: 90, backgroundColor: '#f1f3f5' }}>
              <IconPhoto size={40} color="#ccc" />
            </Center>
          )}
        </Card.Section>

        {/* Warnlevel unter Bild */}
        <Badge
          color={warnColor}
          size="xs"
          variant="filled"
          mt="xs"
          style={{ alignSelf: 'flex-end', paddingBlock: '10px' }}
        >
          {warnLevel === WarnLevel.OK
            ? 'Frisch'
            : warnLevel === WarnLevel.BALD
              ? 'Bald abgelaufen'
              : 'Abgelaufen'}
        </Badge>

        {/* Inhalt */}
        <div style={{ flexGrow: 1 }}>
          <Text fw={600} size="sm" lineClamp={1}>
            {name}
          </Text>

          <Text size="xs" c="dimmed">
            Menge: {menge} {einheit}
          </Text>

          <Text size="xs" c="dimmed" lineClamp={1}>
            Kategorie: {kategorie}
          </Text>

          <div style={{ marginTop: 8 }}>
            <Text size="xs">Erfasst: {erfasstAm}</Text>
            <Text size="xs">Ablauf: {ablaufdatum}</Text>
          </div>
        </div>

        {/* Löschen Button */}
        {onDelete && (
          <Button
            onClick={(e) => {
              e.stopPropagation(); // verhindert Klick-Propagation zur Karte
              onDelete?.();
            }}
            color="red"
            variant="light"
            size="xs"
            fullWidth
            radius="sm"
            mt="xs"
          >
            Löschen
          </Button>
        )}
      </Card>
    </motion.div>
  );
}
