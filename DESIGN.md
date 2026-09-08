---
name: Barca Family
description: Original BF4 identity on a navy supporter ratings workspace.
colors:
  navy: "#101625"
  identity: "#111b2c"
  panel: "#182237"
  white: "#f4f6fb"
  muted: "#afbdd4"
  line: "#334059"
  blue: "#0068FF"
  red: "#F21A41"
  blue-hover: "#075ce0"
  segment-selected: "#344766"
  danger: "#ffabb8"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(32px, 3.3vw, 52px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "32px"
    lineHeight: 1.16
    letterSpacing: "-0.035em"
  player:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  control: "8px"
  action: "10px"
  panel: "12px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "#ffffff"
    rounded: "{rounded.action}"
    padding: "15px 20px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-secondary:
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  rating-selected:
    backgroundColor: "{colors.blue}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: Barca Family

## Overview

The established world is the navy and white Barca Family channel identity, with the original transparent BF4 logo and its exact blue and red accents. Dense, readable Russian interfaces put voting, player ratings and personal match history within direct reach. This refresh records the implemented cascade: `public/community.css` follows `public/style.css`.

**Key Characteristics:**
- Original logo artwork, navy surfaces and blue primary actions.
- Real club portraits and clear player names.
- Flat, divided lists with visible numeric choices and explicit saving feedback.

## Colors

### Primary
BF4 blue carries primary actions, selected rating controls and text selection. Keep navy and white dominant across the screen.

### Secondary
BF4 red underlines the active main section and accompanies blue in the diagonal identity bars and cover rails.

### Neutral
Navy is the page background; identity is the desktop brand panel. Panel is the tonal surface for fields and results. White carries primary text, progress and keyboard focus; muted supports metadata, and line separates rows. Danger accompanies written errors. Segmented controls use the selected segment surface rather than the primary action fill.

**The Original Brand Rule.** Preserve the exact BF4 blue and red and the original transparent artwork. The inherited CSS variable named `--yellow` now resolves to white; its name is not permission to reintroduce yellow actions.

## Typography

Locally hosted variable Manrope supports Latin and Cyrillic. The display token describes the identity headline, not the logo, which is an image. Main community headings are 32px, reducing to 29px on mobile; voting headings are 26px and 25px respectively. Match titles are 18px on desktop and 17px on mobile. Voting player names use the player token and become 16px on mobile. Standings names are 15px, reducing to 14px on mobile. Bold tabular numerals keep scores aligned. Supporting role labels are 10–12px. Native Telegram surfaces retain Telegram typography.

## Layout

At 1100px and wider, the shell is capped at 1500px with a 32% identity column (minimum 280px) and a flexible workspace. The sticky full-height identity panel has 48px by 36px padding; the workspace has 48px side padding. Voting rows align a 64px portrait, identity and rating controls horizontally.

From 701px through 1099px, the identity panel disappears and the shell becomes a single column capped at 850px with 40px workspace side padding. The compact original logo appears in the header. Voting rows keep portrait, name and five 44px-wide controls on one row, with 5px gaps.

At 700px and below, the shell is capped at 600px with 20px side padding. The general header is 82px tall. Voting portraits remain 64px; the five rating controls move below the identity and fill the row, with 8px gaps and 48px height. Filters wrap into two columns; summaries stack, and history actions move below the match. Standings and roster portraits reduce to 44px. Roster edit actions sit below the player identity.

The mobile voting view has a deliberately smaller 66px header, 44px navigation targets, 12px spacing after navigation, compact match/deadline blocks and 14px vertical player-row padding. Its sticky submit dock has 10px top padding and 10px plus safe-area bottom padding, a 48px minimum primary button, and hides the secondary dock note. Other views retain the general spacing. The navigation sticks at the top and can scroll horizontally; the submit dock sticks at the bottom without obscuring safe-area controls.

## Elevation & Depth

Tonal panels and thin dividers establish depth. The toast alone uses an explicit shadow (0 8px 24px #0005). Actions and rating buttons are flat. State updates have no decorative transitions; reduced-motion rules disable transitions and smooth scrolling. Telegram haptic feedback, when available, accompanies selection.

## Shapes

Fields, rating buttons and voting portraits use the control radius. Primary actions, segments, the personal ranking summary and toasts use the action radius; results and confirmation panels use the panel radius. Segmented buttons and small standings portraits use 7px corners. Profile and success marks are circular. Ordinary actions have at least 44px targets; inline back/reset controls are smaller.

## Components

**Main navigation.** Three public sections: “Голосовать”, “Рейтинги”, “Мои матчи”. The active section has a red underline and white label. “Управление” appears for administrators. Subsections and metrics use tonal segmented controls with explicit pressed states.

**Voting controls and saving.** Five labelled choices from 1 to 5 use blue with white text when selected. Hover adds a blue-grey surface and a light blue border. Keyboard focus is a 3px white outline with 4px offset. A numeric count accompanies the thin white progress line. Users can remove or skip scores. Saving feedback distinguishes pending, saved and failed changes; recovery controls must not imply a failed save succeeded.

**Player ratings.** “Игроки” and “Зрители” switch rating audiences. Player filters expose season, tournament, whole season, last 30/90 days or explicit dates. A divided team summary displays average and total; “Средняя” and “Сумма” change player ranking order. Rows pair rank, portrait, name, match/vote counts and the chosen metric. Include update text, manual refresh and provisional/finished status. Missing data displays a dash or an explained empty state.

**Viewer ranking and history.** Viewer rows show participation totals, with the current user identified in text and by a tonal row; a personal-position panel sits above. “Мои матчи” provides all/current/finished segments, dates, tournament, voting progress and context-specific actions. The displayed participation explanation counts one submitted ballot per match and excludes test matches; production enforcement belongs to the backend.

**Forms and roster editor.** Labelled fields use panel backgrounds and thin borders. Primary actions are blue; secondary actions are outlined. Disabled actions reduce opacity. The roster search matches name or number, and editing exposes name, number, position and active membership. Archiving is explained as preserving history. Failed or unavailable saves receive explicit feedback rather than a success state.

**Logo and covers.** Use `public/brand-original.png` transparently over navy, without redrawing or recoloring. The desktop logo viewport is 260 × 76px and the compact viewport 174 × 48px, cropping the original square asset. The seven 1200 × 600 covers in `public/covers/index.html` share this logo, navy, blue/red bottom rails, large white Manrope headings and restrained line symbols. `public/covers/manifest.json` names the home, personal scores, match result, player ranking, viewer ranking, history and management assets and their exact copy. Preserve that copy rather than adding slogans. Individual player steps use the player's portrait, not a repeated generic cover.

**Preview and integration states.** Local `?preview=1` fixtures are illustrative and visibly marked. The new frontend has loading, empty, retry and unavailable states; it is not evidence of completed production statistics, history or roster APIs. Those Go endpoints belong to the backend developer. Native Telegram rich-text/custom-emoji behavior remains a separate validation concern.

## Do's and Don'ts

- Do preserve the navy channel world, exact BF4 accents and original transparent logo.
- Do use real club portraits, readable names and explicit numeric labels.
- Do retain clear selection, loading, empty, unavailable and saving states.
- Do preserve compact mobile voting headers and safe-area submit spacing.
- Don't restore yellow primary actions or replace the logo with typeset text.
- Don't repeat a generic banner for every player or add cover slogans.
- Don't present preview fixtures or unverified backend/Telegram behavior as production guarantees.
- Don't add decorative motion.
