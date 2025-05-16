import { css, html, PlElement, Template } from 'polylib';

import '@plcmp/pl-virtual-scroll';

import '@plcmp/pl-icon';
import '@plcmp/pl-iconset-default';
import '@plcmp/pl-data-tree';
import '@plcmp/pl-checkbox';

import { PlResizeableMixin, throttle, PlaceHolder } from '@plcmp/utils';
import dayjs from 'dayjs/esm/index.js';

import './pl-table-column.js';

class PlTable extends PlResizeableMixin(PlElement) {
    static properties = {
        data: { type: Array, value: () => [], observer: '_dataObserver' },
        selected: { type: Object, value: () => null, observer: '_selectedObserver' },
        tree: { type: Boolean, observer: '_treeModeChange' },
        _vdata: { type: Array, value: () => [] },
        _columns: { type: Array, value: () => [] },
        keyField: { type: String },
        pkeyField: { type: String },
        hasChildField: { type: String, value: '_haschildren' },
        multiSelect: { type: Boolean, value: false },
        selectedList: { type: Array, value: [] },
        getRowPartName: { type: Function, value: () => { } },
        getCellPartName: { type: Function, value: () => { } },
        variableRowHeight: { type: Boolean, value: false, observer: '_variableRowHeightObserver' },
        growing: { type: Boolean, value: false, observer: '_growingObserver' }
    };

