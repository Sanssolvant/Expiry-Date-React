'use client';

import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  alpha,
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
import { notifications } from '@mantine/notifications';

import {
  IconCalendar,
  IconCategory,
  IconLabel,
  IconPhoto,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { formatDateToDisplay, parseDateFromString } from '@/app/lib/dateUtils';

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
  unitOptions: string[];
  categoryOptions: string[];
  initialData?: CardData | null;
  barcodeValue?: string | null;
  onAddUnitOption?: (unit: string) => void;
  onAddCategoryOption?: (category: string) => void;
};

const CREATE_OPTION_PREFIX = '__create__:';

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((x) => x.trim()).filter(Boolean)));
}

function normalizeOptionValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

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

export function CardCreateModal({
  opened,
  onClose,
  onCreate,
  unitOptions,
  categoryOptions,
  initialData,
  barcodeValue,
  onAddUnitOption,
  onAddCategoryOption,
}: Props) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [extraUnitOptions, setExtraUnitOptions] = useState<string[]>([]);
  const [extraCategoryOptions, setExtraCategoryOptions] = useState<string[]>([]);

  const isEdit = Boolean(initialData);
  const mergedUnitOptions = useMemo(
    () => uniqueStrings([...unitOptions, ...extraUnitOptions, initialData?.einheit ?? '']),
    [unitOptions, extraUnitOptions, initialData?.einheit]
  );
  const mergedCategoryOptions = useMemo(
    () => uniqueStrings([...categoryOptions, ...extraCategoryOptions, initialData?.kategorie ?? '']),
    [categoryOptions, extraCategoryOptions, initialData?.kategorie]
  );

  const form = useForm({
    initialValues: {
      name: '',
      menge: 1,
      einheit: 'Stk',
      ablaufdatum: new Date() as Date | null,
      erfasstAm: new Date() as Date | null,
      kategorie: '',
      image: null as File | null,
    },
    validate: {
      name: (value) => {
        const cleaned = value.trim();
        if (cleaned.length < 1) {
          return 'Bitte einen Produktnamen eingeben.';
        }
        if (cleaned.length > 80) {
          return 'Name darf maximal 80 Zeichen haben.';
        }
        return null;
      },
      menge: (value) => {
        if (!Number.isFinite(value) || value < 1) {
          return 'Bitte eine Menge grösser oder gleich 1 eingeben.';
        }
        if (!Number.isInteger(value)) {
          return 'Bitte nur ganze Zahlen verwenden.';
        }
        return null;
      },
      einheit: (value) => (!value?.trim() ? 'Bitte eine Einheit auswählen.' : null),
      kategorie: (value) => (!value?.trim() ? 'Bitte eine Kategorie auswählen.' : null),
      erfasstAm: (value) => (!value ? 'Bitte ein Erfassungsdatum auswählen.' : null),
      ablaufdatum: (value) => (!value ? 'Bitte ein Ablaufdatum auswählen.' : null),
    },
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

    setUploadError(null);
    setRemoveExistingImage(false);
    setUnitSearch('');
    setCategorySearch('');

    if (initialData) {
      let parsedAblauf = new Date();
      let parsedErfasst = new Date();

      try {
        parsedAblauf = parseDateFromString(initialData.ablaufdatum);
      } catch {
        parsedAblauf = new Date();
      }

      try {
        parsedErfasst = parseDateFromString(initialData.erfasstAm);
      } catch {
        parsedErfasst = new Date();
      }

      form.setValues({
        name: initialData.name,
        menge: initialData.menge,
        einheit: initialData.einheit,
        ablaufdatum: parsedAblauf,
        erfasstAm: parsedErfasst,
        kategorie: initialData.kategorie,
        image: null,
      });
      setFile(null);
    } else {
      form.reset();
      form.setValues({
        einheit: mergedUnitOptions[0] || 'Stk',
        kategorie: mergedCategoryOptions[0] || '',
      });
      setFile(null);
    }
  }, [opened, initialData, mergedUnitOptions, mergedCategoryOptions]);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleImageUpload = async (uploadFile: File): Promise<{ url: string | null; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          url: null,
          error: typeof json?.error === 'string' ? json.error : 'Bild-Upload fehlgeschlagen.',
        };
      }

      if (typeof json?.url !== 'string' || !json.url.trim()) {
        return { url: null, error: 'Upload erfolgreich, aber keine Bild-URL erhalten.' };
      }

      return { url: json.url };
    } catch {
      return { url: null, error: 'Netzwerkfehler beim Bild-Upload.' };
    }
  };

  const title = isEdit ? 'Karte bearbeiten' : 'Neue Karte erstellen';
  const subtitle = isEdit
    ? 'Passe die Angaben an und speichere die Änderungen.'
    : 'Fülle die Felder aus - ein Bild ist optional.';

  const headerBg = useMemo(
    () => (isDark ? alpha(theme.colors.dark[6], 0.55) : alpha(theme.white, 0.75)),
    [isDark, theme]
  );
  const headerBorder = useMemo(
    () => (isDark ? alpha(theme.colors.dark[2], 0.35) : theme.colors.gray[3]),
    [isDark, theme]
  );

  const existingImageUrl = !removeExistingImage ? initialData?.image?.trim() ?? '' : '';
  const imagePreviewUrl = filePreviewUrl || existingImageUrl;

  const unitSelectData = useMemo(() => {
    const options = mergedUnitOptions.map((option) => ({ value: option, label: option }));
    const query = normalizeOptionValue(unitSearch);
    const hasExactMatch = options.some((option) => option.value.toLowerCase() === query.toLowerCase());

    if (query && !hasExactMatch) {
      options.unshift({
        value: `${CREATE_OPTION_PREFIX}${query}`,
        label: `+ "${query}" erstellen`,
      });
    }

    return options;
  }, [mergedUnitOptions, unitSearch]);

  const categorySelectData = useMemo(() => {
    const options = mergedCategoryOptions.map((option) => ({ value: option, label: option }));
    const query = normalizeOptionValue(categorySearch);
    const hasExactMatch = options.some((option) => option.value.toLowerCase() === query.toLowerCase());

    if (query && !hasExactMatch) {
      options.unshift({
        value: `${CREATE_OPTION_PREFIX}${query}`,
        label: `+ "${query}" erstellen`,
      });
    }

    return options;
  }, [mergedCategoryOptions, categorySearch]);

  const addUnitOption = (rawValue: string) => {
    const normalized = normalizeOptionValue(rawValue);
    if (!normalized) {
      return;
    }

    setExtraUnitOptions((prev) => uniqueStrings([...prev, normalized]));
    onAddUnitOption?.(normalized);
    form.setFieldValue('einheit', normalized);
    setUnitSearch('');
  };

  const addCategoryOption = (rawValue: string) => {
    const normalized = normalizeOptionValue(rawValue);
    if (!normalized) {
      return;
    }

    setExtraCategoryOptions((prev) => uniqueStrings([...prev, normalized]));
    onAddCategoryOption?.(normalized);
    form.setFieldValue('kategorie', normalized);
    setCategorySearch('');
  };

  const handleSubmit = async (values: typeof form.values) => {
    setSaving(true);
    setUploadError(null);

    try {
      if (!values.ablaufdatum || !values.erfasstAm) {
        return;
      }

      const ablaufdatumStr = formatDateToDisplay(values.ablaufdatum);
      const erfasstAmStr = formatDateToDisplay(values.erfasstAm);

      let imageUrl = removeExistingImage ? '' : initialData?.image || '';

      if (file) {
        const uploaded = await handleImageUpload(file);
        if (!uploaded.url) {
          const message = uploaded.error || 'Bild-Upload fehlgeschlagen.';
          setUploadError(message);
          notifications.show({
            title: 'Bild-Upload fehlgeschlagen',
            message,
            color: 'red',
          });
          return;
        }

        imageUrl = uploaded.url;
      }

      const newCard: CardData = {
        id: initialData?.id || uuidv4(),
        name: values.name.trim(),
        menge: values.menge,
        einheit: values.einheit.trim(),
        ablaufdatum: ablaufdatumStr,
        erfasstAm: erfasstAmStr,
        kategorie: values.kategorie.trim(),
        image: imageUrl,
      };

      await onCreate(newCard);
      form.reset();
      setFile(null);
      onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Speichern fehlgeschlagen',
        message: error?.message || 'Die Karte konnte nicht gespeichert werden.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!saving) {
          onClose();
        }
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
        </Group>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Section title="Produkt" description="Name, Menge und Einheit">
            <Stack gap="sm">
              <TextInput
                leftSection={<IconLabel size={18} stroke={1.5} />}
                maxLength={80}
                label="Name"
                placeholder="z.B. Milch"
                {...form.getInputProps('name')}
                required
              />

              {barcodeValue ? (
                <TextInput
                  label="Barcode"
                  value={barcodeValue}
                  readOnly
                  description="Produktvorlage wird beim Speichern für diesen Barcode aktualisiert."
                />
              ) : null}

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <NumberInput
                  label="Menge"
                  min={1}
                  max={999999999}
                  allowDecimal={false}
                  hideControls
                  placeholder="z.B. 2"
                  {...form.getInputProps('menge')}
                />
                <Select
                  label="Einheit"
                  allowDeselect={false}
                  searchable
                  searchValue={unitSearch}
                  onSearchChange={setUnitSearch}
                  data={unitSelectData}
                  value={form.values.einheit}
                  onChange={(value) => {
                    if (!value) {
                      return;
                    }

                    if (value.startsWith(CREATE_OPTION_PREFIX)) {
                      addUnitOption(value.slice(CREATE_OPTION_PREFIX.length));
                      return;
                    }

                    form.setFieldValue('einheit', value);
                  }}
                  error={form.errors.einheit}
                />
              </SimpleGrid>
            </Stack>
          </Section>

          <Section title="Daten" description="Erfasst am und Ablaufdatum">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <DatePickerInput
                leftSection={<IconCalendar size={18} stroke={1.5} />}
                leftSectionPointerEvents="none"
                label="Erfasst am"
                valueFormat="DD.MM.YYYY"
                {...form.getInputProps('erfasstAm')}
              />
              <DatePickerInput
                leftSection={<IconCalendar size={18} stroke={1.5} />}
                leftSectionPointerEvents="none"
                label="Ablaufdatum"
                valueFormat="DD.MM.YYYY"
                {...form.getInputProps('ablaufdatum')}
              />
            </SimpleGrid>
          </Section>

          <Section title="Kategorie" description="Hilft beim Filtern und Sortieren">
            <Select
              allowDeselect={false}
              searchable
              leftSection={<IconCategory size={18} stroke={1.5} />}
              label="Kategorie"
              data={categorySelectData}
              searchValue={categorySearch}
              onSearchChange={setCategorySearch}
              value={form.values.kategorie}
              onChange={(value) => {
                if (!value) {
                  return;
                }

                if (value.startsWith(CREATE_OPTION_PREFIX)) {
                  addCategoryOption(value.slice(CREATE_OPTION_PREFIX.length));
                  return;
                }

                form.setFieldValue('kategorie', value);
              }}
              error={form.errors.kategorie}
              placeholder="Kategorie wählen"
              required
            />
          </Section>

          <Section title="Bild" description="Optional - Foto macht die Karte schneller erkennbar">
            <FileInput
              leftSection={<IconPhoto size={18} stroke={1.5} />}
              label="Bild auswählen"
              placeholder="Optional"
              accept="image/*"
              capture="environment"
              value={file}
              clearable
              onChange={(nextFile) => {
                setFile(nextFile);
                if (nextFile) {
                  setRemoveExistingImage(false);
                }
                setUploadError(null);
              }}
            />

            {imagePreviewUrl ? (
              <Box
                mt="xs"
                style={{
                  borderRadius: 12,
                  border: `1px solid ${headerBorder}`,
                  background: headerBg,
                  padding: 10,
                }}
              >
                <Box
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: `1px solid ${headerBorder}`,
                  }}
                >
                  <img src={imagePreviewUrl} alt="Produktbild Vorschau" style={{ width: '100%', display: 'block' }} />
                </Box>
                <Group justify="flex-end" mt="xs">
                  <Button
                    type="button"
                    variant="light"
                    color="red"
                    size="xs"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => {
                      setFile(null);
                      setRemoveExistingImage(true);
                      setUploadError(null);
                    }}
                  >
                    Bild entfernen
                  </Button>
                </Group>
              </Box>
            ) : null}

            {uploadError ? (
              <Text mt="xs" size="xs" c="red">
                {uploadError}
              </Text>
            ) : null}

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

          <Group justify="space-between" mt="xs" wrap="wrap" gap="sm">
            <Button variant="default" type="button" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
