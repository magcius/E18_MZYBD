
function assert(b: boolean, message: string = ""): asserts b {
    if (!b) {
        console.error(new Error().stack);
        throw new Error(`Assert fail: ${message}`);
    }
}

function removeAll(elem: HTMLElement): void {
    while (elem.firstChild !== null)
        elem.removeChild(elem.firstChild);
}

// We use row-major storage convention in this.
class Matrix extends Float32Array {
    constructor(public rows: number, public columns: number, r: Float32Array | null = null) {
        super(rows * columns);
        if (r !== null) {
            assert(r.length >= this.length);
            this.set(r, 0);
        }
    }

    public identity(): void {
        assert(this.rows === this.columns);
        for (let i = 0; i < this.rows; i++) {
            const r = new Float32Array(this.columns);
            r[i] = 1.0;
            this.setRow(i, r);
        }
    }

    public dot(b: Matrix): number {
        assert(this.length === b.length);
        let r = 0.0;
        for (let i = 0; i < this.length; i++)
            r += this[i] * b[i];
        return r;
    }

    public getV(rowIndex: number, columnIndex: number): number {
        return this[rowIndex * this.columns + columnIndex];
    }

    public setV(rowIndex: number, columnIndex: number, v: number): void {
        this[rowIndex * this.columns + columnIndex] = v;
    }

    public getRow(n: number): Matrix {
        assert(n < this.rows);
        const r = new Matrix(1, this.columns);
        for (let i = 0; i < this.columns; i++)
            r[i] = this.getV(n, i);
        return r;
    }

    public setRow(n: number, b: Float32Array): void {
        assert(n < this.rows && b.length >= this.columns);
        for (let i = 0; i < this.columns; i++)
            this.setV(n, i, b[i]);
    }

    public getColumn(n: number): Matrix {
        assert(n < this.columns);
        const r = new Matrix(this.rows, 1);
        for (let i = 0; i < this.rows; i++)
            r[i] = this.getV(i, n);
        return r;
    }

    public setColumn(n: number, b: Float32Array): void {
        assert(n < this.columns && b.length >= this.rows);
        for (let i = 0; i < this.rows; i++)
            this.setV(i, n, b[i]);
    }

    public transpose(): Matrix {
        const r = new Matrix(this.columns, this.rows);
        for (let i = 0; i < r.rows; i++)
            for (let j = 0; j < r.columns; j++)
                r.setV(i, j, this.getV(j, i));
        return r;
    }

    public canMultiply(b: Matrix): boolean {
        return this.columns === b.rows;
    }

    public mul(b: Matrix): Matrix {
        // Across times down.
        assert(this.canMultiply(b));
        const r = new Matrix(this.rows, b.columns);
        for (let i = 0; i < r.rows; i++)
            for (let j = 0; j < r.columns; j++)
                r.setV(i, j, this.getRow(i).dot(b.getColumn(j)));
        return r;
    }
}

class MatrixDisplay {
    public elem: HTMLElement;
    public highlightRow: HTMLElement;
    public highlightColumn: HTMLElement;
    public highlightCell: HTMLElement;
    public cells: HTMLElement[] = [];
    public onmousehover: ((i: number, j: number) => void) | null = null;