    static css = css`
        :host {
            width: 100%;
            height: 100%;
            border: 1px solid var(--pl-grey-light);
            border-radius: var(--pl-border-radius);
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            background-color: var(--pl-background-color);
        }

        #container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: auto;
            position:relative;
            contain: var(--pl-table-contain, size);
        }

        #headerContainer{
            display: flex;
            width: 100%;
            position: sticky;
            z-index: 2;
            top: 0;
        }

        #footerContainer {
            display: var(--pl-footer-display, none);
            height: var(--pl-base-size);
            width: 100%;
            background-color: var(--pl-grey-lightest);
            z-index: 2;
            bottom: 0;
            position: var(--pl-footer-container-position, absolute);
        }

        #header{
            display: grid;
            background-color: var(--pl-grey-lightest);
            border-bottom: 1px solid var(--pl-grey-light);
            flex: 1;
        }

        #footer{
            display: var(--pl-table-header-display, flex);
            background-color: var(--pl-grey-lightest);
            border-top: 1px solid var(--pl-grey-light);
            flex: 1;
        }

        .header-el-container {
            display: flex;
            flex-direction: column;
            gap: var(--pl-space-sm);
            justify-content: space-between;
            text-align: start;
            width: 100%;
            height: 100%;
        }

        .header-text-container {
            display: flex;
            gap: var(--pl-space-sm);
            justify-content: space-between;
            text-align: start;
            width: 100%;
            height: 100%;
        }

        .header-text {
            display: flex;
            white-space: normal;
            word-wrap: normal;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            height: 100%;
        }

        .cell.headerEl {
            height: 100%;
            white-space: normal;
            min-height: var(--pl-base-size);
            justify-content: flex-start;
            text-align: left;
            align-items: flex-start;
            padding: var(--pl-space-sm);
            font: var(--pl-header-font);
            color: var(--pl-header-color);
            display: flex;
            flex-direction: column;
            gap: var(--pl-space-sm);
        }

        .cell.headerEl.group {
            align-items: center;
            justify-content: center;
        }

        .footerEl {
            display: flex;
            align-items: center;
            height: 100%;
            box-sizing: border-box;
            font: var(--pl-header-font);
            color: var(--pl-header-color);
            padding: var(--pl-space-sm);
        }

        .footerCell{
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .headerEl[fixed], 
        .footerEl[fixed] {
            position: sticky;
            z-index: 3;
            background-color: inherit;
        }

        .column-resizer {
            height: 100%;
            inset-inline-end: 0;
            inset-block-start: 0;
            position: absolute;
            width: 4px;
            padding: 0 !important;
        }

        .column-resizer:hover  {
            cursor: ew-resize;
            border-inline-end: 2px solid var(--pl-primary-base);
        }

        .headerEl[action],
        .footerEl[action] {
            position: var(--pl-action-column-position, absolute);
            background-color: var(--pl-grey-lightest);
            border-inline-start: 1px solid var(--pl-grey-light);
            border-inline-end: 1px solid transparent;
            z-index: 3;
        }

        .headerEl:nth-last-child(1 of :not([action])) {
            border-inline-end: 1px solid transparent;
        }
        
        .headerEl[hidden], .footerEl[hidden] {
            display: none;
        }

        #rowsContainer {
            height: 100%;
            width: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
            flex-shrink:0;
        }

        .row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid var(--pl-grey-light);
            background-color: var(--pl-background-color);
            color: var(--pl-text-color);
            width: 100%;
            box-sizing: border-box;
            position: relative;
        }

        .cell:nth-last-child(1 of :not([action])) {
            border-inline-end: 1px solid transparent;
        }

        .headerEl:nth-last-child(1 of [fixed]),
        .footerEl:nth-last-child(1 of [fixed]),
        .cell:nth-last-child(1 of [fixed]) {
            border-inline-end: 2px solid var(--pl-grey-base);
        }

        .headerEl:nth-child(1 of [action]),
        .footerEl:nth-child(1 of [action]),
        .cell:nth-child(1 of [action]) {
            border-inline-start: 2px solid var(--pl-grey-base);
        }

        .cell {
            display: flex;
            align-items: var(--pl-table-cell-align-items, center);
            background-color: inherit;
            box-sizing: border-box;
            border-inline-end: 1px solid var(--pl-grey-light);
            height: var(--pl-table-cell-height, var(--pl-base-size));
            white-space: var(--pl-table-cell-white-space, nowrap);
            position: relative;
        }

        .cell-content {
            padding: 0 var(--pl-space-sm);
            width: 100%;
            box-sizing: border-box;
        }

        .cell-content:empty{
            display: none;
        }

        .cell * {
            word-wrap: break-word;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        .cell.headerEl > .header-el-container {
            overflow: initial;
        }

        .row[loading] {
            cursor: wait;
        }
        .row[loading] .cell {
            background: var(--background-color);
            pointer-events: none;
            padding: 0;
        }

        .row[loading] .cell::after {
            width: 100%;
            height: calc(100% - 16px);
            margin: 16px 8px;
            display: flex;
            content:'';
            border-radius: var(--pl-border-radius);
            background: var(--pl-grey-light);
            animation: skeleton 1s ease-in-out forwards infinite;
            animation-direction: alternate;
        }

        .row[loading] .cell * {
            display: none;
        }

        @keyframes skeleton {
            0% {
                opacity: 0.2;
                transform: scale(0.98);
            }
            85%, 100% {
                opacity: 0.8;
                transform: scale(1);
            }
        }

        .cell[fixed] {
            position: sticky;
            z-index:1;
        }

        .cell[action] {
            position: var(--pl-action-column-position, absolute);
            border-inline-start: 1px solid var(--pl-grey-light);
            border-inline-end: 1px solid transparent;
            z-index:1;
            min-height: 100%;
        }

        .cell[hidden] {
            display: none;
        }

        .row:not([loading]):hover, 
        .row:not([loading]):hover .cell,
        .row[active], 
        .row[active] .cell{
            background-color: var(--pl-primary-lightest);
            color: var(--pl-text-color);
        }

        .row[active]{
            z-index: 1;
         }

        .top-toolbar ::slotted(*) {
            width: 100%;
            padding: var(--pl-space-sm);
            box-sizing: border-box;
            border-bottom: 1px solid var(--pl-grey-light);
        }

        .bottom-toolbar ::slotted(*) {
            border-top: 1px solid var(--pl-grey-light);
            width: 100%;
            padding: var(--pl-space-sm);
            box-sizing: border-box;
        }

        .multi-checkbox {
            height: var(--pl-base-size);
            width: var(--pl-base-size);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .column-sort {
            cursor: pointer;
            color: var(--pl-grey-dark);
            margin-inline-end: 4px;
        }
    `;

