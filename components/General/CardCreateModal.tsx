'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

import { IconCalendar, IconCategory, IconLabel, IconPhoto } from '@tabler/icons-react';
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
  initialData?: CardData | null;
};

const kategorien = ['Obst', 'Gemüse', 'Milchprodukt', 'Tiefkühl', 'Konserve', 'Getreide'];
const einheiten = ['Stk', 'g', 'kg', 'ml', 'L', 'Packung'];

export function CardCreateModal({ opened, onClose, onCreate, initialData }: Props) {
  const [file, setFile] = useState<File | null>(null);

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
      name: (value) => (value.length < 1 ? 'Bitte Name angeben' : null),
      kategorie: (value) => (!value ? 'Kategorie wählen' : null),
    },
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

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
  }, [opened, initialData]);

  // const getWarnLevel = (ablauf: Date): 'ok' | 'bald' | 'abgelaufen' => {
  //   const today = new Date();
  //   const expiry = new Date(ablauf);
  //   const diff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  //   if (diff < 0) {
  //     return 'abgelaufen';
  //   }
  //   if (diff <= 3) {
  //     return 'bald';
  //   }
  //   return 'ok';
  // };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    return json.url || null;
  };

  const handleSubmit = async (values: typeof form.values) => {
    const ablaufdatumStr = formatDateToDisplay(values.ablaufdatum);
    const erfasstAmStr = formatDateToDisplay(values.erfasstAm);

    let imageUrl = initialData?.image || '';
    if (file) {
      const uploaded = await handleImageUpload(file);
      if (uploaded) {
        imageUrl = uploaded;
      }
    }

    const newCard: CardData = {
      id: initialData?.id || uuidv4(),
      name: values.name,
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
  };

  const handleImageChange = (f: File | null) => {
    setFile(f);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialData ? 'Karte bearbeiten' : 'Neue Karte erstellen'}
      centered
      radius="md"
      size="lg"
      overlayProps={{ blur: 3, backgroundOpacity: 0.45 }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          <TextInput
            leftSection={<IconLabel size={18} stroke={1.5} />}
            maxLength={20}
            label="Name"
            {...form.getInputProps('name')}
            required
          />

          <Group grow>
            <NumberInput label="Menge" max={999999999} min={1} {...form.getInputProps('menge')} />
            <Select
              label="Einheit"
              allowDeselect={false}
              data={einheiten}
              {...form.getInputProps('einheit')}
            />
          </Group>

          <Group grow>
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
          </Group>

          <Select
            allowDeselect={false}
            leftSection={<IconCategory size={18} stroke={1.5} />}
            label="Kategorie"
            data={kategorien}
            placeholder="Kategorie wählen"
            {...form.getInputProps('kategorie')}
            required
          />

          <FileInput
            leftSection={<IconPhoto size={18} stroke={1.5} />}
            label="Bild auswählen"
            accept="image/*"
            onChange={handleImageChange}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} type="button">
              Abbrechen
            </Button>
            <Button type="submit">Speichern</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
