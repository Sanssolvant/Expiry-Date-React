'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, DonutChart } from '@mantine/charts';
import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import { loadProductsCached } from '@/app/lib/products-client-cache';

type NutritionInsightsProps = {
  className?: string;
};

type InventoryCard = {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  kategorie: string;
};

type MacroEstimate = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type NutritionItem = {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  kategorie: string;
  estimable: boolean;
  matchedFood: string;
  estimatedGrams: number | null;
  confidence: number;
  reason: string;
  macros: MacroEstimate;
};

type NutritionResponse = {
  items: NutritionItem[];
  totals: MacroEstimate;
  coverage: number;
  estimatedCount: number;
  unmatchedCount: number;
};

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function emptyResponse(): NutritionResponse {
  return {
    items: [],
    totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    coverage: 0,
    estimatedCount: 0,
    unmatchedCount: 0,
  };
}

function confidenceLabel(value: number) {
  if (value >= 0.8) {
    return 'hoch';
  }
  if (value >= 0.5) {
    return 'mittel';
  }
  return 'niedrig';
}

export function NutritionInsights({ className }: NutritionInsightsProps) {
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [products, setProducts] = useState<InventoryCard[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NutritionResponse>(emptyResponse);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      try {
        const productsRaw = await loadProductsCached();
        const mapped: InventoryCard[] = productsRaw.map((prod: any) => ({
          id: String(prod.id),
          name: String(prod.name ?? '').trim(),
          menge: Number(prod.menge ?? 0),
          einheit: String(prod.einheit ?? 'Stk'),
          kategorie: String(prod.kategorie ?? '').trim(),
        }));

        if (mounted) {
          setProducts(mapped);
          setSelectedIds(mapped.map((item) => item.id));
        }
      } catch (loadError: any) {
        if (mounted) {
          setProductsError(loadError?.message || 'Produkte konnten nicht geladen werden.');
        }
      } finally {
        if (mounted) {
          setProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        products
          .map((item) => item.kategorie.trim())
          .filter((item) => item.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));

    return [{ value: 'all', label: 'Alle Kategorien' }, ...unique.map((value) => ({ value, label: value }))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((item) => {
      if (selectedCategory !== 'all' && item.kategorie !== selectedCategory) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const hay = `${item.name} ${item.kategorie} ${item.einheit}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [products, query, selectedCategory]);

  const selectedProducts = useMemo(() => {
    const idSet = new Set(selectedIds);
    return products.filter((item) => idSet.has(item.id));
  }, [products, selectedIds]);

  async function loadNutrition() {
    if (selectedIds.length === 0) {
      setError('Wähle mindestens ein Produkt aus.');
      setData(emptyResponse());
      setHasLoaded(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }
      for (const id of selectedIds) {
        params.append('productId', id);
      }

      const endpoint = params.size > 0 ? `/api/nutrition/estimate?${params.toString()}` : '/api/nutrition/estimate';
      const res = await fetch(endpoint, { method: 'GET', credentials: 'include' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Nährwert-Schätzung fehlgeschlagen.');
      }

      setData({
        items: Array.isArray(payload?.items) ? payload.items : [],
        totals: {
          kcal: Number(payload?.totals?.kcal ?? 0),
          protein: Number(payload?.totals?.protein ?? 0),
          carbs: Number(payload?.totals?.carbs ?? 0),
          fat: Number(payload?.totals?.fat ?? 0),
        },
        coverage: Number(payload?.coverage ?? 0),
        estimatedCount: Number(payload?.estimatedCount ?? 0),
        unmatchedCount: Number(payload?.unmatchedCount ?? 0),
      });
    } catch (loadError: any) {
      setError(loadError?.message || 'Nährwert-Schätzung fehlgeschlagen.');
      setData(emptyResponse());
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }

  function toggleProduct(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) {
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((x) => x !== id);
    });
  }

  const estimatedItems = useMemo(() => {
    return data.items
      .filter((item) => item.estimable)
      .sort((a, b) => Number(b.macros?.kcal ?? 0) - Number(a.macros?.kcal ?? 0));
  }, [data.items]);

  const unmatchedItems = useMemo(() => {
    return data.items.filter((item) => !item.estimable);
  }, [data.items]);

  const macroChartData = [
    { macro: 'Protein', gramm: roundOne(data.totals.protein) },
    { macro: 'Kohlenhydrate', gramm: roundOne(data.totals.carbs) },
    { macro: 'Fett', gramm: roundOne(data.totals.fat) },
  ];

  const coverageChartData = [
    { name: 'Geschätzt', value: data.estimatedCount, color: 'teal.6' },
    { name: 'Nicht schätzbar', value: data.unmatchedCount, color: 'gray.6' },
  ];

  return (
    <Stack gap="md" className={className}>
      <Paper withBorder radius="xl" p="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              KI-Schätzung
            </Text>
            <Title order={2}>Energie- und Nährwertblick</Title>
            <Text size="sm" c="dimmed">
              Ungefähre Makros und Kalorien aus deinen vorhandenen Produkten.
            </Text>
          </Stack>
          <Group gap="xs" align="center">
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={loadNutrition}
              loading={loading}
              disabled={productsLoading || selectedIds.length === 0}
            >
              Nährwerte für Auswahl berechnen
            </Button>
            <Badge color={data.coverage >= 60 ? 'teal' : 'yellow'} variant="light">
              Abdeckung: {data.coverage}%
            </Badge>
            <Badge color="gray" variant="light">
              Produkte: {data.items.length}
            </Badge>
          </Group>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Paper withBorder p="md" radius="lg">
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={600}>Produkte eingrenzen</Text>
            <Badge color="gray" variant="light">
              Ausgewählt: {selectedProducts.length} / {products.length}
            </Badge>
          </Group>

          <Select
            label="Kategorie"
            value={selectedCategory}
            data={categories}
            onChange={(value) => setSelectedCategory(value || 'all')}
            mb="sm"
          />

          <Group gap="xs" mb="sm">
            <Button
              size="xs"
              variant="light"
              onClick={() => setSelectedIds(products.map((item) => item.id))}
              disabled={products.length === 0}
            >
              Alle
            </Button>
            <Button size="xs" variant="default" onClick={() => setSelectedIds([])}>
              Keine
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() => setSelectedIds(filteredProducts.map((item) => item.id))}
              disabled={filteredProducts.length === 0}
            >
              Nur sichtbare
            </Button>
          </Group>

          <TextInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            placeholder="Produkt suchen..."
            mb="sm"
          />

          {productsLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : productsError ? (
            <Text c="red" size="sm">
              {productsError}
            </Text>
          ) : (
            <ScrollArea h={320} type="always">
              <Stack gap={6} pr={4}>
                {filteredProducts.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Keine Produkte für diesen Filter.
                  </Text>
                ) : (
                  filteredProducts.map((item) => (
                    <Checkbox
                      key={item.id}
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) => toggleProduct(item.id, event.currentTarget.checked)}
                      label={`${item.name} (${item.menge} ${item.einheit})`}
                    />
                  ))
                )}
              </Stack>
            </ScrollArea>
          )}
        </Paper>

        <Paper withBorder p="md" radius="lg">
          <Text fw={600} mb="xs">
            Aktive Auswahl
          </Text>
          <Text size="sm" c="dimmed" mb="sm">
            Berechnet werden nur ausgewählte Produkte.
          </Text>
          <Badge color="blue" variant="light" mb="sm">
            Kategorie-Filter: {selectedCategory === 'all' ? 'Alle' : selectedCategory}
          </Badge>
          <ScrollArea h={320} type="always">
            <Stack gap={6} pr={4}>
              {selectedProducts.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Keine Produkte ausgewählt.
                </Text>
              ) : (
                selectedProducts.map((item) => (
                  <Paper key={`selected-${item.id}`} withBorder p="xs" radius="md">
                    <Text size="sm" fw={600}>
                      {item.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {item.menge} {item.einheit} | {item.kategorie || 'Ohne Kategorie'}
                    </Text>
                  </Paper>
                ))
              )}
            </Stack>
          </ScrollArea>
        </Paper>
      </SimpleGrid>

      {!hasLoaded ? (
        <Paper withBorder p="md" radius="lg">
          <Text size="sm" c="dimmed">
            Wähle Produkte aus und starte dann die Nährwert-Schätzung.
          </Text>
        </Paper>
      ) : loading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : error ? (
        <Paper withBorder p="md" radius="lg">
          <Text fw={600} c="red">
            Fehler beim Laden des Nährwertblicks
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            {error}
          </Text>
        </Paper>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed">
                Energie gesamt
              </Text>
              <Title order={3}>{roundOne(data.totals.kcal)} kcal</Title>
            </Paper>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed">
                Protein
              </Text>
              <Title order={3}>{roundOne(data.totals.protein)} g</Title>
            </Paper>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed">
                Kohlenhydrate
              </Text>
              <Title order={3}>{roundOne(data.totals.carbs)} g</Title>
            </Paper>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed">
                Fett
              </Text>
              <Title order={3}>{roundOne(data.totals.fat)} g</Title>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <Paper withBorder p="md" radius="lg">
              <Text fw={600} mb="sm">
                Makro-Verteilung (g)
              </Text>
              <BarChart
                h={250}
                data={macroChartData}
                dataKey="macro"
                series={[{ name: 'gramm', color: 'blue.6' }]}
                tickLine="y"
                gridAxis="y"
              />
            </Paper>

            <Paper withBorder p="md" radius="lg">
              <Text fw={600} mb="sm">
                Abdeckung
              </Text>
              <DonutChart
                h={250}
                data={coverageChartData}
                withLabels
                labelsType="percent"
                chartLabel={data.items.length}
              />
              <Text size="xs" c="dimmed" mt="sm">
                Schätzwerte sind ungefähr und können je Marke/Zubereitung abweichen.
              </Text>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <Paper withBorder p="md" radius="lg">
              <Group justify="space-between" align="center" mb="sm">
                <Text fw={600}>Geschätzte Produkte</Text>
                <Badge color="gray" variant="light">
                  {estimatedItems.length}
                </Badge>
              </Group>
              <ScrollArea h={420} type="always">
                <Stack gap="xs" pr={4}>
                  {estimatedItems.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      Aktuell konnten keine Produkte sinnvoll geschätzt werden.
                    </Text>
                  ) : (
                    estimatedItems.map((item) => (
                      <Paper key={item.id} withBorder p="xs" radius="md">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={600} size="sm" style={{ wordBreak: 'break-word' }}>
                              {item.name}
                            </Text>
                            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>
                              {item.menge} {item.einheit}
                              {item.estimatedGrams != null ? ` (~${item.estimatedGrams} g)` : ''} |{' '}
                              {item.matchedFood || 'Generische Zuordnung'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              P {roundOne(item.macros.protein)} g | KH {roundOne(item.macros.carbs)} g | F{' '}
                              {roundOne(item.macros.fat)} g
                            </Text>
                          </Stack>
                          <Stack gap={4} align="flex-end">
                            <Badge color="blue" variant="light">
                              {roundOne(item.macros.kcal)} kcal
                            </Badge>
                            <Badge
                              color={
                                item.confidence >= 0.8 ? 'teal' : item.confidence >= 0.5 ? 'yellow' : 'gray'
                              }
                              variant="outline"
                            >
                              KI {confidenceLabel(item.confidence)}
                            </Badge>
                          </Stack>
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Paper>

            <Paper withBorder p="md" radius="lg">
              <Group justify="space-between" align="center" mb="sm">
                <Text fw={600}>Nicht schätzbar</Text>
                <Badge color="gray" variant="light">
                  {unmatchedItems.length}
                </Badge>
              </Group>
              {unmatchedItems.length === 0 ? (
                <Center h={120}>
                  <Text c="teal" size="sm">
                    Alle Produkte wurden geschätzt.
                  </Text>
                </Center>
              ) : (
                <ScrollArea h={420} type="always">
                  <Stack gap="xs" pr={4}>
                    {unmatchedItems.map((item) => (
                      <Paper key={`unmatched-${item.id}`} withBorder p="xs" radius="md">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                          <Box style={{ minWidth: 0 }}>
                            <Text fw={600} size="sm" style={{ wordBreak: 'break-word' }}>
                              {item.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {item.menge} {item.einheit} | {item.kategorie || 'Ohne Kategorie'}
                            </Text>
                            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>
                              {item.reason || 'KI konnte keine ausreichende Nährwertbasis bestimmen.'}
                            </Text>
                          </Box>
                          <Badge color="gray" variant="outline">
                            Keine Schätzung
                          </Badge>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>
              )}
            </Paper>
          </SimpleGrid>
        </>
      )}

      <Paper withBorder p="sm" radius="md">
        <Text size="xs" c="dimmed">
          Hinweis: Diese Werte sind KI-basierte Nährwertangaben und keine verbindlichen.
        </Text>
      </Paper>
    </Stack>
  );
}
