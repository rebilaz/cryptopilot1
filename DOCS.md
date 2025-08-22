# CryptoPilot – Documentation Projet

Dernière mise à jour: 2025-08-22

---
## 1. Vision Produit
**CryptoPilot** = coach crypto gamifié premium (esthétique Apple Watch) qui rend l’apprentissage et la maîtrise du portefeuille **addictifs** par la progression continue, des feedbacks clairs et des chiffres qui montent.

Principes centraux:
- Compréhension > spéculation (aucun signal buy/sell).
- Progression visible (XP, niveaux, badges, streaks, risk feedback) → boucle de motivation.
- Pédagogie contextuelle: le portefeuille est le support d’apprentissage.
- Transparence: algos simples, pondérations explicables, pas de boîte noire opaque.
- Accessibilité & confort sensoriel (reduced-motion géré, contrastes, lisibilité).

Promesse courte: « Ton copilote pour comprendre, maîtriser et faire progresser ton portefeuille – chaque jour. »

Personas:
- Débutant curieux → besoin de décoder son portefeuille & recevoir des mini-missions.
- Intermédiaire engagé → besoin de suivi de cohérence, risque, discipline & progression longue.

Fréquence cible:
- Quotidien (1–3 min): mission rapide + check risque synthétique + XP idle.
- Hebdomadaire (10–15 min): revue approfondie (analyse allocation, cohérence, risques détaillés).

Valeur soutenue par: feedback immédiat + objectifs prochains + surprises occasionnelles.

---
## 2. Stack Technique
| Domaine | Choix | Notes |
|--------|-------|-------|
| Framework | **Next.js App Router** | Pages server/client segmentées, transitions via `app/template.tsx` |
| Langage | **TypeScript** | Typage strict sur nouveaux modules, interfaces dans `mocks.ts`, helpers dédiés |
| Styling | **Tailwind CSS** | Design tokens via CSS variables; utilitaires custom (`.watch-glow`, `bg-gradient-deep`) |
| UI Pattern | **WatchCard** | Composant unique pour widgets (style Apple Watch) |
| Animations | **Framer Motion** | Variants + helpers (`lib/motion.ts`), page transitions, reduced-motion géré |
| Thème | **next-themes** (déjà branché via layout) | Mode light/dark cohérent tokens HSL |
| Mock Data | **Centralisé** dans `lib/mocks.ts` | Single source of truth (signals, missions, progression, portfolio) |
| Accessibilité | ARIA, roles, aria-live | Widgets, régions, reduced motion, semantics |
| Persistance légère | `localStorage` | Delta score risque synthétique + futur cache mission | 

Sources données (roadmap): Coingecko (prix temps réel), balances wallet (ETH, BTC), benchmarks BTC/ETH; plus tard DeFi/NFT.
Exigence fraîcheur: pas de décalage J-1 (cache très court acceptable ≤60s).

---
## 3. Structure Actuelle (Synthèse)

### Pages principales (`app/`)
- `/` Dashboard: Hero + widgets (Risque Synthétique, MarketStatus, Opportunités, Risques, ScoreCard, NAV, Allocation, Détails).
- `/progression`: Timeline niveaux (placeholder) – future page XP, streaks, badges.
- `/analysis`: Vue portefeuille (NAV, Allocation, Table + placeholders Risque & Suggestions IA).

### Layout & Shell
- `app/layout.tsx` : Shell global (Header, Sidebar, Footer, Providers, theme).
- `app/template.tsx` : Transitions de page (Framer Motion + respect reduced-motion).
- `app/globals.css` : Tokens, composants utilitaires, gestion global reduced-motion.

