'use client';

import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  alpha,
  Badge,
  Box,
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';

import { IconCalendar, IconCategory, IconLabel, IconPhoto, IconPlus } from '@tabler/icons-react';
import { formatDateToDisplay, parseDateFromString } from '@/app/lib/dateUtils';
import { einheiten, kategorien } from '@/app/types';

type CardData = {
  id: string;
  name: string;
  image: string;
  menge: number;
  einheit: string;
  ablaufdatum: string;
  erfasstAm: string;
  kategorie: string;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onCreate: (card: CardData) => void;
  initialData?: CardData | null;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? alpha(theme.colors.dark[5], 0.35) : alpha(theme.colors.gray[1], 0.6);
  const border = isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3];

  return (
    <Box
      style={{
        borderRadius: 16,
        border: `1px solid ${border}`,
        background: bg,
        padding: 12,
      }}
    >
      <Group justify="space-between" align="flex-start" mb="xs">
        <Box>
          <Text fw={700} size="sm" lh={1.2}>
            {title}
          </Text>
          {description && (
            <Text size="xs" c="dimmed" mt={2}>
              {description}
            </Text>
          )}
        </Box>
      </Group>
      {children}
    </Box>
  );
}

export function CardCreateModal({ opened, onClose, onCreate, initialData }: Props) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initialData);

  const form = useForm({
    initialValues: {
      name: '',
      menge: 1,
      einheit: 'Stk',
      ablaufdatum: new Date(),
      erfasstAm: new Date(),
      kategorie: '',
      image: null as File | null,
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Bitte einen Produktnamen eingeben.' : null),
      kategorie: (value) => (!value ? 'Bitte eine Kategorie auswählen.' : null),
    },
  });

  useEffect(() => {
    if (!opened) return;

    if (initialData) {
      form.setValues({
        name: initialData.name,
        menge: initialData.menge,
        einheit: initialData.einheit,
        ablaufdatum: parseDateFromString(initialData.ablaufdatum),
        erfasstAm: parseDateFromString(initialData.erfasstAm),
        kategorie: initialData.kategorie,
        image: null,
      });
      setFile(null);
    } else {
      form.reset();
      setFile(null);
    }
  }, [opened, initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) return null;

    const json = await res.json();
    return json.url || null;
  };

  const waitForImage = async (url: string, maxRetries = 5, delay = 300): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok && res.headers.get('content-type')?.startsWith('image/')) return true;
      } catch {
        /* empty */
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
  };

  const title = isEdit ? 'Karte bearbeiten' : 'Neue Karte erstellen';
  const subtitle = isEdit
    ? 'Passe die Angaben an und speichere die Änderungen.'
    : 'Fülle die Felder aus – du kannst ein Bild optional hinzufügen.';

  const headerBg = useMemo(
    () => (isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.75)),
    [isDark, theme]
  );
  const headerBorder = useMemo(
    () => (isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3]),
    [isDark, theme]
  );

  const handleSubmit = async (values: typeof form.values) => {
    setSaving(true);
    try {
      const ablaufdatumStr = formatDateToDisplay(values.ablaufdatum);
      const erfasstAmStr = formatDateToDisplay(values.erfasstAm);

      let imageUrl = initialData?.image || '';

      if (file) {
        const uploaded = await handleImageUpload(file);
        if (uploaded) {
          await waitForImage(uploaded);
          imageUrl = uploaded;
        }
      }

      const newCard: CardData = {
        id: initialData?.id || uuidv4(),
        name: values.name.trim(),
        menge: values.menge,
        einheit: values.einheit,
        ablaufdatum: ablaufdatumStr,
        erfasstAm: erfasstAmStr,
        kategorie: values.kategorie,
        image: imageUrl,
      };

      onCreate(newCard);
      form.reset();
      setFile(null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!saving) onClose();
      }}
      centered
      radius="xl"
      size="lg"
      padding="lg"
      overlayProps={{ blur: 6, backgroundOpacity: 0.45 }}
      title={
        <Group gap="sm" align="center">
          <ThemeIcon radius="xl" variant="light">
            <IconPlus size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={800} lh={1.1}>
              {title}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              {subtitle}
            </Text>
          </Box>
          {isEdit && (
            <Badge ml="auto" variant={isDark ? 'filled' : 'light'} radius="sm">
              Bearbeiten
            </Badge>
          )}
        </Group>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Basisdaten */}
          <Section title="Produkt" description="Name, Menge und Einheit">
            <Stack gap="sm">
              <TextInput
                leftSection={<IconLabel size={18} stroke={1.5} />}
                maxLength={40}
                label="Name"
                placeholder="z.B. Milch"
                {...form.getInputProps('name')}
                required
              />

              <SimpleGrid cols={{ base: 2 }} spacing="sm">
                <NumberInput
                  label="Menge"
                  min={1}
                  max={999999999}
                  hideControls
                  placeholder="z.B. 2"
                  {...form.getInputProps('menge')}
                />
                <Select
                  label="Einheit"
                  allowDeselect={false}
                  data={einheiten}
                  {...form.getInputProps('einheit')}
                />
              </SimpleGrid>
            </Stack>
          </Section>

          {/* Datum */}
          <Section title="Daten" description="Erfasst am & Ablaufdatum">
            <SimpleGrid cols={{ base: 2 }} spacing="sm">
              <DatePickerInput
                leftSection={<IconCalendar size={18} stroke={1.5} />}
                leftSectionPointerEvents="none"
                label="Erfasst am"
                dropdownType="modal"
                valueFormat="DD.MM.YYYY"
                {...form.getInputProps('erfasstAm')}
              />
              <DatePickerInput
                leftSection={<IconCalendar size={18} stroke={1.5} />}
                leftSectionPointerEvents="none"
                dropdownType="modal"
                label="Ablaufdatum"
                valueFormat="DD.MM.YYYY"
                {...form.getInputProps('ablaufdatum')}
              />
            </SimpleGrid>
          </Section>

          {/* Kategorie */}
          <Section title="Kategorie" description="Hilft beim Filtern & Sortieren">
            <Select
              allowDeselect={false}
              leftSection={<IconCategory size={18} stroke={1.5} />}
              label="Kategorie"
              data={kategorien}
              placeholder="Kategorie wählen"
              {...form.getInputProps('kategorie')}
              required
            />
          </Section>

          {/* Bild */}
          <Section title="Bild" description="Optional – Foto macht die Karte schneller erkennbar">
            <FileInput
              leftSection={<IconPhoto size={18} stroke={1.5} />}
              label="Bild auswählen"
              placeholder="Optional"
              accept="image/*"
              capture="environment"
              value={file}
              onChange={setFile}
            />
            <Box
              mt="xs"
              style={{
                borderRadius: 12,
                border: `1px solid ${headerBorder}`,
                background: headerBg,
                padding: 10,
              }}
            >
              <Text size="xs" c="dimmed">
                Tipp: Du kannst auch ohne Bild speichern und später bearbeiten.
              </Text>
            </Box>
          </Section>

          {/* Footer */}
          <Group justify="space-between" mt="xs">
            <Button
              variant="default"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Group gap="sm">
              <Button type="submit" loading={saving}>
                Speichern
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