    constructor(private matrix: Matrix) {
        this.elem = document.createElement('div');
        this.elem.style.display = 'grid';

        this.highlightRow = this.highlight();
        this.highlightColumn = this.highlight();
        this.highlightCell = this.highlight();

        this.elem.style.padding = '2em';

        this.elem.appendChild(this.highlightRow);
        this.elem.appendChild(this.highlightColumn);
        this.elem.appendChild(this.highlightCell);

        const m = this.matrix;

        // The first and last column are for the large brackets.
        const leftSquareBracket = this.bracket('left-square-bracket');
        leftSquareBracket.style.gridArea = `1 / 1 / ${m.rows + 1} / 1`;
        this.elem.appendChild(leftSquareBracket);

        for (let i = 0; i < this.matrix.rows; i++) {
            for (let j = 0; j < this.matrix.columns; j++) {
                const cell = document.createElement('div');
                const row = i + 1, col = j + 2;
                cell.style.gridArea = `${row} / ${col}`;
                cell.style.textAlign = 'center';
                cell.style.placeSelf = 'stretch';
                cell.style.placeContent = 'center';
                cell.style.zIndex = '100';
                cell.onmouseover = () => { this.mouseHovered(i, j); };
                cell.onmouseout = () => {this.mouseHovered(-1, -1); }
                cell.textContent = `${this.matrix.getV(i, j)}`;
                this.cells.push(cell);
                this.elem.appendChild(cell);
            }
        }

        // The first and last column are for the large brackets.
        const rightSquareBracket = this.bracket('right-square-bracket');
        rightSquareBracket.style.gridArea = `1 / ${m.columns + 2} / ${m.rows + 1} / ${m.columns + 2}`;
        this.elem.appendChild(rightSquareBracket);
    }

    public update(): void {
        for (let i = 0; i < this.matrix.rows; i++) {
            for (let j = 0; j < this.matrix.columns; j++) {
                const cell = this.getCell(i, j);
                cell.textContent = `${this.matrix.getV(i, j)}`;
            }
        }
    }

    private highlight(): HTMLElement {
        const elem = document.createElement('div');
        elem.style.display = 'none';
        elem.style.borderRadius = '0.6em';
        return elem;
    }

    private bracket(shape: 'left-square-bracket' | 'right-square-bracket'): HTMLElement {
        // left square bracket right square bracket left square bracket right square bracket left square bracket right square bracket
        const elem = document.createElement('div');
        elem.style.border = '4px solid white';
        if (shape === 'left-square-bracket')
            elem.style.borderRight = 'none';
        else if (shape === 'right-square-bracket')
            elem.style.borderLeft = 'none';
        return elem;
    }

    private mouseHovered(i: number, j: number): void {
        if (this.onmousehover !== null)
            this.onmousehover(i, j);
    }

    public getCell(i: number, j: number): HTMLElement {
        return this.cells[i * this.matrix.columns + j];
    }

    public iterCells(f: (i: number, j: number) => void): void {
        for (let i = 0; i < this.matrix.rows; i++)
            for (let j = 0; j < this.matrix.columns; j++)
                f(i, j);
    }

    private setCellSelected(i: number, j: number, v: boolean): void {
        const cell = this.getCell(i, j);
        if (v) {
            cell.style.webkitTextStroke = `2px black`;
            cell.style.paintOrder = `stroke fill`;
            cell.style.textShadow = `0 0 10px black`;
        } else {
            cell.style.webkitTextStroke = '0';
        }
    }

    private setHighlight(elem: HTMLElement, mode: 'row' | 'column' | 'cell' | null, color: string, i: number = -1, j: number = -1): void {
        if (mode === null) {
            elem.style.display = 'none';
            return;
        }

        const m = this.matrix;
        elem.style.display = 'block';
        elem.style.backgroundColor = color;

        if (mode === 'row') {
            elem.style.gridArea = `${i + 1} / 2 / ${i + 1} / ${m.columns + 2}`;
            // elem.style.margin = '0.8em 0';
        } else if (mode === 'column') {
            elem.style.gridArea = `1 / ${i + 2} / ${m.rows + 1} / ${i + 2}`;
            // elem.style.margin = '0.8em 0';
        } else if (mode === 'cell') {
            elem.style.gridArea = `${i + 1} / ${j + 2} / ${i + 2} / ${j + 3}`;
        }
    }

    public setRowHighlight(rowIndex: number, color: string): void {
        this.setHighlight(this.highlightRow, rowIndex >= 0 ? 'row' : null, color, rowIndex);
        this.iterCells((i, j) => this.setCellSelected(i, j, i === rowIndex));
    }

    public setColumnHighlight(columnIndex: number, color: string): void {
        this.setHighlight(this.highlightColumn, columnIndex >= 0 ? 'column' : null, color, columnIndex);
        this.iterCells((i, j) => this.setCellSelected(i, j, j === columnIndex));
    }

