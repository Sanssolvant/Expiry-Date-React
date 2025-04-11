'use client';

import { useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconCategory,
  IconClockExclamation,
  IconSearch,
} from '@tabler/icons-react';
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { einheiten, kategorien, WarnLevel } from '@/app/types';

type Props = {
  filters: any;
  setFilters: (filters: any) => void;
  iconOnly?: boolean;
};

export function CardFilterMenu({ filters, setFilters, iconOnly }: Props) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button variant="default" onClick={() => setOpened(true)}>
        {iconOnly ? (
          <IconAdjustmentsHorizontal size={18} />
        ) : (
          <>
            <IconAdjustmentsHorizontal size={18} style={{ marginRight: 10 }} /> Filtern
          </>
        )}
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Filter"
        centered
        size="md"
        overlayProps={{ blur: 3, backgroundOpacity: 0.5 }}
      >
        <Stack gap="xs">
          <TextInput
            label="Name"
            leftSection={<IconSearch size={16} />}
            value={filters.name}
            onChange={(e) => setFilters((f: any) => ({ ...f, name: e.currentTarget.value }))}
          />
          <Select
            leftSection={<IconCategory size={18} stroke={1.5} />}
            label="Kategorie"
            data={kategorien}
            clearable
            value={filters.kategorie}
            onChange={(value) => setFilters((f: any) => ({ ...f, kategorie: value || '' }))}
          />
          <Group grow>
            <NumberInput
              label="Menge von"
              min={0}
              value={filters.mengeVon}
              onChange={(v) => setFilters((f: any) => ({ ...f, mengeVon: v }))}
            />
            <NumberInput
              label="bis"
              min={0}
              value={filters.mengeBis}
              onChange={(v) => setFilters((f: any) => ({ ...f, mengeBis: v }))}
            />
          </Group>
          <Select
            label="Einheit"
            data={einheiten}
            clearable
            value={filters.einheit}
            onChange={(value) => setFilters((f: any) => ({ ...f, einheit: value || '' }))}
          />
          <Select
            leftSection={<IconClockExclamation size={18} stroke={1.5} />}
            label="Warnlevel"
            data={[
              { value: WarnLevel.OK, label: 'Frisch' },
              { value: WarnLevel.BALD, label: 'Bald abgelaufen' },
              { value: WarnLevel.ABGELAUFEN, label: 'Abgelaufen' },
            ]}
            clearable
            value={filters.warnLevel}
            onChange={(value) => setFilters((f: any) => ({ ...f, warnLevel: value || '' }))}
          />
          <Group grow>
            <DatePickerInput
              label="Ablauf ab"
              valueFormat="DD.MM.YYYY"
              leftSection={<IconCalendar size={16} />}
              value={filters.ablaufVon}
              onChange={(v) => setFilters((f: any) => ({ ...f, ablaufVon: v }))}
            />
            <DatePickerInput
              label="bis"
              valueFormat="DD.MM.YYYY"
              leftSection={<IconCalendar size={16} />}
              value={filters.ablaufBis}
              onChange={(v) => setFilters((f: any) => ({ ...f, ablaufBis: v }))}
            />
          </Group>

          <Group justify="space-between" mt="md">
            <Button
              variant="light"
              color="gray"
              onClick={() =>
                setFilters({
                  name: '',
                  kategorie: '',
                  einheit: '',
                  warnLevel: '',
                  ablaufVon: null,
                  ablaufBis: null,
                  mengeVon: null,
                  mengeBis: null,
                })
              }
            >
              Filter zurücksetzen
            </Button>
            <Button variant="filled" onClick={() => setOpened(false)}>
              Übernehmen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
