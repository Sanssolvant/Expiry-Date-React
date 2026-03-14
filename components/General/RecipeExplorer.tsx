'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChefHat,
  IconExternalLink,
  IconRefresh,
  IconSearch,
  IconShoppingCartPlus,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import { loadProductsCached } from '@/app/lib/products-client-cache';

type InventoryCard = {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  kategorie: string;
};

type RecipeIngredient = {
  name: string;
  amount: string;
  optional?: boolean;
};

type RecipeStep = {
  title: string;
  detail: string;
  ingredientAmounts: string[];
};

type SuggestedRecipe = {
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  dishType: 'sweet' | 'savory';
  sourceTitle: string;
  sourceUrl: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  availableIngredients: RecipeIngredient[];
  missingIngredients: RecipeIngredient[];
  missingCount: number;
};

type SuggestResponse = {
  perfectRecipes: SuggestedRecipe[];
  almostRecipes: SuggestedRecipe[];
  webSearchUsed: boolean;
  webSourceCount: number;
};

type ResultLimit = '5' | '10' | 'all';

type DisplayRecipe = {
  recipe: SuggestedRecipe;
  quality: 'perfect' | 'almost';
};

function emptySuggestResponse(): SuggestResponse {
  return {
    perfectRecipes: [],
    almostRecipes: [],
    webSearchUsed: false,
    webSourceCount: 0,
  };
}