    public setCellHighlight(rowIndex: number, columnIndex: number, color: string): void {
        this.setHighlight(this.highlightCell, rowIndex >= 0 ? 'cell' : null, color, rowIndex, columnIndex);
        this.iterCells((i, j) => this.setCellSelected(i, j, i === rowIndex && j === columnIndex));
    }
}

interface Base {
    elem: HTMLElement;
}

function textDiv(s: string): HTMLElement {
    const div = document.createElement('div');
    div.textContent = s;
    div.style.placeSelf = 'center';
    div.style.fontSize = '150%';
    return div;
}

const highlightRow    = `#cc2222a0`;
const highlightColumn = `#2222cca0`;
const highlightCell   = `#22cc22a0`;

class MatrixMulDiagram {
    public elem: HTMLElement;
    private displayA: MatrixDisplay;
    private displayB: MatrixDisplay;
    private displayC: MatrixDisplay;
    private explanationText: HTMLElement;

    constructor(a: Matrix, b: Matrix) {
        const c = a.mul(b);

        this.elem = document.createElement('div');
        this.elem.style.display = 'grid';
        // matrix x matrix = matrix
        this.elem.style.gridTemplateColumns = '1fr 2em 1fr 2em 1fr';

        this.displayA = new MatrixDisplay(a);
        this.elem.appendChild(this.displayA.elem);

        this.elem.appendChild(textDiv(`×`));

        this.displayB = new MatrixDisplay(b);
        this.elem.appendChild(this.displayB.elem);

        this.elem.appendChild(textDiv(`=`));

        this.displayC = new MatrixDisplay(c);
        this.elem.appendChild(this.displayC.elem);

        this.explanationText = document.createElement('div');
        this.explanationText.style.gridArea = `2 / 1 / 3 / 6`;
        this.explanationText.style.placeSelf = 'start center';
        this.explanationText.style.lineHeight = '1em';
        this.explanationText.style.visibility = 'hidden';
        this.explanationText.textContent = 'abc';
        this.elem.appendChild(this.explanationText);

        const setExplanationText = (i: number, j: number) => {
            if (i < 0) {
                this.explanationText.style.visibility = 'hidden';
                return;
            }

            const a_v = a.getRow(i);
            const b_v = b.getColumn(j);
            const c_v = c.getV(i, j);
            assert(a_v.length === b_v.length);
            let s: string[] = [];
            a_v.forEach((a_n, i) => {
                const b_n = b_v[i];
                s.push(`(${a_n} × ${b_n})`);
            });
            const e = `${s.join(' + ')} = ${c_v}`;
            this.explanationText.textContent = e;
            this.explanationText.style.visibility = 'visible';
        };

        const setSelectedCell = (i: number, j: number) => {
            if (i < 0 || j < 0) {
                i = 0; j = 0;
            }

            this.displayA.setRowHighlight(i, highlightRow);
            this.displayB.setColumnHighlight(j, highlightColumn);
            this.displayC.setCellHighlight(i, j, highlightCell);
            setExplanationText(i, j);
        };

        this.displayA.onmousehover = (i, j) => setSelectedCell(i, 0);
        this.displayB.onmousehover = (i, j) => setSelectedCell(0, j);
        this.displayC.onmousehover = (i, j) => setSelectedCell(i, j);

        setSelectedCell(-1, -1);
    }
}

class Diagram1 extends MatrixMulDiagram {
    constructor() {
        const a = new Matrix(2, 2);
        const b = new Matrix(2, 2);
        for (let i = 0; i < a.length; i++)
            a[i] = i + 1;
        for (let i = 0; i < b.length; i++)
            b[i] = a.length + i + 1;

        super(a, b);
    }
}

class Diagram2 extends MatrixMulDiagram {
    constructor() {
        const a = new Matrix(2, 4);
        const b = new Matrix(4, 3);
        for (let i = 0; i < a.length; i++)
            a[i] = i + 1;
        for (let i = 0; i < b.length; i++)
            b[i] = a.length + i + 1;

        super(a, b);
    }
}

