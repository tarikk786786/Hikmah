import * as crypto from 'crypto';

export interface ExtractedContent {
  title: string;
  author?: string;
  publishedAt?: string;
  date?: string;
  language?: string;
  mainContent: string;
  markdown: string;
  headings: string[];
  links: string[];
  contentHash: string;
  chunks: Array<{ index: number; text: string; location?: string; pageNumber?: number }>;
  metadata?: {
    siteName?: string;
    description?: string;
    [key: string]: any;
  };
}

export class TrafilaturaExtractor {
  public extract(input: string | any): ExtractedContent & { extractedText?: string } {
    const raw = typeof input === 'string' ? input : input?.text || input?.html || input?.content || '';
    const res = TrafilaturaExtractor.extract(raw);
    return { ...res, extractedText: res.mainContent };
  }

  /**
   * Cleans raw HTML and extracts main article content, stripping boilerplate, scripts, and navigation.
   */
  public static extract(html: string): ExtractedContent {
    // 1. Extract Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Extracted Research Source';

    // 2. Extract Headings
    const headings: string[] = [];
    const headingMatches = html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
    for (const m of headingMatches) {
      if (m[1]) headings.push(m[1].trim());
    }

    // 3. Extract Links
    const links: string[] = [];
    const linkMatches = html.matchAll(/href=["'](https?:\/\/[^"'\s]+)["']/gi);
    for (const l of linkMatches) {
      if (l[1] && !links.includes(l[1])) links.push(l[1]);
    }

    // 4. Strip scripts, styles, nav, footer, and comments
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // 5. Convert paragraph & heading tags to formatted text
    cleaned = cleaned
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n* $1')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    const mainContent = cleaned || 'No readable text content extracted.';
    const contentHash = crypto.createHash('sha256').update(mainContent).digest('hex');

    // 6. Split into evidence chunks
    const paragraphs = mainContent.split(/\n\n+/).filter(p => p.trim().length > 30);
    const chunks = paragraphs.map((p, idx) => ({
      index: idx,
      text: p.trim(),
      location: `Paragraph ${idx + 1}`
    }));

    return {
      title,
      mainContent,
      markdown: mainContent,
      headings,
      links,
      contentHash,
      chunks: chunks.length > 0 ? chunks : [{ index: 0, text: mainContent, location: 'Full text' }]
    };
  }
}

export class DocumentExtractor {
  /**
   * Extracts text from document files (PDF/DOCX/TXT) preserving section metadata.
   */
  public static extractDocument(rawTextOrBuffer: Buffer | string, filename: string): ExtractedContent {
    const text = Buffer.isBuffer(rawTextOrBuffer) ? rawTextOrBuffer.toString('utf-8') : rawTextOrBuffer;
    const contentHash = crypto.createHash('sha256').update(text).digest('hex');

    const pages = text.split(/--- Page \d+ ---|\f/);
    const chunks: Array<{ index: number; text: string; location?: string; pageNumber?: number }> = [];

    pages.forEach((pageText, pIdx) => {
      const trimmed = pageText.trim();
      if (trimmed.length > 20) {
        chunks.push({
          index: chunks.length,
          text: trimmed,
          location: `Page ${pIdx + 1}`,
          pageNumber: pIdx + 1
        });
      }
    });

    return {
      title: filename,
      mainContent: text,
      markdown: text,
      headings: [`Document: ${filename}`],
      links: [],
      contentHash,
      chunks: chunks.length > 0 ? chunks : [{ index: 0, text, location: 'Document Content', pageNumber: 1 }]
    };
  }
}

export class ExtractionRouter {
  public static extract(input: { html?: string; text?: string; mimeType?: string; filename?: string }): ExtractedContent {
    if (input.html) {
      return TrafilaturaExtractor.extract(input.html);
    }
    return DocumentExtractor.extractDocument(input.text || '', input.filename || 'research_doc.txt');
  }
}