    static checkboxCellTemplate = `<pl-checkbox class="multi-checkbox " checked="[[_itemSelected(row, selectedList)]]" on-click="[[_onSelect]]"></pl-checkbox>`;
    static treeFirstCellTemplate = `<pl-icon-button style$="[[_getRowMargin(row, column.index)]]" variant="link" iconset="pl-default" icon="[[_getTreeIcon(row)]]" on-click="[[_onTreeNodeClick]]"></pl-icon-button>`;

    static template = html`
        <style id="columnSizes"></style>
        <div class="top-toolbar">
            <slot name="top-toolbar"></slot>
        </div>
        <div id="container">
            <div id="headerContainer">
                <div id="header">
                    <div d:repeat="[[_columns]]" d:as="column" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" class$="[[_getCellClass(column, 'headerEl')]]">
                        <div class="header-el-container">
                            <div class="header-text-container">
                                <div class="header-text" style$="[[_getHeaderStyle(column)]]">
                                    [[column.header]]
                                    [[column.headerTemplate]]
                                </div>
                                <div hidden$="[[!column.sortable]]" class="column-sort" on-click="[[_onSortClick]]">
                                    <pl-icon iconset="pl-grid-icons" size="16" icon="[[_getSortIcon(column)]]"></pl-icon>
                                </div>
                            </div>
                        [[column.filterTemplate]]
                        </div>
                        <div hidden$="[[_isResizable(column._isHeaderColumn, column.resizable)]]" class="column-resizer" on-mousedown="[[onResize]]"></div>
                    </div>
                </div>
            </div>
            <div id="rowsContainer" part="rows">
                <pl-virtual-scroll canvas="[[$.rowsContainer]]" items="{{_vdata}}" as="row" id="scroller" variable-row-height=[[variableRowHeight]]>
                    <template id="tplRow">
                        <div part$="[[_getRowParts(row)]]" class="row" loading$="[[_isPlaceholder(row)]]" active$="[[_isRowActive(row, selected)]]" on-click="[[_onRowClick]]" on-dblclick="[[_onRowDblClick]]">
                            <template d:repeat="[[_filterCols(_columns)]]" d:as="column">
                                <div part$="[[_getCellParts(row, column)]]" class$="[[_getCellClass(column, 'cell')]]" hidden$="[[column.hidden]]" fixed$="[[column.fixed]]" action$="[[column.action]]" title$="[[_getTitle(row, column)]]">
                                    [[getTemplateForCell(tree, multiSelect, column.index)]]
                                    [[column.cellTemplate]]
                                    <span class="column-resizer" hidden$="[[!column.resizable]]" on-mousedown="[[onResize]]"></span>
                                </div>
                            </template>
                        </div>
                    </template>
                </pl-virtual-scroll>
            </div>
            <div id="footerContainer">
                <div id="footer">
                    <div d:repeat="[[_filterCols(_columns)]]" d:as="column" class="footerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" class$="[[_getCellClass(column, 'footerEl)]]">
                        <div class="footerCell">
                            [[column.footerTemplate]]
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="bottom-toolbar">
            <slot name="bottom-toolbar"></slot>
        </div>
        <pl-data-tree bypass="[[!tree]]" key-field="[[keyField]]" pkey-field="[[pkeyField]]" has-child-field="[[hasChildField]]" in="{{data}}" out="{{_vdata}}"></pl-data-tree>
    `;

