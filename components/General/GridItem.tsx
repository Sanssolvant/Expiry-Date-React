import { IconCalendar, IconPhoto, IconShoppingCartPlus, IconTrash } from '@tabler/icons-react';
import {
  alpha,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Image,
  Stack,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
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
  onAddToShoppingList?: () => void;
  addToShoppingListLoading?: boolean;
};

function warnBadge(w: WarnLevel) {
  if (w === WarnLevel.OK) {return { color: 'green' as const, text: 'Frisch' };}
  if (w === WarnLevel.BALD) {return { color: 'yellow' as const, text: 'Bald' };}
  return { color: 'red' as const, text: 'Abgelaufen' };
}

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
  onAddToShoppingList,
  addToShoppingListLoading,
}: Props) {
  const { colorScheme } = useMantineColorScheme(); // 'light' | 'dark'
  const theme = useMantineTheme();
  const b = warnBadge(warnLevel);
  const isDark = colorScheme === 'dark';
  const hasImage = image && image.trim() !== '';

  const tileBg = isDark
    ? alpha(theme.colors.dark[5], 0.35)
    : alpha(theme.colors.gray[1], 0.6);

  const tileBorder = isDark
    ? alpha(theme.colors.dark[2], 0.35)
    : theme.colors.gray[3];

  const surfaceBg = isDark
    ? alpha(theme.colors.dark[6], 0.55)
    : alpha(theme.white, 0.6);

  return (
    <Card
      radius="xl"
      withBorder
      shadow="sm"
      padding={0}
      style={{
        minHeight: 350,
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'grab',
        // "ring" Effekt wie vorher
        outline: isDragging ? `2px solid ${theme.colors[theme.primaryColor][5]}` : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Image */}
      <Box pos="relative" h={130} style={{ overflow: 'hidden' }}>
        {hasImage ? (
          <Image
            src={image}
            alt={name}
            h={130}
            w="100%"
            fit="cover"
            style={{ overflow: 'hidden' }}
          />
        ) : (
          <Center
            h={130}
            style={{
              borderBottom: `1px solid ${tileBorder}`,
              background: isDark
                ? `linear-gradient(135deg, ${alpha(theme.colors.dark[7], 0.85)} 0%, ${alpha(theme.colors.dark[5], 0.72)} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.white, 0.96)} 0%, ${alpha(theme.colors.gray[1], 0.82)} 100%)`,
            }}
          >
            <Stack align="center" gap={4}>
              <IconPhoto size={34} color={isDark ? theme.colors.dark[1] : theme.colors.gray[5]} />
              <Text size="xs" c="dimmed">
                Kein Bild
              </Text>
            </Stack>
          </Center>
        )}

        {hasImage ? (
          <Box
            pos="absolute"
            inset={0}
            style={{
              background: isDark
                ? 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.12), rgba(0,0,0,0))'
                : 'linear-gradient(to top, rgba(15,23,42,0.38), rgba(15,23,42,0.08), rgba(15,23,42,0))',
            }}
          />
        ) : null}

        {/* status badge */}
        <Box pos="absolute" top={12} right={12}>
          <Badge color={b.color} variant="filled" radius="sm">
            {b.text}
          </Badge>
        </Box>
      </Box>

      {/* Content */}
      <Stack gap={0} px="md" py="sm" style={{ flex: 1 }}>
        <Box style={{ minHeight: 0 }}>
          <Text fw={600} size="md" lh={1.25} style={{ wordBreak: 'break-word' }}>
            {name}
          </Text>

          {/* two tiles */}
          <Group grow mt="sm" gap="sm" align="stretch">
            <Box
              style={{
                borderRadius: 16,
                border: `1px solid ${tileBorder}`,
                background: tileBg,
                padding: '10px 12px',
              }}
            >
              <Text size="xs" c="dimmed">
                Menge
              </Text>
              <Text fw={500}>
                {menge} {einheit}
              </Text>
            </Box>

            <Box
              style={{
                borderRadius: 16,
                border: `1px solid ${tileBorder}`,
                background: tileBg,
                padding: '10px 12px',
              }}
            >
              <Text size="xs" c="dimmed">
                Kategorie
              </Text>
              <Text
                fw={500}
                title={kategorie || 'Ohne Kategorie'}
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {kategorie || 'Ohne Kategorie'}
              </Text>
            </Box>
          </Group>

          {/* date block */}
          <Box
            mt="sm"
            style={{
              borderRadius: 16,
              border: `1px solid ${tileBorder}`,
              background: surfaceBg,
              padding: '10px 12px',
            }}
          >
            <Group gap={8} wrap="nowrap" align="center">
              <IconCalendar size={14} color={theme.colors.gray[6]} />
              <Text size="xs" c="dimmed">
                Erfasst
              </Text>
              <Text size="xs" style={{ marginLeft: 'auto' }}>
                {erfasstAm}
              </Text>
            </Group>

            <Group gap={8} wrap="nowrap" align="center" mt={6}>
              <IconCalendar size={14} color={theme.colors.gray[6]} />
              <Text size="xs" c="dimmed">
                Ablauf
              </Text>
              <Text size="xs" style={{ marginLeft: 'auto' }}>
                {ablaufdatum}
              </Text>
            </Group>
          </Box>
        </Box>

        {/* Footer */}
        <Box mt="auto" pt="sm">
          <Group grow>
            {onAddToShoppingList && (
              <Button
                variant="light"
                size="sm"
                leftSection={<IconShoppingCartPlus size={16} />}
                loading={addToShoppingListLoading}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToShoppingList();
                }}
              >
                Auf Liste
              </Button>
            )}

            {onDelete && (
              <Button
                variant="outline"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                Löschen
              </Button>
            )}
          </Group>
        </Box>
      </Stack>
    </Card>
  );
}