class Diagram3 {
    public elem: HTMLElement;
    private displayA: MatrixDisplay;
    private displayB: MatrixDisplay;
    private displayC: MatrixDisplay;
    private explanationText: HTMLElement;

    constructor() {
        const a = new Matrix(4, 2);
        const b = new Matrix(3, 4);
        for (let i = 0; i < a.length; i++)
            a[i] = i + 1;
        for (let i = 0; i < b.length; i++)
            b[i] = a.length + i + 1;

        const c = new Matrix(2, 2);

        this.elem = document.createElement('div');
        this.elem.style.display = 'grid';
        // matrix x matrix = matrix
        this.elem.style.gridTemplateColumns = '1fr 2em 1fr 2em 1fr';

        this.displayA = new MatrixDisplay(a);
        this.elem.appendChild(this.displayA.elem);

        this.elem.appendChild(textDiv(`×`));

        this.displayB = new MatrixDisplay(b);
        this.elem.appendChild(this.displayB.elem);

        this.elem.appendChild(textDiv(`=`));

        this.displayC = new MatrixDisplay(c);
        this.displayC.iterCells((i, j) => {
            this.displayC.getCell(i, j).textContent = '…';
        });

        this.elem.appendChild(this.displayC.elem);
        this.explanationText = document.createElement('div');
        this.explanationText.style.gridArea = `2 / 1 / 3 / 6`;
        this.explanationText.style.placeSelf = 'start center';
        this.explanationText.style.lineHeight = '1em';
        this.explanationText.style.color = 'red';
        this.explanationText.textContent = `Error: Cannot multiply ${a.rows}x${a.columns} matrix with ${b.rows}x${b.columns} matrix`;
        this.explanationText.style.webkitTextStroke = `2px black`;
        this.explanationText.style.paintOrder = `stroke fill`;
        this.explanationText.style.textShadow = `0 0 10px black`;
        this.elem.appendChild(this.explanationText);

        this.displayA.onmousehover = (i, j) => { this.displayA.setRowHighlight(i, highlightRow); };
        this.displayB.onmousehover = (i, j) => { this.displayB.setColumnHighlight(j, highlightColumn); };
    }
}

class Diagram4 extends MatrixMulDiagram {
    constructor() {
        const a = new Matrix(4, 4);
        const b = new Matrix(4, 1);
        for (let i = 0; i < a.length; i++)
            a[i] = i + 1;
        for (let i = 0; i < b.length; i++)
            b[i] = i + 1;

        super(a, b);
    }
}

class Diagram5 extends MatrixMulDiagram {
    constructor() {
        const a = new Matrix(1, 4);
        const b = new Matrix(4, 4);
        for (let i = 0; i < a.length; i++)
            a[i] = i + 1;
        for (let i = 0; i < b.length; i++)
            b[i] = i + 1;

        super(a, b.transpose());
    }
}

class Diagram6 {
    public elem: HTMLElement;
    private displayA: MatrixDisplay;
    private displayB: MatrixDisplay;

    constructor() {
        const a = new Matrix(3, 4);
        for (let i = 0; i < a.length; i++)
            a[i] = i + 1;
        const b = a.transpose();

        this.elem = document.createElement('div');
        this.elem.style.display = 'grid';
        // matrix T matrix
        this.elem.style.gridTemplateColumns = '1fr 2em 1fr';

        this.displayA = new MatrixDisplay(a);
        this.elem.appendChild(this.displayA.elem);

        this.displayA.elem.style.position = 'relative';
        const T = textDiv('T');
        T.style.fontStyle = 'italic';
        T.style.position = 'absolute';
        T.style.fontSize = '200%';
        T.style.top = '0.5em';
        T.style.right = '0.2em';
        this.displayA.elem.appendChild(T);

        this.elem.appendChild(textDiv(`=`));

        this.displayB = new MatrixDisplay(b);
        this.elem.appendChild(this.displayB.elem);

        this.displayB.highlightRow.style.zIndex = '5';

        this.displayA.onmousehover = (i, j) => {
            this.displayA.setRowHighlight(i, highlightRow);
            this.displayA.setColumnHighlight(j, highlightColumn);

            this.displayB.setColumnHighlight(i, highlightRow);
            this.displayB.setRowHighlight(j, highlightColumn);
        };
        this.displayB.onmousehover = (i, j) => {
            this.displayA.setRowHighlight(j, highlightRow);
            this.displayA.setColumnHighlight(i, highlightColumn);

            this.displayB.setColumnHighlight(j, highlightRow);
            this.displayB.setRowHighlight(i, highlightColumn);
        };
    }
}