export function RecipeExplorer() {
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [products, setProducts] = useState<InventoryCard[]>([]);

  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipesError, setRecipesError] = useState('');
  const [recipesData, setRecipesData] = useState<SuggestResponse>(emptySuggestResponse);
  const [addingRecipeKey, setAddingRecipeKey] = useState<string | null>(null);
  const [resultLimit, setResultLimit] = useState<ResultLimit>('10');

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError('');

      try {
        const productsRaw = await loadProductsCached();

        const mapped: InventoryCard[] = productsRaw.map((prod: any) => ({
          id: String(prod.id),
          name: String(prod.name ?? '').trim(),
          menge: Number(prod.menge ?? 0),
          einheit: String(prod.einheit ?? 'Stk'),
          kategorie: String(prod.kategorie ?? '').trim(),
        }));

        setProducts(mapped);
        setSelectedIds(mapped.map((item) => item.id));
      } catch (error: any) {
        setProductsError(error?.message || 'Produkte konnten nicht geladen werden.');
      } finally {
        setProductsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const selectedProducts = useMemo(() => {
    const idSet = new Set(selectedIds);
    return products.filter((item) => idSet.has(item.id));
  }, [products, selectedIds]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return products;
    }

    return products.filter((item) => {
      const hay = `${item.name} ${item.kategorie} ${item.einheit}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [products, query]);

  const displayRecipes = useMemo(() => {
    const combined: DisplayRecipe[] = [
      ...recipesData.perfectRecipes.map((recipe) => ({ recipe, quality: 'perfect' as const })),
      ...recipesData.almostRecipes.map((recipe) => ({ recipe, quality: 'almost' as const })),
    ];

    if (resultLimit === 'all') {
      return combined;
    }

    return combined.slice(0, Number(resultLimit));
  }, [recipesData, resultLimit]);

  const totalRecipes = recipesData.perfectRecipes.length + recipesData.almostRecipes.length;

  async function loadRecipes() {
    if (selectedProducts.length === 0) {
      setRecipesData(emptySuggestResponse());
      setRecipesError('Wähle zuerst mindestens ein Produkt aus.');
      return;
    }

    setLoadingRecipes(true);
    setRecipesError('');

    try {
      const inventoryPayload = selectedProducts.map((card) => ({
        name: card.name,
        menge: card.menge,
        einheit: card.einheit,
      }));

      const res = await fetch('/api/recipes/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inventory: inventoryPayload }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Rezeptvorschläge konnten nicht geladen werden.');
      }

      setRecipesData({
        perfectRecipes: Array.isArray(payload?.perfectRecipes) ? payload.perfectRecipes : [],
        almostRecipes: Array.isArray(payload?.almostRecipes) ? payload.almostRecipes : [],
        webSearchUsed: Boolean(payload?.webSearchUsed),
        webSourceCount: Number.isFinite(Number(payload?.webSourceCount))
          ? Number(payload.webSourceCount)
          : 0,
      });
    } catch (error: any) {
      setRecipesError(error?.message || 'Unbekannter Fehler beim Laden der Rezepte.');
      setRecipesData(emptySuggestResponse());
    } finally {
      setLoadingRecipes(false);
    }
  }

  async function addMissingToShoppingList(recipe: SuggestedRecipe) {
    if (recipe.missingIngredients.length === 0) {
      return;
    }

    const key = recipe.title;
    setAddingRecipeKey(key);

    let createdCount = 0;
    let alreadyCount = 0;
    let failedCount = 0;

    try {
      for (const ingredient of recipe.missingIngredients) {
        const res = await fetch('/api/add-to-shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: ingredient.name,
            amount: ingredient.amount || '',
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          failedCount += 1;
          continue;
        }

        if (payload?.created) {
          createdCount += 1;
        } else {
          alreadyCount += 1;
        }
      }

      const msg =
        failedCount > 0
          ? `Hinzugefügt: ${createdCount}, bereits vorhanden: ${alreadyCount}, Fehler: ${failedCount}`
          : `Hinzugefügt: ${createdCount}, bereits vorhanden: ${alreadyCount}`;

      notifications.show({
        title: 'Einkaufszettel aktualisiert',
        message: msg,
        color: failedCount > 0 ? 'yellow' : 'teal',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Fehler',
        message: error?.message || 'Fehlende Zutaten konnten nicht hinzugefügt werden.',
        color: 'red',
      });
    } finally {
      setAddingRecipeKey(null);
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

  function renderRecipeCard(display: DisplayRecipe) {
    const recipe = display.recipe;
    const qualityBadge =
      display.quality === 'perfect'
        ? { color: 'green', text: 'Komplett passend' }
        : { color: 'orange', text: `${recipe.missingCount} fehlen` };

    return (
      <Card key={`${display.quality}-${recipe.title}`} withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Group gap="xs">
                <IconToolsKitchen2 size={16} />
                <Title order={4}>{recipe.title}</Title>
              </Group>
              <Text size="sm" c="dimmed">
                {recipe.description}
              </Text>
            </div>
            <Badge color={qualityBadge.color} variant="light">
              {qualityBadge.text}
            </Badge>
          </Group>

          <Group gap="xs">
            <Badge variant="outline">{recipe.dishType === 'sweet' ? 'Süss' : 'Herzhaft'}</Badge>
            <Badge variant="outline">Portionen: {recipe.servings}</Badge>
            <Badge variant="outline">Dauer: {recipe.prepMinutes} min</Badge>
            <Badge variant="outline">Zutaten: {recipe.ingredients.length}</Badge>
          </Group>

          <Group gap={6}>
            <Text size="xs" c="dimmed">
              Quelle:
            </Text>
            <Anchor href={recipe.sourceUrl} target="_blank" rel="noreferrer" size="sm">
              <Group gap={4}>
                <span>{recipe.sourceTitle}</span>
                <IconExternalLink size={14} />
              </Group>
            </Anchor>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Paper withBorder radius="md" p="xs">
              <Text size="sm" fw={600} mb={4}>
                Vorhanden
              </Text>
              <Group gap={6}>
                {recipe.availableIngredients.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    Keine
                  </Text>
                ) : (
                  recipe.availableIngredients.map((ing) => (
                    <Badge key={`ok-${recipe.title}-${ing.name}`} color="green" variant="light">
                      {ing.name}
                    </Badge>
                  ))
                )}
              </Group>
            </Paper>

            <Paper withBorder radius="md" p="xs">
              <Text size="sm" fw={600} mb={4}>
                Fehlt
              </Text>
              <Group gap={6}>
                {recipe.missingIngredients.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    Nichts
                  </Text>
                ) : (
                  recipe.missingIngredients.map((ing) => (
                    <Badge key={`miss-${recipe.title}-${ing.name}`} color="red" variant="light">
                      {ing.name}
                      {ing.amount ? ` (${ing.amount})` : ''}
                    </Badge>
                  ))
                )}
              </Group>
            </Paper>
          </SimpleGrid>

          <Accordion variant="separated" radius="md">
            <Accordion.Item value={`steps-${recipe.title}`}>
              <Accordion.Control>Zubereitung</Accordion.Control>
              <Accordion.Panel>
                <Stack gap={4}>
                  {recipe.steps.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      Keine Schritte verfügbar.
                    </Text>
                  ) : (
                    recipe.steps.map((step, idx) => (
                      <Paper key={`step-${recipe.title}-${idx}`} withBorder radius="md" p="xs">
                        <Text size="sm" fw={600}>
                          {idx + 1}. {step.title}
                        </Text>
                        <Text size="sm">{step.detail}</Text>
                        {step.ingredientAmounts.length > 0 ? (
                          <Text size="xs" c="dimmed" mt={4}>
                            Mengen in diesem Schritt: {step.ingredientAmounts.join(', ')}
                          </Text>
                        ) : null}
                      </Paper>
                    ))
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="teal"
              leftSection={<IconShoppingCartPlus size={16} />}
              disabled={recipe.missingIngredients.length === 0}
              loading={addingRecipeKey === recipe.title}
              onClick={() => addMissingToShoppingList(recipe)}
            >
              Fehlende Zutaten auf Einkaufszettel
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Paper withBorder radius="xl" p="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={2}>
            <Group gap="xs">
              <IconChefHat size={18} />
              <Title order={2}>Rezepte</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Wähle gezielt Produkte aus und suche Rezepte nur mit dieser Auswahl.
            </Text>
          </Stack>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={loadRecipes}
            loading={loadingRecipes}
            disabled={selectedProducts.length === 0 || productsLoading}
          >
            Rezepte mit Auswahl suchen
          </Button>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Paper withBorder p="md" radius="lg">
          <Group justify="space-between" align="center" mb="sm">
            <Title order={4}>Produkte auswählen</Title>
            <Badge color="gray" variant="light">
              Ausgewählt: {selectedProducts.length} / {products.length}
            </Badge>
          </Group>

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
          </Group>

          <TextInput
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
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
            <Box style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
              <Stack gap={6}>
                {filteredProducts.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Keine Produkte für diesen Suchbegriff.
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
            </Box>
          )}
        </Paper>

        <Paper withBorder p="md" radius="lg">
          <Title order={4} mb="sm">
            Ergebnissteuerung
          </Title>
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="xs">
              <Badge color="green" variant="light">
                Voll passend: {recipesData.perfectRecipes.length}
              </Badge>
              <Badge color="orange" variant="light">
                Mit fehlenden Zutaten: {recipesData.almostRecipes.length}
              </Badge>
              <Badge color="blue" variant="light">
                Gesamt: {totalRecipes}
              </Badge>
            </Group>
            <SegmentedControl
              size="xs"
              value={resultLimit}
              onChange={(value) => setResultLimit(value as ResultLimit)}
              data={[
                { label: '5', value: '5' },
                { label: '10', value: '10' },
                { label: 'Alle', value: 'all' },
              ]}
            />
          </Group>

          <Text size="sm" c="dimmed" mt="sm">
            Angezeigt: {displayRecipes.length} / {totalRecipes}
          </Text>

          {recipesData.webSearchUsed ? (
            <Badge color="teal" variant="light" mt="sm">
              Webquellen verifiziert: {recipesData.webSourceCount}
            </Badge>
          ) : (
            <Badge color="yellow" variant="light" mt="sm">
              Ohne Webquellen (Fallback)
            </Badge>
          )}

          <Divider my="sm" />

          <Text size="sm" c="dimmed">
            Ergebnisliste ist begrenzt und scrollbar, damit sie nicht zu lang wird.
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="lg">
        {loadingRecipes ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : recipesError ? (
          <Text c="red" size="sm">
            {recipesError}
          </Text>
        ) : totalRecipes === 0 ? (
          <Text size="sm" c="dimmed">
            Noch keine Rezepte geladen. Wähle Produkte aus und starte die Suche.
          </Text>
        ) : (
          <ScrollArea h={760} type="always">
            <Stack gap="sm" pr={4}>
              {displayRecipes.map((item) => renderRecipeCard(item))}
            </Stack>
          </ScrollArea>
        )}
      </Paper>
    </Stack>
  );
}
