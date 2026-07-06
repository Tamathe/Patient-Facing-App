"use client";

import React from "react";
import { t, type Language } from "@/i18n/strings";
import type { PantryRecipe } from "@/domain/types";

function shoppingList(recipes: PantryRecipe[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const recipe of recipes) {
    for (const item of recipe.buyItems) {
      const key = item.trim().toLowerCase();
      if (key.length > 0 && !seen.has(key)) {
        seen.add(key);
        items.push(item.trim());
      }
    }
  }
  return items;
}

export function PantryRecipes({
  detectedItems,
  recipes,
  language
}: {
  detectedItems: string[];
  recipes: PantryRecipe[];
  language: Language;
}) {
  if (recipes.length === 0) {
    return null;
  }

  const toBuy = shoppingList(recipes);

  return (
    <section className="grid gap-3">
      {detectedItems.length > 0 ? (
        <div className="rounded-control border border-ink/10 bg-white p-3">
          <h2 className="text-sm font-semibold text-ink/70">{t(language, "pantryDetectedTitle")}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {detectedItems.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-control bg-calm px-2 py-1 text-xs font-medium text-care">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h2 className="text-base font-semibold">{t(language, "pantryRecipesTitle")}</h2>

      {recipes.map((recipe, index) => (
        <article key={`${recipe.title}-${index}`} className="rounded-control border border-ink/10 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">{recipe.title}</h3>
          <p className="mt-1 text-sm leading-6 text-ink/80">{recipe.whyItFits}</p>

          {recipe.haveItems.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {recipe.haveItems.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="rounded-control bg-calm px-2 py-1 text-xs text-ink/70">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {recipe.buyItems.length > 0 ? (
            <p className="mt-3 text-sm">
              <span className="font-semibold text-ink/70">{t(language, "pantryToBuyLabel")}: </span>
              {recipe.buyItems.join(", ")}
            </p>
          ) : null}

          {recipe.watchOut ? (
            <p className="mt-3 rounded-control bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
              {t(language, "pantryWatchLabel")}: {recipe.watchOut}
            </p>
          ) : null}
        </article>
      ))}

      {toBuy.length > 0 ? (
        <div className="rounded-control border border-ink/10 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink/70">{t(language, "pantryShoppingTitle")}</h3>
          <ul className="mt-2 grid gap-1">
            {toBuy.map((item, index) => (
              <li key={`${item}-${index}`} className="text-sm text-ink/80">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