class Diagram7 {
    public elem: HTMLElement;

    constructor() {
        this.elem = document.createElement('div');
        this.elem.style.display = 'grid';
        // code = matrix
        this.elem.style.gridTemplateColumns = '1fr 2em 1fr';

        const p = document.createElement('div');
        p.style.placeSelf = 'center start';
        p.style.marginLeft = `3em`;
        p.style.whiteSpace = `pre`;
        p.style.fontSize = `110%`;
        p.style.lineHeight = '1.5em';
        p.style.position = 'relative';
        this.elem.appendChild(p);

        p.querySelectorAll('span').forEach((elem) => {
            elem.style.padding = `0.4em`;
        });

        const matrix = new Matrix(3, 4);

        const highlights: HTMLElement[] = [];
        const createHighlight = (index: number, left: number, top: number, width: number, edge: 'left' | 'right' | null = null): HTMLElement => {
            const h = document.createElement('div');
            h.style.position = 'absolute';
            h.style.left = `${left}ch`;
            h.style.top = `${top}lh`;
            h.style.width = `${width}ch`;
            h.style.height = `1lh`;
            h.style.padding = `0.2em`;
            h.style.marginTop = `-0.1em`;
            h.style.marginLeft = `-0.2em`;
            h.style.borderRadius = `0.4em`;
            if (edge === 'left') {
                h.style.borderTopLeftRadius = '0';
                h.style.borderBottomLeftRadius = '0';
            } else if (edge === 'right') {
                h.style.borderTopRightRadius = '0';
                h.style.borderBottomRightRadius = '0';
            }
            h.dataset.index = `${index}`;
            highlights.push(h);
            p.appendChild(h);
            return h;
        };

        createHighlight(0, 4, 2, 11);
        createHighlight(1, 4, 3, 11);
        createHighlight(2, 4, 4, 14);

        const code = document.createElement('div');
        code.textContent = `// row-major packing\nfloat m[] = {\n    1, 2, 3, 4,\n    5, 6, 7, 8,\n    9, 10, 11, 12,\n};`;
        code.style.isolation = `isolate`;
        p.appendChild(code);

        const setSelected = (i, j) => {
            highlights.forEach((elem) => {
                if (elem.dataset.index === `${i}`) {
                    elem.style.backgroundColor = highlightRow;
                } else {
                    elem.style.backgroundColor = 'inherit';
                }
            });

            matrixDisplay.setRowHighlight(i, highlightRow);
        };

        this.elem.appendChild(textDiv(`=`));

        for (let i = 0; i < matrix.length; i++)
            matrix[i] = 1 + i;
        const matrixDisplay = new MatrixDisplay(matrix);
        matrixDisplay.onmousehover = setSelected;
        this.elem.appendChild(matrixDisplay.elem);
    }
}

class Diagram8 {
    public elem: HTMLElement;

