---
name: Barca Family
description: Navy and white player ratings for Barcelona supporters.
colors:
  navy: "#101625"
  panel: "#171f32"
  white: "#f4f6fb"
  muted: "#a8b5cc"
  line: "#303b51"
  yellow: "#f4cd67"
  wine: "#b9234a"
  blue: "#3453b8"
  danger: "#ffabb8"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(56px, 6vw, 94px)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "26px"
    lineHeight: 1.2
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
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.navy}"
    rounded: "{rounded.action}"
    padding: "15px 20px"
  button-secondary:
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  rating-selected:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: Barca Family

## Overview

The established identity is dark navy and white: bold Barca Family lettering, readable Russian copy and direct access to player ratings. Burgundy and blue are supporting club accents; yellow identifies selection, progress and the primary action.

**Key Characteristics:**
- Large, tightly set brand lettering alongside a compact voting workspace.
- Real club portraits and uppercase player names.
- Visible numeric choices and explicit saving feedback.

## Colors

### Primary
Yellow carries selected scores, progress, primary actions and keyboard focus. Keep navy and white dominant in the identity.

### Secondary
Wine and blue appear in the diagonal club bars and cover artwork.

### Neutral
Navy is the page background; panel is the raised tonal surface for forms and results. White is primary text, muted is supporting copy, and line separates rows and navigation. Danger identifies error text alongside a written explanation.

## Typography

Locally hosted variable Manrope supports Latin and Cyrillic. The brand uses the display token. Match titles are compact (18px), section headings use the headline token, and score numerals are bold with tabular figures. Player names use the player token on desktop and increase to 16px on mobile; names are supplied in uppercase. Supporting role labels are small (10–11px). Native Telegram messages and buttons use Telegram typography.

## Layout

The desktop shell is capped at 1600px, with a sticky full-height identity panel and a voting column. At 1000px and below, the identity column narrows to 310px and rating controls move below the player identity. At 700px and below, the identity panel disappears; the single column is capped at 540px with 20px side padding and a compact wordmark.

Voting rows use 64px square portraits, names and positions, followed by five equal rating controls. Mobile rating controls span the row and are 45px tall. The submit dock sticks to the bottom, includes safe-area padding and displays saving status. The content editor uses labelled fields, a message selector and a multiline text area.

## Elevation & Depth

The interface relies on tonal panels and thin dividers. The only explicit shadow is the transient toast (0 8px 24px #0005). Primary actions and rating buttons are flat. State updates do not use decorative transitions; reduced-motion CSS disables transitions and smooth scrolling. Selection requests Telegram haptic feedback when available.

## Shapes

Controls and player portraits use gently rounded corners. Primary actions and toasts have slightly softer corners; results and confirmation panels use the panel radius. Profile and success marks are circular. Most ordinary buttons have a minimum height of 44px; small inline reset and back controls are more compact.

## Components

**Voting controls.** Five labelled choices from 1 to 5; the selected score uses yellow with navy text and a pressed state. Hover adds a blue-grey surface and lighter border. Keyboard focus uses a 3px yellow outline with 4px offset. A textual count accompanies the thin progress line. Users can remove a rating or skip a player.

**Saving feedback.** Selection updates immediately while a background queue saves. Failed saves retain choices and show “Есть несохранённые оценки”, with explicit “Сохранить мои изменения” and “Загрузить сохранённые оценки” actions. Navigation and submission wait for pending saves. Do not imply a failed save succeeded.

**Navigation and forms.** Underlined active navigation uses yellow; inactive labels use muted text. Inputs and selects use panel backgrounds and thin borders. Primary actions are full-width yellow; secondary actions are outlined. Disabled buttons reduce opacity. Error notices, empty states and confirmation panels explain the state in Russian.

**Bot cover and player media.** The authored cover at `public/bot-banner.png` reads “ОЦЕНКИ ИГРОКОВ” / “ПОСЛЕ МАТЧЕЙ БАРСЕЛОНЫ”, with a small Barca Family mark and five rating choices. Individual player steps use that player's real portrait through Telegram media replacement, with uppercase names, progress and native inline controls. The generic cover is not repeated as every player's image.

**Editable bot copy.** Use short Russian action labels and moderate, purposeful emoji. Administrators can edit messages and button labels. The web editor handles text and ordinary emoji; changing rich text there removes its formatting entities, with an explicit warning. Telegram editing supports formatting and custom emoji data. Native Telegram visual performance and the account's premium/custom-emoji entitlement remain unverified; do not document these as guaranteed.

The accepted review disposition covers these revisions only; it does not establish a broader native Telegram validation.

## Do's and Don'ts

- Do preserve the dark navy and white Barca Family identity.
- Do use real club portraits and clear uppercase player names.
- Do retain explicit selection, progress and saving feedback.
- Do keep native Telegram controls and concise editable Russian labels.
- Don't add slogans to the cover or replace the approved cover wording.
- Don't repeat the generic banner for every player.
- Don't add decorative motion or promise unverified Telegram behavior.
