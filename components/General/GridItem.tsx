import { IconCalendar, IconPhoto, IconTrash } from '@tabler/icons-react';
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
  useMantineTheme,
} from '@mantine/core';
import { WarnLevel } from '@/app/types';
import { useMantineColorScheme } from '@mantine/core';

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

function warnBadge(w: WarnLevel) {
  if (w === WarnLevel.OK) return { color: 'green' as const, text: 'Frisch' };
  if (w === WarnLevel.BALD) return { color: 'yellow' as const, text: 'Bald' };
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
}: Props) {
  const { colorScheme } = useMantineColorScheme(); // 'light' | 'dark'
  const theme = useMantineTheme();
  const b = warnBadge(warnLevel);
  const isDark = colorScheme === 'dark';

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
        height: 350,
        cursor: isDragging ? 'grabbing' : 'grab',
        // "ring" Effekt wie vorher
        outline: isDragging ? `2px solid ${theme.colors[theme.primaryColor][5]}` : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Image */}
      <Box pos="relative" h={130} style={{overflow: 'hidden'}}>
        {image && image.trim() !== '' ? (
          <Image
            src={image}
            alt={name}
            h={130}
            w="100%"
            fit="cover"
            style={{ overflow: 'hidden' }}
          />
        ) : (
          <Center h={130} bg={isDark ? theme.colors.dark[6] : theme.colors.gray[1]}>
            <IconPhoto size={40} color={isDark ? theme.colors.dark[1] : theme.colors.gray[5]} />
          </Center>
        )}

        {/* gradient overlay */}
        <Box
          pos="absolute"
          inset={0}
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.60), rgba(0,0,0,0.10), rgba(0,0,0,0))',
          }}
        />

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
          <Text fw={600} size="md" lh={1.25} lineClamp={2}>
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
              <Text fw={500} lineClamp={1}>
                {kategorie}
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
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              fullWidth
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
        </Box>
      </Stack>
    </Card>
  );
}