    constructor() {
        this.elem = document.createElement('div');
        this.elem.style.display = 'grid';
        // code = matrix
        this.elem.style.gridTemplateColumns = '1fr 2em 1fr';

        const p = document.createElement('div');
        p.style.placeSelf = 'center start';
        p.style.marginLeft = `3em`;
        p.style.whiteSpace = `pre`;
        p.style.fontSize = `110%`;
        p.style.lineHeight = '1.5em';
        p.style.position = 'relative';
        this.elem.appendChild(p);

        p.querySelectorAll('span').forEach((elem) => {
            elem.style.padding = `0.4em`;
        });

        const matrix = new Matrix(4, 3);

        const highlights: HTMLElement[] = [];
        const createHighlight = (index: number, left: number, top: number, width: number, edge: 'left' | 'right' | null = null): HTMLElement => {
            const h = document.createElement('div');
            h.style.position = 'absolute';
            h.style.left = `${left}ch`;
            h.style.top = `${top}lh`;
            h.style.width = `${width}ch`;
            h.style.height = `1lh`;
            h.style.padding = `0.2em`;
            h.style.marginTop = `-0.1em`;
            h.style.marginLeft = `-0.2em`;
            h.style.borderRadius = `0.4em`;
            if (edge === 'left') {
                h.style.borderTopLeftRadius = '0';
                h.style.borderBottomLeftRadius = '0';
            } else if (edge === 'right') {
                h.style.borderTopRightRadius = '0';
                h.style.borderBottomRightRadius = '0';
            }
            h.dataset.index = `${index}`;
            highlights.push(h);
            p.appendChild(h);
            return h;
        };

        createHighlight(0, 4, 2, 8);
        createHighlight(1, 13, 2, 2 - 0.2, 'right');
        createHighlight(1, 4, 3, 5, 'left');
        createHighlight(2, 10, 3, 5 - 0.2, 'right');
        createHighlight(2, 4, 4, 2, 'left');
        createHighlight(3, 7, 4, 11);

        const code = document.createElement('div');
        code.textContent = `// column-major packing\nfloat m[] = {\n    1, 2, 3, 4,\n    5, 6, 7, 8,\n    9, 10, 11, 12,\n};`;
        code.style.isolation = `isolate`;
        p.appendChild(code);

        const setSelected = (i, j) => {
            highlights.forEach((elem) => {
                if (elem.dataset.index === `${j}`) {
                    elem.style.backgroundColor = highlightColumn;
                } else {
                    elem.style.backgroundColor = 'inherit';
                }
            });

            matrixDisplay.setColumnHighlight(j, highlightColumn);
        };

        this.elem.appendChild(textDiv(`=`));

        for (let i = 0; i < matrix.length; i++)
            matrix[i] = 1 + i;
        const matrixDisplay = new MatrixDisplay(matrix.transpose());
        matrixDisplay.onmousehover = setSelected;
        this.elem.appendChild(matrixDisplay.elem);
    }
}

type Factory = new () => Base;

class Main {
    public elem: HTMLElement;
    private factory: Factory[] = [];

    constructor() {
        this.elem = document.createElement('div');
        this.elem.style.backgroundColor = '#445';
        this.elem.style.font = '18pt monospace';
        this.elem.style.color = 'white';
        this.elem.style.display = 'grid';
        this.elem.style.minHeight = `100vh`;

        document.body.appendChild(this.elem);

        this.factory.push(Diagram1);
        this.factory.push(Diagram2);
        this.factory.push(Diagram3);
        this.factory.push(Diagram4);
        this.factory.push(Diagram5);
        this.factory.push(Diagram6);
        this.factory.push(Diagram7);
        this.factory.push(Diagram8);

        this.setFromHash();
        window.onhashchange = () => this.setFromHash();
    }

    private setFromHash(): void {
        const hash = window.location.hash.slice(1);
        const idx = parseInt(hash, 10) - 1;
        if (this.factory[idx] !== undefined) {
            this.set(this.factory[idx]);
        } else {
            this.set(this.factory[0]);
            document.addEventListener('keydown', (e) => {
                for (let i = 0; i < this.factory.length; i++) {
                    if (e.code === `Digit${i + 1}`)
                        this.set(this.factory[i]);
                }
            }, { capture: true });
        }
    }

    public set(factory: Factory): void {
        removeAll(this.elem);
        const b = new factory();
        this.elem.appendChild(b.elem);
    }
}

function main() {
    const main = new Main();
    (window as any).main = main;
}

main();