    connectedCallback() {
        super.connectedCallback();

        this.scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        this.addEventListener('column-attribute-change', this.onColumnAttributeChange);
        const styleComment = Array.from(this.childNodes)
            .find(node => node.nodeType === Node.COMMENT_NODE && node._tpl && node._tpl.tpl.matches('[is="extra styles"]'));

        if (styleComment) this.shadowRoot.append(styleComment._tpl.tpl.content.cloneNode(true));

        const headerResizeObserver = new ResizeObserver(throttle((entries) => {
            const headerWidth = entries[0].contentRect.width;

            if (this.$.container.offsetWidth > headerWidth) {
                this.$.rowsContainer.style.width = '100%';
            } else {
                this.$.rowsContainer.style.width = headerWidth + 'px';
            }
        }, 5));

        headerResizeObserver.observe(this.$.header);

        const containerResizeObserver = new ResizeObserver(throttle(() => {
            if (this.$.container.scrollHeight <= this.$.container.offsetHeight) {
                this.$.container.style.setProperty('--pl-footer-container-position', 'absolute');
            } else {
                this.$.container.style.setProperty('--pl-footer-container-position', 'sticky');
            }

            this.$.scroller.render();
        }, 5));

        containerResizeObserver.observe(this.$.rowsContainer);

        const observer = new MutationObserver(throttle(() => {
            this._init();
        }, 15));

        observer.observe(this, { attributes: false, childList: true, subtree: true });

        // let nested column components upgrade, then call _init method
        setTimeout(() => {
            if (this.data?.control) {
                this._treeModeChange();
            }
            this._init();
        }, 0);
    }

    _isResizable(group, resizable) {
        return group || !resizable;
    }

    _variableRowHeightObserver(val) {
        if (val) {
            this.$.container.style.setProperty('--pl-table-cell-height', 'auto');
            this.$.container.style.setProperty('--pl-table-cell-white-space', 'normal');
            this.$.container.style.setProperty('--pl-table-cell-align-items', 'flex-start');
        }
    }

    _getTitle(row, column) {
        if (row) {
            if (column.titleField) {
                return this.getByPath(row, column.titleField);
            } else {
                return this._getValue(row, column.field, column.kind, column.format);
            }
        }
    }

    _getValue(row, field, kind, format) {
        if (row) {
            if (kind === 'date' && row[field]) {
                return dayjs(this.getByPath(row, field)).format(format || 'DD.MM.YYYY');
            }
            return this.getByPath(row, field);
        }
    }

    _getSortIcon(column) {
        let icon = 'sort';
        switch (column.sort) {
            case 'asc': {
                icon = 'sort-asc';
                break;
            }
            case 'desc': {
                icon = 'sort-desc';
                break;
            }
        }

        return icon;
    }

    _onSortClick(event) {
        let sort = '';
        if (!event.model.column.sort) {
            sort = 'asc';
        } else if (event.model.column.sort === 'asc') {
            sort = 'desc';
        }

        this.set(`_columns.${event.model.column.index}.sort`, sort);
        this._changeColumnSort(event.model.column, sort);
    }

    getByPath(object, path, delimiter = '.') {
        if (path === undefined) return '';
        path = path.split(delimiter);
        let i;
        for (i = 0; i < path.length - 1; i++) {
            if (!object[path[i]]) {
                return;
            }
            object = object[path[i]];
        }
        return object[path[i]];
    }

