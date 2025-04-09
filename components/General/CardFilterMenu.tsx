'use client';

import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconCategory,
  IconClockExclamation,
  IconSearch,
} from '@tabler/icons-react';
import { Button, Group, NumberInput, Popover, Select, Stack, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';

const kategorien = ['Obst', 'Gemüse', 'Fleisch', 'Milchprodukt', 'Tiefkühl', 'Konserve'];
const einheiten = ['Stk', 'g', 'kg', 'ml', 'L', 'Packung'];

export type WarnLevel = 'ok' | 'bald' | 'abgelaufen';

type Props = {
  filters: any;
  setFilters: (filters: any) => void;
};

export function CardFilterMenu({ filters, setFilters }: Props) {
  return (
    <Popover width={300} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <Button variant="default" leftSection={<IconAdjustmentsHorizontal size={18} />}>
          Filtern
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
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
              { value: 'ok', label: 'Frisch' },
              { value: 'bald', label: 'Bald abgelaufen' },
              { value: 'abgelaufen', label: 'Abgelaufen' },
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

          {/* 👇 Hier kommt der Reset-Button */}
          <Button
            variant="light"
            color="blue"
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
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
