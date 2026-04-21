# NumberChat Widget

Embeddable 1:1 chat widget for React applications.

## Install via npm

```bash
npm install number-chat
```

```tsx
import { NumberChat } from 'number-chat'
import 'number-chat/number-chat.css'

function App() {
  return (
    <NumberChat
      backendUrl="https://your-api.example.com"
      authToken={userJwtToken}
      theme="dark"
      position="bottom-right"
    />
  )
}
```

## Standalone (script tag)

```html
<link rel="stylesheet" href="number-chat.standalone.css">
<script src="number-chat.standalone.js"></script>
<div id="chat"></div>
<script>
  NumberChat.create('#chat', {
    backendUrl: 'https://your-api.example.com',
    authToken: userJwtToken,
    theme: 'dark',
    position: 'bottom-right',
  });
</script>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `backendUrl` | `string` | yes | Backend API base URL |
| `authToken` | `string` | yes | JWT auth token |
| `theme` | `'light' \| 'dark' \| ThemeObject` | no | Color theme (default: `'light'`) |
| `position` | `'bottom-right' \| 'bottom-left'` | no | Fixed position overlay (420x600px). Omit for inline rendering. |

## Theme Customization

The widget supports three theme modes:

### Preset Themes

```tsx
<NumberChat theme="light" ... />
<NumberChat theme="dark" ... />
```

### Custom Theme Object

For full control over colors, pass a custom theme object. Theme changes apply immediately without requiring a rebuild.

```tsx
const customTheme = {
  primary: '210 100% 50%',        // HSL values (no hsl() wrapper needed)
  background: '0 0% 100%',        // Main background
  foreground: '222.2 84% 4.9%',   // Main text color
  border: '214.3 31.8% 91.4%',    // Border colors
  card: '0 0% 100%',              // Card/panel backgrounds
  secondary: '210 40% 96.1%',     // Secondary elements
  muted: '210 40% 96.1%',         // Muted text backgrounds
  accent: '210 40% 96.1%',        // Accent highlights
  destructive: '0 84.2% 60.2%',   // Error/danger colors
  input: '214.3 31.8% 91.4%',     // Input field borders
  ring: '222.2 84% 4.9%',         // Focus ring colors
}

<NumberChat theme={customTheme} ... />
```

### Dynamic Theme Example

Theme can be changed dynamically at runtime:

```tsx
function App() {
  const [isDark, setIsDark] = useState(false)

  return (
    <>
      <button onClick={() => setIsDark(!isDark)}>
        Toggle {isDark ? 'Light' : 'Dark'} Mode
      </button>
      <NumberChat theme={isDark ? 'dark' : 'light'} ... />
    </>
  )
}
```

## CSS Scoping

All styles are scoped under `.nw-widget` — no conflicts with host app styles.

Custom themes are applied via CSS custom properties. For manual overrides:

```css
.nw-widget {
  --primary: 210 100% 50%;
  --radius: 1rem;
}
```

### Available CSS Variables

| Variable | Description |
|----------|-------------|
| `--background` | Main background color |
| `--foreground` | Main text color |
| `--primary` | Primary action color |
| `--primary-foreground` | Text on primary backgrounds |
| `--secondary` | Secondary element color |
| `--card` | Card/panel background |
| `--border` | Border color |
| `--input` | Input field border |
| `--ring` | Focus ring color |
| `--destructive` | Error/danger color |
| `--muted` | Muted text background |
| `--accent` | Accent highlight color |
| `--radius` | Border radius |

## Build

```bash
npm run build:widget      # ESM + UMD for npm
npm run build:standalone  # IIFE bundle with React included
npm run build:all         # Both + main app
```

Build outputs:
- `dist-widget/` — `number-chat.es.js`, `number-chat.umd.js`, `number-chat.css`
- `dist-standalone/` — `number-chat.standalone.js`, `number-chat.standalone.css`
