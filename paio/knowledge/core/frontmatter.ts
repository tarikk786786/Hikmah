/**
 * Simple frontmatter parser and stringifier
 * Mimics Obsidian's YAML frontmatter block `---`
 */

export interface ParsedDocument {
  properties: Record<string, any>;
  content: string;
}

export class FrontmatterParser {
  /**
   * Parses an Obsidian-style markdown document with YAML frontmatter
   */
  public static parse(markdown: string): ParsedDocument {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = markdown.match(frontmatterRegex);

    let properties: Record<string, any> = {};
    let content = markdown;

    if (match && match[1]) {
      const yamlStr = match[1];
      properties = this.parseSimpleYaml(yamlStr);
      content = markdown.slice(match[0].length);
    }

    return { properties, content };
  }

  /**
   * Serializes properties back into an Obsidian frontmatter block
   */
  public static stringify(properties: Record<string, any>, content: string): string {
    if (Object.keys(properties).length === 0) {
      return content;
    }

    const yamlLines = ['---'];
    for (const [key, value] of Object.entries(properties)) {
      if (Array.isArray(value)) {
        yamlLines.push(`${key}:`);
        value.forEach(item => yamlLines.push(`  - ${item}`));
      } else {
        yamlLines.push(`${key}: ${value}`);
      }
    }
    yamlLines.push('---');
    yamlLines.push('');
    
    return yamlLines.join('\n') + content;
  }

  private static parseSimpleYaml(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yaml.split('\n');
    let currentArrayKey: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('- ') && currentArrayKey) {
        result[currentArrayKey].push(trimmed.substring(2).trim());
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();

        if (!value) {
          currentArrayKey = key;
          result[key] = [];
        } else {
          currentArrayKey = null;
          // Clean up quotes
          const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
          result[key] = cleanValue;
        }
      }
    }
    return result;
  }
}
