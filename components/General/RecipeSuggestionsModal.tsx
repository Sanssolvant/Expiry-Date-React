'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChefHat,
  IconExternalLink,
  IconRefresh,
  IconShoppingCartPlus,
  IconToolsKitchen2,
} from '@tabler/icons-react';

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

type Props = {
  opened: boolean;
  onClose: () => void;
  cards: InventoryCard[];
};

export function RecipeSuggestionsModal({ opened, onClose, cards }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SuggestResponse>({
    perfectRecipes: [],
    almostRecipes: [],
    webSearchUsed: false,
    webSourceCount: 0,
  });
  const [addingRecipeKey, setAddingRecipeKey] = useState<string | null>(null);

  const inventoryPayload = useMemo(() => {
    return cards.map((card) => ({
      name: card.name,
      menge: card.menge,
      einheit: card.einheit,
    }));
  }, [cards]);

  async function loadRecipes() {
    setLoading(true);
    setError('');

    try {
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

      setData({
        perfectRecipes: Array.isArray(payload?.perfectRecipes) ? payload.perfectRecipes : [],
        almostRecipes: Array.isArray(payload?.almostRecipes) ? payload.almostRecipes : [],
        webSearchUsed: Boolean(payload?.webSearchUsed),
        webSourceCount: Number.isFinite(Number(payload?.webSourceCount))
          ? Number(payload.webSourceCount)
          : 0,
      });
    } catch (e: any) {
      setError(e?.message || 'Unbekannter Fehler beim Laden der Rezepte.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!opened) {
      return;
    }
    if (inventoryPayload.length === 0) {
      setData({
        perfectRecipes: [],
        almostRecipes: [],
        webSearchUsed: false,
        webSourceCount: 0,
      });
      return;
    }
    loadRecipes();
  }, [opened, inventoryPayload]);

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
    } catch (e: any) {
      notifications.show({
        title: 'Fehler',
        message: e?.message || 'Fehlende Zutaten konnten nicht hinzugefügt werden.',
        color: 'red',
      });
    } finally {
      setAddingRecipeKey(null);
    }
  }

  function renderRecipeCard(recipe: SuggestedRecipe) {
    return (
      <Card key={recipe.title} withBorder radius="md" p="md">
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
            <Badge color={recipe.missingCount === 0 ? 'green' : 'orange'} variant="light">
              {recipe.missingCount === 0 ? 'Komplett passend' : `${recipe.missingCount} fehlen`}
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

  const totalRecipes = data.perfectRecipes.length + data.almostRecipes.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconChefHat size={18} />
          <Text fw={700}>Rezeptideen aus deinem Vorrat</Text>
        </Group>
      }
      centered
      size="80%"
      overlayProps={{ blur: 5 }}
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Basis: {cards.length} vorhandene Produkte. Es werden passende und fast passende Rezepte
            gezeigt. Es werden keine Grundzutaten automatisch als vorhanden angenommen.
          </Text>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={loadRecipes}
            loading={loading}
            disabled={cards.length === 0}
          >
            Neu suchen
          </Button>
        </Group>

        {cards.length === 0 ? (
          <Paper withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">
              Keine Produkte vorhanden. Füge zuerst Produkte im Dashboard hinzu.
            </Text>
          </Paper>
        ) : null}

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : null}

        {!loading && error ? (
          <Paper withBorder radius="md" p="md">
            <Text c="red" size="sm">
              {error}
            </Text>
          </Paper>
        ) : null}

        {!loading && !error && cards.length > 0 ? (
          <>
            <Group gap="xs">
              <Badge color="green" variant="light">
                Voll passend: {data.perfectRecipes.length}
              </Badge>
              <Badge color="orange" variant="light">
                Mit fehlenden Zutaten: {data.almostRecipes.length}
              </Badge>
              <Badge color="blue" variant="light">
                Gesamt: {totalRecipes}
              </Badge>
              {data.webSearchUsed ? (
                <Badge color="teal" variant="light">
                  Webquellen verifiziert: {data.webSourceCount}
                </Badge>
              ) : (
                <Badge color="yellow" variant="light">
                  Ohne Webquellen (Fallback)
                </Badge>
              )}
            </Group>

            <Divider />

            <Stack gap="sm">
              <Title order={4}>Passt komplett</Title>
              {data.perfectRecipes.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Aktuell kein Rezept ohne fehlende Zutaten gefunden.
                </Text>
              ) : (
                data.perfectRecipes.map((recipe) => renderRecipeCard(recipe))
              )}
            </Stack>

            <Divider />

            <Stack gap="sm">
              <Title order={4}>Fast passend (es fehlen wenige Zutaten)</Title>
              {data.almostRecipes.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Aktuell keine fast passenden Rezepte gefunden.
                </Text>
              ) : (
                data.almostRecipes.map((recipe) => renderRecipeCard(recipe))
              )}
            </Stack>
          </>
        ) : null}
      </Stack>
    </Modal>
  );
}