### Widgets / Composants clés
| Fichier | Rôle | Notes |
|--------|------|-------|
| `components/widgets/RiskSynthetic.tsx` | Agrégation pondérée des signaux (score 0–100 + anneau SVG + delta persistant) | Pas de dépendance API |
| `components/widgets/ProgressionHUD.tsx` | Vue synthèse XP + niveau + streak | Boucle d'engagement quotidienne |
| `components/widgets/MissionsDaily.tsx` | Missions quotidiennes (3 rotatives) | Gain XP immédiat à la complétion |
| `lib/hooks/useProgression.ts` | Hook central état progression | Regroupe XP, streak, idle |
| `lib/risk.ts` | Helpers agrégation risque | Facteur commun futurs sous-scores |
| `components/MarketStatus.tsx` | Sentiment global (bullish / neutre / bearish) | Basé sur heuristique horaire placeholder |
| `components/ListSignals.tsx` | Liste opportunités / risques (Top 5) | Fallback aux mocks, réutilisable |
| `components/ui/WatchCard.tsx` | Pattern visuel unifié widget | Accessibilité (role=region, aria-description) |
| `components/PortfolioBubble.tsx` | Coach flottant (placeholder) | Interactions futures |
| `components/ScoreCard.tsx` | Score synthétique (ancien placeholder) | Peut être fusionné ou enrichi |
| `components/NAVChart.tsx` | Placeholder graphique NAV | À connecter plus tard |
| `components/PortfolioPie.tsx` | Placeholder allocation | Future data réelle |
| `components/PortfolioTable.tsx` | Placeholder lignes du portefeuille | Migration vers vrai dataset prévue |
| `components/Header.tsx` | Navigation principale (Dashboard / Analyse / Progression / Challenges) | Motion + thema |
| `components/Sidebar.tsx` | Sections progression / missions | Actuellement statique |

### Données / Logique
- `lib/mocks.ts`: signals, missions, progression, allocation (types + helper `getTopSignals`).
- `lib/motion.ts`: helpers animations adaptatives (`motionConfig`, `fadeLift`).
- `lib/progression.ts`: moteur XP / niveaux / streak (localStorage).
- `lib/missions.ts`: génération déterministe missions quotidiennes + persistance.
 - `lib/risk.ts`: extraction logique agrégation risque.
 - `lib/hooks/useProgression.ts`: hook centralisation progression + idle bonus.
- `lib/utils.ts`: `cn` utilitaire classes.

### 3.1 Risque Synthétique – Vision
Décomposition future (sous-scores pédagogiques): Allocation, Volatilité, Corrélation, Drawdown. Objectif: expliquer le « pourquoi » derrière un score.

| Variables env | `.env.example` / `.env.local` | Voir section 13 Configuration |
---
## 4. Guidelines (Règles de Contribution)
### Données & Logique
- ❌ Pas de hardcode dispersé → ✅ toujours via `lib/mocks.ts` (étendre proprement).
- Isoler transformations dans helpers (ex: futur `aggregateSignals`).

### UI / Design

### Animations
- Subtiles (≤550ms), non intrusives.
- Réduction automatique: `prefers-reduced-motion` → fade simple (pas de y/scale).
- Utiliser `motionConfig` / `fadeLift`.
- Pas d’animations distractives en boucle.

### Accessibilité
- `role="region"`, `aria-label` / `aria-describedby`.
- `aria-live` pour données évolutives.
- Contrastes testés light/dark.
- Informations redondantes (couleur + texte).
- Reduced-motion complet déjà assuré.

### Code & Qualité
- Types explicites et interfaces exportées.
- Commentaires heuristiques (ex: pondération risque).
- Nettoyage logs avant commit.
- Séparer calcul / rendu si >80 lignes.
### Structure & Maintenance
- Widget = bloc isolé + calcul minimal interne.
- Utilitaires CSS ajoutés dans `@layer utilities`.
- Pas de duplication de composants (props d’abord).

---
## 5. Gamification 🔥 (Cadre & Vision)
Objectif: rendre l’apprentissage durablement engageant via boucles de progression multiples.

### 5.1 Ressources & Compteurs
- XP (progression principale)
- Niveaux (courbe infinie, coût croissant façon idle game)
- Streak quotidien (rétention / discipline)
- Badges (publics + secrets)
- Score de risque (et futurs sous-scores)
- Missions (journalières / contextuelles / challenges long terme)
- Idle bonus (XP passif en revenant)

