# Hamburger Menu Components

This directory contains the hamburger menu control for the map interface.

## Overview

The hamburger menu provides quick access to map-related actions:
- **Search Location**: Geocoder search with Mapbox SearchBox
- **Help**: Opens keyboard shortcuts panel (F12)
- **Future Items**: Placeholder for additional features

## Component Structure

```
menu/
├── HamburgerMenuControl.tsx  # Main orchestrator
├── HamburgerButton.tsx        # Toggle button (3-line icon)
├── HamburgerMenu.tsx          # Dropdown container
├── MenuItem.tsx               # Reusable menu item wrapper
├── HelpMenuItem.tsx           # Help panel trigger
├── SearchMenuItem.tsx         # Geocoder search
└── index.ts                   # Barrel exports
```

## Usage

```tsx
import { HamburgerMenuControl } from './menu';

<HamburgerMenuControl
  mapRef={mapRef}
  onHelpOpen={() => setHelpPanelOpen(true)}
/>
```

## Positioning

- **Hamburger Button**: `top-14 right-2` (below fullscreen button)
- **Dropdown Menu**: `top-[60px] right-2` (slides down from button)
- **Z-Index**: `Z_INDEX.HAMBURGER_MENU` (200)

## Features

### Search Location
- Expands to show Mapbox SearchBox
- Autocomplete with Canadian addresses
- Flies map to selected location with animation
- Closes menu after selection

### Help
- Opens keyboard shortcuts panel
- Shows F12 hint
- Closes menu after opening help

### Interactions
- Click outside to close
- Escape key to close
- Click button to toggle
- Dark mode support

## Adding New Menu Items

1. Create a new component in this directory (e.g., `SettingsMenuItem.tsx`)
2. Use the `MenuItem` wrapper for consistent styling
3. Add to `HamburgerMenuControl.tsx`
4. Export from `index.ts`

Example:

```tsx
// MyMenuItem.tsx
import { MenuItem } from './MenuItem';

export const MyMenuItem = ({ onClick }: { onClick: () => void }) => {
  return (
    <MenuItem
      icon={<MyIcon />}
      label="My Feature"
      hint="Ctrl+M" // Optional keyboard hint
      onClick={onClick}
    />
  );
};
```

## Best Practices

- Keep menu items focused on map-related actions
- Use clear, concise labels
- Include keyboard shortcut hints when applicable
- Close menu after action completes
- Test with dark mode
- Ensure touch targets are adequate (44px minimum)
