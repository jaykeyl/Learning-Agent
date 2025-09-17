export type ParsedHeading = {
    line: number;        
    level: number;       
    title: string;
};

export class HeadingParser {
    private static numHeading = /^(\d+(?:\.\d+)*)[)\.\-]?\s+(.+)$/;
    private static mdHeading  = /^(#{1,6})\s+(.+)$/;
    private static esHeading  = /^(Cap[ií]tulo|Unidad|Tema)\s+(\d+)[\.:]?\s+(.+)$/i;

    static parse(text: string): ParsedHeading[] {
        const lines = text.split(/\r?\n/);
        const out: ParsedHeading[] = [];

        for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) continue;

        let m = raw.match(this.numHeading);
        if (m) { out.push({ line: i, level: m[1].split('.').length, title: m[2].trim() }); continue; }

        m = raw.match(this.mdHeading);
        if (m) { out.push({ line: i, level: m[1].length, title: m[2].trim() }); continue; }

        m = raw.match(this.esHeading);
        if (m) { out.push({ line: i, level: 1, title: `${m[1]} ${m[2]}: ${m[3]}`.trim() }); continue; }
        }
        return out;
    }

    static sliceSection(text: string, headings: ParsedHeading[], startLine: number, level: number): string {
        const lines = text.split(/\r?\n/);

        let endLine = lines.length; 
        for (const h of headings) {
        if (h.line <= startLine) continue;
        if (h.level <= level) { endLine = h.line; break; }
        }

        const segment = lines.slice(startLine, endLine).join('\n').trim();
        return segment;
    }
}
