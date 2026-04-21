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
| `theme` | `'light' \| 'dark'` | no | Color theme |
| `position` | `'bottom-right' \| 'bottom-left'` | no | Fixed position overlay (420x600px). Omit for inline rendering. |

## CSS Scoping

All styles are scoped under `.nw-widget` — no conflicts with host app styles.

Override theme colors with CSS custom properties:

```css
.nw-widget {
  --primary: 210 100% 50%;
  --radius: 1rem;
}
```

## Build

```bash
npm run build:widget      # ESM + UMD for npm
npm run build:standalone  # IIFE bundle with React included
npm run build:all         # Both + main app
```

Build outputs:
- `dist-widget/` — `number-chat.es.js`, `number-chat.umd.js`, `number-chat.css`
- `dist-standalone/` — `number-chat.standalone.js`, `number-chat.standalone.css`
