# @plcmp/pl-table

Lightweight data table Web Component with virtual scrolling, sorting, tree mode, row selection, custom templates, and per-cell tooltips.

## Installation

```bash
npm i @plcmp/pl-table
```

## Basic usage

```html
<pl-table id="usersTable">
    <pl-table-column header="Name" field="name" sortable tooltip-field></pl-table-column>
    <pl-table-column header="Email" field="email" tooltip-field></pl-table-column>
    <pl-table-column header="Created" field="createdAt" kind="date" format="DD.MM.YYYY"></pl-table-column>
    <pl-table-column header="Balance" field="balance" kind="number" format="+0,0#"></pl-table-column>
</pl-table>

<script type="module">
    import '@plcmp/pl-table/pl-table.js';

    const table = document.querySelector('#usersTable');
    table.data = [
        { name: 'Alice', email: 'alice@example.com', createdAt: '2026-02-15', balance: 1234.5 },
        { name: 'Bob', email: 'bob@example.com', createdAt: '2026-02-16', balance: -12.34 }
    ];
</script>
```

## Core features

- Virtualized rendering via `pl-virtual-scroll`
- Single and multi-select row modes
- Column sorting and resizing
- Tree data mode (`keyField`/`pkeyField`)
- Custom cell/header/footer/filter templates
- Sticky fixed/action columns
- Cell tooltips (`tooltip-field` or custom tooltip template)

## `pl-table` API

Main public properties:

- `data: Array` - table rows (supports `data.sorts` for sort descriptors)
- `selected: Object | null` - currently selected row in single-select mode
- `multiSelect: boolean` - enables checkbox selection (`selectedList`)
- `externalSelect: boolean` - checkbox state from `row._selected` (`true` / `null` / `false`); pair with `pl-selectlist-manager` for tree/partial selection
- `selectedList: Array` - selected rows in multi-select mode; checkbox checked only if row is in this list (no parent/descendant logic in the table)
- `tree: boolean` - enables tree mode
- `keyField: string` - row key field for tree mode
- `pkeyField: string` - parent key field for tree mode
- `hasChildField: string` - children flag field (default: `_haschildren`)
- `variableRowHeight: boolean` - enables variable-height rows in virtual scroll
- `growing: boolean` - incremental loading mode
- `refreshing: boolean` - skeleton/loading state for visible rows
- `skeletonHeight: string` - row skeleton height CSS value
- `customRowTemplate: Template` - custom row renderer for virtual scroll
- `getRowPartName: (row) => string` - custom `part` tokens for rows
- `getCellPartName: (row, column) => string` - custom `part` tokens for cells

Main events:

- `rowClick` - fired on row click, payload: `event.detail.model`
- `rowDblclick` - fired on row double click, payload: `event.model`
- `rowContextMenu` - cancelable context menu event, payload: `event.model`

Extension point:

- `beforeSelect(row): Promise<boolean> | boolean` - override to block row selection when needed.

## `pl-table-column` API

Main public properties:

- `header: string` - header label
- `field: string` - row field path (supports dot notation)
- `tooltipField: string` - tooltip field path for cell hover; when `tooltip-field` is present without a value, column `field` is used
- `kind: string` - value kind (`date` or `number`; custom kinds via `PlTable.registerKind`)
- `format: string` - date format when `kind="date"`, number format mask when `kind="number"`
- `width: number` - column width in pixels
- `minWidth: number` - minimum width (default: `50`)
- `align: string` - body alignment (`left` by default)
- `headerAlign: string` - header alignment (`left` by default)
- `sortable: boolean` - enables sorting UI
- `sort: '' | 'asc' | 'desc'` - current sort state
- `resizable: boolean` - enables column resize handle
- `hidden: boolean` - hides column
- `fixed: boolean` - sticky fixed column
- `action: boolean` - action column placement mode

## Tooltip usage in table context

Tooltips are owned by each column and shown on cell hover (`mouseenter`).

### Option 1: `tooltip-field` (recommended)

Use `tooltip-field` as a boolean attribute when tooltip text should come from the column `field`:

```html
<pl-table-column
    header="Description"
    field="description"
    tooltip-field>
</pl-table-column>
```

If tooltip text must come from a different path, provide it explicitly:

```html
<pl-table-column
    header="Owner"
    field="ownerCode"
    tooltip-field="ownerName">
</pl-table-column>
```

Use this option when tooltip text is the same as, or directly derived from, row data.

### Option 2: custom tooltip template

Define a dedicated tooltip template in the column:

```html
<pl-table-column header="Status" field="status">
    <template is="tooltip" keep-hover>
        <div>
            <strong>Status:</strong> [[row.status]]
        </div>
    </template>
</pl-table-column>
```

Use this for rich content or custom formatting.

### Tooltip best practices

- Prefer `tooltip-field` for simple text: less template overhead.
- Keep tooltip content lightweight; avoid heavy DOM trees inside virtualized tables.
- Return empty text for cells that should not show hints.
- Use `keep-hover` only when tooltip content is interactive.
- Keep cell content and tooltip content aligned to avoid user confusion.

## Number formatting

Set `kind="number"` to format numeric values with `Intl.NumberFormat` using the `ru-RU` locale.

Use `0` for required fraction digits and `#` for optional fraction digits. A leading `+` displays a sign for positive values except zero.

Invalid or omitted formats use one required fraction digit by default.

Custom kinds:

```js
import { PlTable } from '@plcmp/pl-table/pl-table.js';

PlTable.registerKind('currency', (value, { row, field, format }) => {
    // return display string
});
// PlTable.registerKind('currency', fn, true) — replace an existing kind
```

Formatter signature: `(value, { row, field, format }) => unknown`.

Built-in `date` / `number` live in `PlTable.kindFormatters`; overwrite only with `replace: true`.

## Sorting behavior

Sorting state is kept in `data.sorts` as items like:

```js
{ field: 'name', sort: 'asc' }
```

Clicking a sortable header cycles:

`'' -> 'asc' -> 'desc' -> ''`

## Styling hooks

- Host/containers can be themed through CSS variables used in component styles.
- Row container exports `part="rows"`.
- Per-row and per-cell `part` values can be extended through:
  - `getRowPartName(row)`
  - `getCellPartName(row, column)`

## Notes

- This package is ESM-only (`"type": "module"`).
- Include required peer components/icons in your app bundle when needed (`pl-icon`, iconset packages, etc.).