    onResize(event) {
        const columnIdx = event.model.column.index;
        let width = event.model.column.width;
        const minWidth = event.model.column.minWidth;
        if (!width) width = this.root.querySelector(`.headerEl.column-${columnIdx}`).offsetWidth;
        const _resizeBase = { baseSize: parseInt(width), baseMoveOffset: event.screenX };
        event.preventDefault();
        const moveHandler = throttle((event) => {
            width = Math.max(minWidth, _resizeBase.baseSize + (event.screenX - _resizeBase.baseMoveOffset));
            this._changeColumnWidth(this._columns[columnIdx], width);
        }, 20);

        const removeHandlers = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        const upHandler = () => {
            removeHandlers();
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    _growingObserver(val) {
        if (val) {
            this.$.container.style.setProperty('--pl-table-contain', 'none');
        }
    }

    _dataObserver(_data, _old, mut) {
        if (mut.action === 'splice' && mut.path === 'data') {
            if (mut?.deleted?.includes(this.selected)) {
                this.selected = null;
            }
        }

        if (mut.path !== 'data' && this.selected) {
            const m = mut.path.match(/^data\.(\d*)/);
            if (m[1] === this.data.indexOf(this.selected)) {
                this.forwardNotify(mut, `data.${m[1]}`, 'selected');
            }
        }
    }

    _getHeaderStyle(col) {
        const style = [];
        switch (col.headerAlign) {
            case 'end':
            case 'flex-end':
            case 'right': {
                style.push('text-align: end');
                style.push('justify-content: end');
                break;
            }

            case 'start':
            case 'flex-start':
            case 'left': {
                style.push('text-align: start');
                style.push('justify-content: start');
                break;
            }

            case 'center': {
                style.push('text-align: center');
                style.push('justify-content: center');
                break;
            }
        }

        return style.join(';');
    }

    _getCellClass(col, el) {
        if (el === 'headerEl') {
            return el + ' ' + col.class + ' cell' + (col._isHeaderColumn ? ' group' : '');
        }

        return el + ' ' + col.class;
    }

    onColumnAttributeChange(event) {
        const { index, attribute, value, init } = event.detail;
        if (this._columns[index]) {
            if (attribute === 'sort') {
                this._changeColumnSort(this._columns[index], value, init);
            }
            if (attribute === 'width') {
                this._changeColumnWidth(this._columns[index], value, init);
                this.reactToResize();
            }
            if (attribute === 'hidden') {
                this.set(`_columns.${index}._hidden`, value);
                this.reactToResize();
            }
        }
    }

    _getRowParts(row) {
        const rowNames = this.getRowPartName?.(row) || '';
        return ('row ' + rowNames).trim();
    }

    _getCellParts(row, column) {
        const cellNames = this.getCellPartName?.(row, column) || '';
        return ('cell ' + cellNames).trim();
    }

    reactToResize() {
        if (this._columns.length === 0) {
            return;
        }
        const colStyles = {};
        const realColumns = this._columns.filter(x => x._isHeaderColumn === false);
        const maxRows = Math.max(...this._columns.map(o => o.node._row), 0);
        const columns = realColumns.map((column) => {
            const parent = this._columns.find(x => x.index === column.node._parentIndex);
            if ((column.node.hidden && column._hidden) || parent?._hidden) {
                return '0';
            } else if (column.width) {
                return column.width + 'px';
            } else {
                return '1fr';
            }
        }).join(' ');

        this._columns.forEach((el) => {
            const style = [];

            const parent = this._columns.find(x => x.index === el.node._parentIndex);
            if ((el.node.hidden && el._hidden) || parent?._hidden) {
                style.push(`width: 0px`);
                style.push('display: none !important');
            } else if (el.width) {
                style.push(`width: ${el.width}px`);
                style.push(el.minWidth < el.with ? `min-width: ${el.minWidth}px` : `min-width: ${el.width}px`);
            } else {
                style.push(`flex: 1`);
                style.push(`min-width: ${el.minWidth}px`);
            }

            style.push(`justify-content: ${el.align}`);
            switch (el.align) {
                case 'end':
                case 'flex-end':
                case 'right': {
                    style.push('text-align: end');
                    break;
                }

                case 'start':
                case 'flex-start':
                case 'left': {
                    style.push('text-align: start');
                    break;
                }

                case 'center': {
                    style.push('text-align: center');
                    break;
                }
            }

            if (el.fixed) {
                const left = realColumns
                    .filter(x => x.index < el.index)
                    .map(x => x.width || x.node.offsetWidth)
                    .reduce((a, c) => { return a + c; }, 0);
                style.push(`left: ${left}px`);
            }

            if (el.action) {
                const right = realColumns
                    .filter(x => x.index > el.index)
                    .map(x => x.width || x.node.offsetWidth)
                    .reduce((a, c) => { return a + c; }, 0);
                style.push(`right: ${right}px`);
            }

            colStyles['.' + el.class] = style.join(';');
            colStyles['.headerEl.' + el.class] = el._isHeaderColumn
                ? `grid-area: ${el.class}; border-bottom: 1px solid var(--pl-grey-light)`
                : `grid-area: ${el.class}`;
        });

        let classes = ``;
        for (const cls in colStyles) {
            classes += cls + `{
                ${colStyles[cls]}
            }  `;
        }

        const matrix = Array.from({ length: maxRows }, () => Array(realColumns.length).fill(null));
        for (let i = maxRows - 1; i !== -1; i--) {
            for (let j = 0; j < realColumns.length; j++) {
                if (matrix[i + 1] === undefined) {
                    const childCol = this._columns.find(x => x.index === realColumns[j].index);
                    matrix[i][j] = { class: childCol.class, parentIndex: childCol.node._parentIndex };
                } else {
                    const el = this._columns.find(x => x.index === matrix[i + 1][j].parentIndex && x.node._row === i + 1);
                    if (el) {
                        matrix[i][j] = { class: el.class, parentIndex: el.node._parentIndex };
                    } else {
                        matrix[i][j] = { class: matrix[i + 1][j].class, parentIndex: matrix[i + 1][j].parentIndex };
                    }
                }
            }
        }
        const joined = matrix.map(x => x.map(y => y.class).join(' '));
        let areas = '';
        joined.forEach((el) => {
            areas += `"${el}"`;
        });

        classes += `#header {
            grid-template-columns: ${columns};    
            grid-template-rows: repeat(${maxRows}, auto);
            grid-template-areas: ${areas};
        }`;

        this.$.columnSizes.textContent = classes;

        setTimeout(() => {
            // необходимо для отрисовки грида во вкладках, которые изначально скрыты
            this.$.scroller.render();
            const colWidth = Array.from(this.root.querySelectorAll('.headerEl:not(.group)'))
                .map(x => x.offsetWidth)
                .reduce((a, c) => { return a + c; }, 0); // 2 borders
            if (this.$.header.scrollWidth > colWidth) {
                this.$.container.style.setProperty('--pl-action-column-position', 'absolute');
            } else {
                this.$.container.style.setProperty('--pl-action-column-position', 'sticky');
            }
        }, 0);
    }

    _init() {
        const columnsNodes = Array.from(this.querySelectorAll('pl-table-column'));
        const row = 1;
        const cols = columnsNodes.map((column, index) => {
            const info = {
                kind: column.kind,
                header: column.header,
                field: column.field,
                align: column.align,
                headerAlign: column.headerAlign,
                width: column.width ? parseInt(column.width) : null,
                minWidth: column.minWidth ? parseInt(column.minWidth) : 50,
                resizable: column.resizable,
                fixed: column.fixed || false,
                action: column.action || false,
                index,
                sortable: column.sortable,
                sort: column.sort,
                cellTemplate: column._cellTemplate,
                headerTemplate: column._headerTemplate,
                filterTemplate: column._filterTemplate,
                footerTemplate: column._footerTemplate,
                _isHeaderColumn: false,
                _hidden: column._hidden || column.hidden || false,
                node: column
            };

            if (column.sort) {
                this._changeColumnSort(column, column.sort, true);
            }

            info.class = 'column-' + index;

            column._index = info.index;
            column._row = column._row || row;

            const childColumns = Array.from(column.querySelectorAll(':scope > pl-table-column'));
            if (childColumns.length > 0) {
                info._isHeaderColumn = true;
                childColumns.forEach((el) => {
                    el._parentIndex = info.node._index;
                    el._row = info.node._row + 1;
                    el._hidden = info._hidden || el.hidden;
                });
            }
            return info;
        });

        if (cols.find(x => x.footerTemplate)) {
            this.$.container.style.setProperty('--pl-footer-display', 'flex');
        }

        this._columns = cols;
        requestAnimationFrame(() => {
            this.reactToResize();
        });
    }

    _filterCols(cols) {
        return cols.filter(x => !x._isHeaderColumn);
    }

    _isRowActive(row, selected) {
        return row === selected;
    }

    _changeColumnSort(column, sort, init) {
        const sorts = [...this.data.sorts || []];
        const ind = sorts.findIndex(item => item.field === column.field);
        if (ind >= 0) {
            sorts.splice(ind, 1);
        }

        const newSort = {
            field: column.field,
            sort
        };

        sorts.splice(0, 0, newSort);

        // если сортировка была указана в гриде, то выставляем ее по-тихому, без уведомления о мутации
        // иначе по клику на сортировку вызываем мутацию и перезагружаем датасет
        if (init) {
            this.data.sorts = sorts;
        } else {
            this.set('data.sorts', sorts);
        }
    }

    _changeColumnWidth(column, width, init) {
        if (!init) {
            this.set(`_columns.${column.index}.width`, width);
        }
    }

    _getSlotName(index) {
        return `column-${index}`;
    }

    async beforeSelect() {
        return true;
    }

    _itemSelected(item, selectedList) {
        return this.multiSelect && selectedList.filter(x => x === item).length > 0;
    }

    async _onRowClick(event) {
        if (event.model.row instanceof PlaceHolder) return;

        const res = await this.beforeSelect(event.model.row);
        if (!res) {
            return false;
        }

        // проверка, что выделенный элемент присутствует в списке видимых данных
        // необходимо при инлайн удалении строки
        if (event.model.row && this._vdata.includes(event.model.row)) {
            this.selected = event.model.row;
        }

        this.dispatchEvent(new CustomEvent('rowClick', { detail: { model: this.selected } }));
    }

    _onRowDblClick(event) {
        const ev = new CustomEvent('rowDblclick');
        ev.model = event.model;
        ev.originalEvent = event;
        this.dispatchEvent(ev);

        if (this.tree) {
            this._onTreeNodeClick(event);
        }
    }

    _onTreeNodeClick(event) {
        event.stopPropagation();
        if (event.model.row._haschildren === false) {
            return;
        }
        const idx = this.data.indexOf(event.model.row);
        this.set(`data.${idx}._opened`, !event.model.row._opened);
    }

    _getRowMargin(row, index) {
        if (index === 0 && (this.tree)) {
            return `margin-left: ${row._level * 16 + 'px'}`;
        }
        return 'display:none;';
    }

    _getTreeIcon(row) {
        if (!row._haschildren) {
            return '';
        }

        return row._opened ? 'chevron-down-s' : 'chevron-right-s';
    }

    _selectedObserver(val, old, mutation) {
        if (!val) {
            return;
        }

        if (this.tree) {
            const parents = [];

            while (val._pitem) {
                val = val._pitem;
                parents.push(val);
            }

            parents.reverse().forEach((el) => {
                if (!el._opened) {
                    const idx = this.data.indexOf(el);
                    this.set(`data.${idx}._opened`, true);
                }
            });
        }

        if (mutation.path !== 'selected') {
            this.forwardNotify(mutation, `selected`, `data.${this.data.indexOf(this.selected)}`);
        }
    }

    _treeModeChange() {
        if (this.data.control && this.tree) {
            this.data.control.treeMode = {
                hidValue: undefined,
                keyField: this.keyField,
                hidField: this.pkeyField,
                filterByHid: false
            };
        } else if (this.data.control) {
            delete this.data.control.treeMode;
        }
    }

    _onSelect(event) {
        const idx = this.selectedList.indexOf(event.model.row);
        if (idx === -1) {
            this.push('selectedList', event.model.row);
        } else {
            this.splice('selectedList', idx, 1);
        }
    }

    getTemplateForCell(tree, multiSelect, index) {
        if (index !== 0) {
            return undefined;
        }
        if (!this.tree && !this.multiSelect) {
            return undefined;
        }

        if (this.tree && !this.multiSelect) {
            return new Template(PlTable.treeFirstCellTemplate);
        }

        if (!this.tree && this.multiSelect) {
            return new Template(PlTable.checkboxCellTemplate);
        }

        if (this.tree && this.multiSelect) {
            return new Template(PlTable.treeFirstCellTemplate + PlTable.checkboxCellTemplate);
        }
    }

    _isPlaceholder(row) {
        return row instanceof PlaceHolder;
    }
}

customElements.define('pl-table', PlTable);
