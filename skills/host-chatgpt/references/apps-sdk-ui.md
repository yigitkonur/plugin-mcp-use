# `@openai/apps-sdk-ui` (optional)

Verified against the published package `@openai/apps-sdk-ui@0.2.2` (types read from `dist/types`, 2026-10-20) and compiled in CI. The library is optional; it gives ChatGPT visual parity. It needs React 18 or 19 and Tailwind CSS 4 (the package's peer range is `tailwindcss ^4.0.10`, S26).

## Setup
```sh
npm install @openai/apps-sdk-ui tailwindcss @tailwindcss/vite
```
`views/<name>/view.css` (path in `@source` is relative to this file):
```css
@import "tailwindcss";
@import "@openai/apps-sdk-ui/css";
@source "../../node_modules/@openai/apps-sdk-ui";
```
`@source` is required: Tailwind 4 does not scan `node_modules`, so utility classes used inside the components (`size-4`, `heading-lg`, …) would be missing. Import the CSS from the view before components render (`import "./view.css";`).

**Dev-mode workaround (rule CG-U18).** In `mcp-use dev`, a view that imports an apps-sdk-ui *component* (`AppsSDKUIProvider`, `Badge`, `Button`, …) failed to render in two projects: the screenshot timed out and the dev log showed `[vite] (client) [Unhandled error] SyntaxError: The requested module '/.mcp-use/cache/deps/react_jsx-runtime.js?v=…' does not provide an export named 't'` (S19). Add a project-level `vite.config.ts`; mcp-use loads it for views:
```ts
import { defineConfig } from "vite";
export default defineConfig({ optimizeDeps: { exclude: ["@openai/apps-sdk-ui"] } });
```
With it, both projects rendered under `mcp-use dev` (2 of 2 screenshots each, zero error lines). Production (`mcp-use build` + `mcp-use start`) rendered without it. Views that import only `@openai/apps-sdk-ui/theme` are unaffected. This config was run (S19), not compiled in CI.

## Provider and theme
- `AppsSDKUIProvider` is **optional**. It supplies the router `linkComponent` for `TextLink`, `ButtonLink` and `Menu.Link`. **When used, `linkComponent` is required** (`ComponentType | ForwardRefExoticComponent | "a"`).
- Theme: the library styles from `<html data-theme="light|dark">`. `useViewTheme()` returns the string; apply it:

<!-- fixture: sdkui-theme -->
```tsx
import { useEffect } from "react";
import { useToolContext, useViewTheme } from "mcp-use/react";
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { applyDocumentTheme } from "@openai/apps-sdk-ui/theme";

export default function Themed() {
  const context = useToolContext<"show-product">();
  const theme = useViewTheme();
  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);
  if (context.status !== "ready") return null;
  return (
    <AppsSDKUIProvider linkComponent="a">
      <div className="p-4 text-default">{context.toolOutput.title}</div>
    </AppsSDKUIProvider>
  );
}
```
`@openai/apps-sdk-ui/theme` also exports `getDocumentTheme()` and `useDocumentTheme()`.

## Inventory
**29 components** (import each from `@openai/apps-sdk-ui/components/<Name>`): Alert, AppsSDKUIProvider, Avatar (+`AvatarGroup`), Badge, Button (+`ButtonLink`, `CopyButton`), Checkbox, CodeBlock, DatePicker, DateRangePicker, EmptyMessage, Icon (745 icons), Image, Indicator (`CircularProgress`, `LoadingDots`, `LoadingIndicator`), Input, Markdown, Menu, Popover, RadioGroup, SegmentedControl, Select, SelectControl, ShimmerText, Slider, Switch, TagInput, TextLink, Textarea, Tooltip (+`CopyTooltip`), Transition. **There is no `Card`**: use a `div` (`rounded-2xl border border-default bg-surface p-4`). **14 hooks** from `@openai/apps-sdk-ui/hooks/<name>`: `useAnimatedScrollTo`, `useAutoGrowTextarea`, `useBreakpoints` (plural), `useCharactersPerSecond`, `useDocumentVisible`, `useEscCloseStack`, `useIsMounted`, `useLatestValue`, `usePrevious`, `useScrollable`, `useSimulatedProgress`, `useStableCallback`, `useTextSelection`, `useTrailingValue`.

## Prop gotchas (each verified against the 0.2.2 types)
| Component | Rule |
|---|---|
| `Button` | **`color` is required** (`primary \| secondary \| danger \| success \| info \| discovery \| caution \| warning`); `variant`: `solid \| soft \| outline \| ghost`; `size` is a `ControlSize` (`3xs` … `3xl`); also `pill`, `block`, `loading`, `disabled`. |
| `ButtonLink` | same visual props plus `external`, `as`; link target comes from the provider's `LinkComponent`. |
| `CopyButton` | `copyValue` (string, clipboard content or function) and optional `children` (node or `({ copied }) => node`). Not `value`, not `text`. |
| `Badge` | `color`: `secondary \| success \| danger \| warning \| info \| discovery` (no `primary`); `variant`: `solid \| soft \| outline`; `size`: `sm \| md \| lg`; `pill`. |
| `Alert` | `color`: `primary \| danger \| success \| info \| discovery \| caution \| warning` (no `secondary`, no `neutral`); props `title`, `description`, `actions`, `actionsPlacement`, `indicator`. |
| `Avatar` | `size` is a **number** (`32`), not `"md"`; `imageUrl`, not `src`; `name`, `color`, `variant`, `Icon`. `AvatarGroup`: `stack: "start" \| "end"`, `size`. |
| `Input` | `startAdornment` / `endAdornment`; `variant`: `outline \| soft`; `invalid`; no `clearable`, no `prefix`. `Textarea`: `rows`, `autoResize`, `maxRows`. |
| `Checkbox` | `orientation`: **`"left" \| "right"`** (label side); `onCheckedChange(boolean)`; `checked` may be `"indeterminate"`. `Switch`: `labelPosition: "start" \| "end"`. |
| `RadioGroup` | `aria-label` is required; `onChange(value)`; children are `RadioGroup.Item value=…`. `SegmentedControl`: `aria-label` required, `value`, `onChange`, children `SegmentedControl.Option value=…`. |
| `Slider` | `value`, `min`, `max`, `step` and `onChange(number)` are all required. |
| `EmptyMessage` | compound: `EmptyMessage.Icon`, `.Title`, `.Description`, `.ActionRow`; no flat `icon`/`title` props. `fill`: `static \| absolute \| none`. |
| `CodeBlock` | code goes in `children` (string); `language`; no `filename`. |
| `Indicator` module | exports `CircularProgress`, `LoadingDots`, `LoadingIndicator`; there is no presence dot. |
| `Tooltip` | `content` (node) and `children`; `CopyTooltip` takes `copyValue`. |
| `Popover` / `Menu` | compound: `Popover.Trigger`, `Popover.Content`; `Menu.Trigger`, `Menu.Content`, `Menu.Item`, `Menu.Link`, `Menu.Separator`, `Menu.Sub*`. |
| `Markdown` | `children` string; `breakNewLines`, `includeMath`, `copyableCodeBlocks`, `skipHtml`. |
| `DatePicker`, `DateRangePicker` | values are Luxon `DateTime` (install `luxon`). |

<!-- fixture: sdkui-components -->
```tsx
import { useState } from "react";
import { Alert } from "@openai/apps-sdk-ui/components/Alert";
import { Avatar, AvatarGroup } from "@openai/apps-sdk-ui/components/Avatar";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button, CopyButton } from "@openai/apps-sdk-ui/components/Button";
import { Checkbox } from "@openai/apps-sdk-ui/components/Checkbox";
import { CodeBlock } from "@openai/apps-sdk-ui/components/CodeBlock";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { Input } from "@openai/apps-sdk-ui/components/Input";
import { LoadingIndicator } from "@openai/apps-sdk-ui/components/Indicator";
import { RadioGroup } from "@openai/apps-sdk-ui/components/RadioGroup";
import { SegmentedControl } from "@openai/apps-sdk-ui/components/SegmentedControl";
import { Slider } from "@openai/apps-sdk-ui/components/Slider";
import { Switch } from "@openai/apps-sdk-ui/components/Switch";
import { Tooltip } from "@openai/apps-sdk-ui/components/Tooltip";

export default function Kit() {
  const [agree, setAgree] = useState(false);
  const [size, setSize] = useState<"s" | "m">("s");
  const [level, setLevel] = useState(3);
  return (
    <div className="p-4">
      <Alert color="warning" variant="soft" title="Heads up" description="Check the details." />
      <Badge color="success" pill>Paid</Badge>
      <Avatar size={32} name="Alex Doe" imageUrl="/alex.jpg" />
      <AvatarGroup size={24} stack="start"><Avatar name="A" /><Avatar name="B" /></AvatarGroup>
      <Button color="primary" variant="solid" size="md" onClick={() => setAgree(true)}>Save</Button>
      <CopyButton color="secondary" copyValue="INV-1">Copy id</CopyButton>
      <Checkbox checked={agree} onCheckedChange={setAgree} label="I agree" orientation="left" />
      <Switch checked={agree} onCheckedChange={setAgree} label="Notify me" labelPosition="end" />
      <Input placeholder="Search" invalid={false} />
      <RadioGroup aria-label="Size" value={size} onChange={setSize}>
        <RadioGroup.Item value="s">Small</RadioGroup.Item>
        <RadioGroup.Item value="m">Medium</RadioGroup.Item>
      </RadioGroup>
      <SegmentedControl aria-label="Mode" value={size} onChange={setSize}>
        <SegmentedControl.Option value="s">S</SegmentedControl.Option>
        <SegmentedControl.Option value="m">M</SegmentedControl.Option>
      </SegmentedControl>
      <Slider value={level} min={1} max={5} step={1} onChange={setLevel} />
      <Tooltip content="More info"><span>?</span></Tooltip>
      <CodeBlock language="json">{JSON.stringify({ ok: true })}</CodeBlock>
      <LoadingIndicator size={20} />
      <EmptyMessage fill="static">
        <EmptyMessage.Title>No results</EmptyMessage.Title>
        <EmptyMessage.Description>Try another search.</EmptyMessage.Description>
      </EmptyMessage>
    </div>
  );
}
```

### Wrong (each rejected by the compiler)
<!-- fixture-bad: sdkui-button-no-color -->
```tsx
import { Button } from "@openai/apps-sdk-ui/components/Button";

export default function Bad() {
  return <Button variant="solid">Save</Button>;
}
```
<!-- fixture-bad: sdkui-card -->
```tsx
import { Card } from "@openai/apps-sdk-ui/components/Card";

export default function Bad() {
  return <Card>hello</Card>;
}
```
<!-- fixture-bad: sdkui-provider-no-link -->
```tsx
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";

export default function Bad() {
  return <AppsSDKUIProvider>hello</AppsSDKUIProvider>;
}
```
<!-- fixture-bad: sdkui-avatar-size-string -->
```tsx
import { Avatar } from "@openai/apps-sdk-ui/components/Avatar";

export default function Bad() {
  return <Avatar size="md" src="/a.jpg" />;
}
```

Sources: O3, O7, M2, S19, S26.
