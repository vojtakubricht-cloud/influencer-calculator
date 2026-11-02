# Influencer Business Model Calculator

Interaktivní webová kalkulačka ekonomiky spolupráce mezi firmou a influencery.
Všechny výpočty běží lokálně v prohlížeči (bez backendu), bez zaokrouhlování mezivýsledků.

## Funkce

- **Přehled** – KPI karty (cena, marže k rozdělení, odměna influencera, podíl a příspěvek firmy, příspěvková marže), rozpad jednoho kusu, výsledky podle objemu
- **Modely** – porovnání 20/80 … 60/40 (odměna influencera, příspěvek firmy na kus i celkem)
- **Ceny** – 499 Kč vs. 599 Kč vedle sebe + libovolné další ceny
- **Scénáře prodejů** – 100 až 25 000 ks + vlastní objem
- **Progresivní odměňování** – editovatelná pásma, vyšší sazba platí jen pro kusy v daném pásmu
- **Grafy** – rozdělení marže, příspěvek firmy podle objemu, 30/70 vs. 40/60 vs. 50/50, vliv ceny
- **Ukládání scénářů** (localStorage), **sdílení přes URL** (všechny vstupy v odkazu), **export CSV**, **export PDF** (tiskový dialog), **reset**

## Výpočet

```
Tržba bez DPH        = Prodejní cena / (1 + DPH)
Marže k rozdělení    = Tržba bez DPH − Výrobní náklad
Odměna influencera   = Marže k rozdělení × podíl influencera
Podíl firmy          = Marže k rozdělení × (1 − podíl influencera)
Příspěvek firmy      = Podíl firmy − logistika − handling − skladování − platby − ostatní − marketing
```

Příspěvek firmy je **před fixními náklady, vývojem a daní z příjmů** – nejde o čistý zisk.
Při záporné marži k rozdělení je odměna influencera 0 Kč a ztrátu nese firma (aplikace zobrazí upozornění).

Výpočetní jádro je v `src/lib/calc.ts` a je pokryté testy (`src/lib/calc.test.ts`).

## Technologie

React 18, TypeScript (strict), Vite, Tailwind CSS, shadcn/ui (Radix), Recharts, Vitest.

## Lokální spuštění

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # jednotkové testy výpočtů a sdílení
npm run build      # produkční build do dist/
npm run preview    # náhled produkčního buildu
```

## Nasazení

### GitHub Pages (automaticky)

Každý push do větve `main` spustí workflow `.github/workflows/deploy-pages.yml`, které spustí testy,
sestaví aplikaci a nasadí ji na GitHub Pages. Výsledná URL je `https://<uživatel>.github.io/influencer-calculator/`.

### Vercel

1. Přihlaste se na [vercel.com](https://vercel.com) a zvolte **Add New → Project**.
2. Importujte tento GitHub repozitář. Framework Vite se detekuje automaticky (viz `vercel.json`).
3. Klikněte na **Deploy**. Žádné proměnné prostředí nejsou potřeba.

## Struktura

```
src/
  lib/calc.ts         výpočetní jádro (čisté funkce, typy, validace)
  lib/share.ts        serializace stavu do URL
  lib/storage.ts      ukládání scénářů do localStorage
  lib/export.ts       CSV export
  lib/format.ts       formátování Kč / % (cs-CZ)
  hooks/useCalculator.ts
  components/calculator/   Dashboard, ModelComparison, PriceComparison,
                           VolumeScenarios, TieredModel, Charts, ScenariosDialog, InputsPanel
  components/ui/      shadcn/ui komponenty
```

Model je navržen pro rozšíření o více produktů a influencerů: vstupy jsou jeden
serializovatelný objekt `CalculatorInputs`, výpočty přijímají `overrides` (cena, podíl)
a URL formát je verzovaný.

## Samostatný HTML soubor (bez serveru)

```bash
npm run build:standalone
```

Vytvoří `standalone/influencer-calculator.html` – jeden soubor s vloženým CSS i JS,
který lze otevřít dvojklikem v prohlížeči, poslat e-mailem nebo nahrát kamkoliv.
Vyžaduje jen internet pro načtení písma Inter (bez něj se použije systémové písmo).