### 5.2 Ladder Niveaux (proposition initiale)
Explorer → Stratège → Analyste → Trader → Sage (paliers symboliques tous X niveaux).

### 5.3 Missions
| Type | Description | Feedback |
|------|-------------|----------|
| Journalières | Micro-actions (vérifier risque, lire explication) | +XP immédiat, streak |
| Contextuelles | Déclenchées par état portefeuille (ex: concentration excessive) | XP + badge potentiel |
| Challenges | Objectifs plus longs (diversification, régularité) | Badge rare + XP bonus |

### 5.4 Micro-récompenses & Surprises
- Badges secrets (débloqués par comportements inattendus)
- Bulles coach contextuelles (insights, pédagogie)
- Effet “return boost” (idle XP calculé sur temps écoulé plafonné)

### 5.5 Boucles Addictives
Action → Feedback instantané (chiffre monte) → Nouvel objectif proposé → Occasion de surprise.

### 5.6 Extensions Futures
- Décomposition risque visuelle (radar / barres)
- Timeline progression multi-métriques (XP, missions complétées, stabilité portefeuille)
- Système de quête multi-étapes (“Semaine de diversification”)

---
## 6. Fonctionnalités Réalisées
- Centralisation mocks (`lib/mocks.ts` + typage + helper)
- Refactor MarketStatus & ListSignals → WatchCard
- Widget RiskSynthetic (score 0–100 + delta persistant)
- Uniformisation visuelle (WatchCard, halo, arrondis)
- Gestion complète reduced-motion (CSS + Framer + SVG statique fallback)
- Navigation cohérente Dashboard → Progression → Analyse
- Page transitions animées contrôlées
- Accessibilité initiale (ARIA regions, aria-live)
- ProgressionHUD (niveau, XP, streak)
- MissionsDaily (3 missions / jour + récompenses XP)
 - Idle bonus (règle blocs 6h → jusqu'à 240 XP, bouton comeback)

---
## 7. Monétisation
Modèle **Freemium → Premium**.

Gratuit:
- XP & niveaux initiaux (jusqu’à ~Niveau 10)
- Missions journalières basiques
- Risque synthétique global (sans décomposition)
- Badges communs

Premium:
- Niveaux infinis & économie XP avancée
- Décomposition risque (allocation / volatilité / corrélation / drawdown)
- Missions contextuelles & challenges avancés
- Badges rares / secrets / historiques
- Historique & timeline des scores
- Analyses approfondies (corrélations, drawdown, concentration multi-couches)

Tarification: abonnement mensuel + option annuelle (remise). Modèle “crédits par analyse” possible ultérieurement.

Principes éthiques: pas de paywall sur la sécurité de base / compréhension fondamentale.

---
## 8. Roadmap / Next Steps
Priorité immédiate: connexion portefeuille read-only (ETH/BTC) → missions persistantes → personnalisation coach IA.

Backlog structuré:
1. CoachNudge (mini-bulle interactive contextualisée)
2. Page Progression enrichie (XP curve, badges, ladder, streak)
3. Return boost avancé (événements aléatoires additionnels sur long idle)
4. Débloquages premium progressifs (gating composantes risque)
5. Décomposition risque (sous-scores + radar placeholder)
6. Historisation locale risk score (préparation charts)
7. Missions contextuelles (moteur règles portefeuille)
8. Badges secrets + événement rare (1% chance sur action clé)
9. Intégration Coingecko temps réel + fallback
10. Optimisation idle bonus (feedback + tooltip explicatif)

---
## 9. (Ancien) Tâches Récentes / Maintenance
Se référer à section “Fonctionnalités Réalisées” pour l’état courant. Historiser ici quand la liste grossit.

---
## 10. Guidelines Techniques (Rappel condensé)
Voir sections 2 & 4 pour détails; principe: *composants sobres, données centralisées, animations accessibles.*

---
## 11. Glossaire
| Terme | Définition |
|-------|------------|
| Signal | Indicateur pédagogique (score 0–100) |
| WatchCard | Cartouche visuelle unifiée style Apple Watch |
| Risque Synthétique | Score agrégé (pondération simple) des signaux |
| Mission journalière | Action rapide quotidienne donnant XP |
| Mission contextuelle | Mission générée selon état portefeuille |
| Idle gain | Bonus XP passif à la reconnexion |
| Streak | Nombre de jours consécutifs actifs |
| XP | Ressource de progression de niveau |
| Reduced Motion | Mode d’accessibilité sans animations superflues |

---
## 12. Contact / Mainteneur
Auteur initial: (renseigner)
Responsable produit / technique: (à définir)

---
_Fin du document – tenir à jour, concis, orienté action._

---
## 5. Tâches Récentes Réalisées
Checklist (faites):
- [x] Page `analysis` (vue portefeuille détaillée initiale)
- [x] Centralisation des mocks (`lib/mocks.ts` + typage + helper)
- [x] Refactor `ListSignals` vers mocks centralisés
- [x] Création pattern `WatchCard`
- [x] Unification MarketStatus & ListSignals → WatchCard
- [x] Ajout widget `RiskSynthetic` (score agrégé + delta localStorage)
- [x] Réorganisation Dashboard (ligne 1 risk / market / opportunités)
- [x] Gestion complète `prefers-reduced-motion` (CSS global + Framer + anneau statique)
- [x] Page transitions via `app/template.tsx`
- [x] Accessibilité de base (aria-label, aria-live, sr-only descriptions)
- [x] ProgressionHUD (XP / niveau / streak) + persistance local
- [x] MissionsDaily (3 missions quotidiennes déterministes, XP récompense)
 - [x] Idle bonus (blocs 6h jusqu'à 240 XP, claim retour)

### 5.1 Synthèse Récente
Focus dernier incrément: unification visuelle (WatchCard), centralisation data, accessibilité motion, agrégat risque, introduction boucle gamification (XP + missions quotidiennes).

---
## 6. Prochaines Pistes (TODO Ouvert)
Prioriser selon impact utilisateur + complexité.

### A. Données & Calcul
- [ ] Extraire `aggregateSignals()` (déjà implicitement dans `RiskSynthetic`) vers `lib/mocks-logic.ts` ou similaire.
- [ ] Introduire normalisation configurable (ex: pondération dynamique par catégorie).
- [ ] Ajouter historique local (série temporelle risk score) → préparer graphique.
- [ ] Implémenter pipeline real-time prix (Coingecko) + fallback graceful.
- [ ] Intégrer balances wallet read-only (ETH, BTC) (adapter existant dans `portfolio/adapters`).

### B. Gamification
- [x] Modèle XP + formules progression (courbe exponentielle douce)
- [x] Générateur missions journalières déterministe (3 / jour)
- [x] Idle bonus (implémenté – blocs 6h → 40 XP, cap 240)
- [ ] Missions contextuelles basées sur état du portefeuille (ex: "Réduire exposition > X% sur un secteur").
- [ ] System badges (ex: Diversification atteinte, Gestion du risque cohérente).
- [ ] Return boost amélioré (événements surprises) / extension idle.
- [ ] Stratégie missions contextuelles (sélection règles basées sur signaux agrégés).

### C. UX / UI
- [ ] Skeleton loaders uniformisés via WatchCard
- [ ] Mode impression / export PDF synthèse portefeuille
- [ ] Ajout icônes cohérentes (pack Lucide) dans headers widgets
- [ ] Vue décomposition risque (sous-scores + radar/radial bars placeholder).
- [ ] Bandeau disclaimers (premier lancement) + lien modal explication méthodologie risque.

### D. Accessibilité & Internationalisation
- [ ] Préparer i18n (clé/valeur FR → EN) structure `locales/`.
- [ ] Vérifier contrastes tokens light mode (outil Lighthouse / axe). 
- [ ] Focus visibles sur éléments interactifs (audit complet Sidebar / Bubble).
- [ ] Vérifier lisibilité anneau risque en mode reduced-motion (contraste / alternative texte). 

### E. Performance
- [ ] Lazy-loading conditionnel de graphiques lourds.
- [ ] Mesurer bundle (analyse `next build`) & repérer composants clients inutilement.
- [ ] Introduire suspense + streaming côté serveur pour sections futures.
- [ ] Mesurer first meaningful paint après intégration données temps réel.

### F. Sécurité & Données Réelles (Plus tard)
- [ ] Intégration lecture on-chain (ex: Etherscan-like adapter déjà amorcé).
- [ ] Stockage utilisateur (Prisma + auth) des portefeuilles importés.
- [ ] Audit privacy (aucune donnée sensible persistée côté client).
- [ ] Modal avertissement initial (no financial advice) + consent tracking local.

### G. Qualité / Ingénierie
- [ ] Introduire tests unitaires simples (ex: calcul risk score).
- [ ] Lint règles accessibilité (eslint-plugin-jsx-a11y) si pas déjà.
- [ ] Script d’export snapshot mocks (seed future DB).
- [ ] Tests unitaires: pondération risque (cas seuils <40 / <70 / ≥70).
- [ ] ESLint a11y si absent (configuration). 

### H. Monétisation (Préparation)
- [ ] Segmenter limites Freemium: (max widgets avancés, pas d’historique, pas missions contextuelles).
- [ ] Activer feature flags Premium (simple toggle local d’abord).
- [ ] Préparer structure pricing (mensuel / annuel) composant statique.

### I. KPI & Instrumentation
- [ ] Collecter (anonyme) événements clés (mission_completion, dashboard_visit).
- [ ] Stocker métriques local d’abord puis backend (plus tard).
- [ ] Définir seuils succès Retention J7 & conversion baseline.

---
## 7. Process de Mise à Jour de ce Document
1. À chaque nouvelle fonctionnalité significative, ajouter:
   - Section ou ligne dans "Tâches Récentes" (cochée en bas de liste) + déplacer anciennes vers changelog séparé si trop long.
2. Si ajout de nouveaux widgets → mettre à jour tableau composants.
3. Si refactor structural (ex: éclatement mocks) → ajuster Stack + Guidelines.
4. Garder la date en tête de document.
5. Supprimer les TODO obsolètes dès implémentation.

Template d’entrée rapide pour une nouvelle tâche réalisée:
```
- [x] <Titre court> — <résumé 1 ligne impact>
```

---
## 8. Notes d’Architecture Future (Draft)
- Calculs analytiques lourds migreront côté serveur (RSC) + cache revalidation.
- Introduction d’un service de scoring modulable: pipeline (collect → dériver métriques → agréger → étiqueter).
- Risque synthétique pourra être décomposé (ex: Volatilité / Levier / Concentration / Macro-corrélation) → future visualisation radar.
- Architecture missions: moteur règles (entrée = état portefeuille + signaux) -> générateur tâches -> persistance -> scheduler.
- Strate premium: wrappers server components conditionnant profondeur d’analyse.

---
## 9. Glossaire (Rapide)
| Terme | Définition |
|-------|------------|
| Signal | Indicateur pédagogique (pas une recommandation) avec score 0–100 |
| WatchCard | Composant visuel unifié pour widgets (style premium) |
| Risque Synthétique | Agrégat pondéré des signaux opportunités+risques |
| Reduced Motion | Mode accessibilité supprimant animations non essentielles |
| Mission contextuelle | Mission générée à partir de l’état réel du portefeuille |
| XP | Points de progression cumulés sur courbe non linéaire |

---
## 10. Contact / Mainteneur
Auteur initial: (renseigner)  
Responsable produit / technique: (à définir)  

---
_Fin du document – maintenir concis, à jour et actionnable._
