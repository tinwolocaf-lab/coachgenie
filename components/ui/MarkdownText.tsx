import React, { useMemo } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type MarkdownBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'unordered_list'; items: string[] }
  | { type: 'ordered_list'; items: string[]; startAt: number }
  | { type: 'blockquote'; text: string }
  | { type: 'heading'; text: string; level: HeadingLevel }
  | { type: 'code'; text: string; language?: string }
  | { type: 'horizontal_rule' };

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'emphasis'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; url: string };

interface MarkdownTextProps {
  content: string;
  textStyle: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  accentColor: string;
  mutedColor?: string;
}

const UNORDERED_LIST_REGEX = /^\s*[-*+]\s+(.*)$/;
const ORDERED_LIST_REGEX = /^\s*(\d+)\.\s+(.*)$/;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const BLOCKQUOTE_REGEX = /^\s*>\s?(.*)$/;
const HR_REGEX = /^\s*([-*_])\1{2,}\s*$/;
const CODE_FENCE_REGEX = /^\s*```(\w+)?\s*$/;
const INLINE_TOKEN_REGEX = /(\[[^\]]+\]\((?:https?:\/\/|mailto:|tel:)[^)]+\)|\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\*[^*\n]+?\*|_[^_\n]+?_)/g;
const BLOCK_CACHE_LIMIT = 200;
const INLINE_CACHE_LIMIT = 500;
const markdownBlockCache = new Map<string, MarkdownBlock[]>();
const inlineTokenCache = new Map<string, InlineToken[]>();

function setCachedValue<T>(cache: Map<string, T>, key: string, value: T, limit: number): void {
  cache.set(key, value);
  if (cache.size <= limit) {
    return;
  }

  const oldestKey = cache.keys().next().value;
  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

function isBlockBoundary(line: string): boolean {
  return (
    CODE_FENCE_REGEX.test(line) ||
    HEADING_REGEX.test(line) ||
    UNORDERED_LIST_REGEX.test(line) ||
    ORDERED_LIST_REGEX.test(line) ||
    BLOCKQUOTE_REGEX.test(line) ||
    HR_REGEX.test(line)
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const cached = markdownBlockCache.get(content);
  if (cached) {
    return cached;
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codeFenceMatch = trimmed.match(CODE_FENCE_REGEX);
    if (codeFenceMatch) {
      const language = codeFenceMatch[1];
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !CODE_FENCE_REGEX.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        type: 'code',
        text: codeLines.join('\n'),
        language,
      });
      continue;
    }

    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as HeadingLevel,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (HR_REGEX.test(trimmed)) {
      blocks.push({ type: 'horizontal_rule' });
      index += 1;
      continue;
    }

    if (BLOCKQUOTE_REGEX.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteMatch = lines[index].match(BLOCKQUOTE_REGEX);
        if (!quoteMatch) break;
        quoteLines.push(quoteMatch[1].trim());
        index += 1;
      }
      blocks.push({
        type: 'blockquote',
        text: quoteLines.join('\n').trim(),
      });
      continue;
    }

    const unorderedMatch = line.match(UNORDERED_LIST_REGEX);
    if (unorderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(UNORDERED_LIST_REGEX);
        if (!itemMatch) break;
        items.push(itemMatch[1].trim());
        index += 1;
      }
      blocks.push({
        type: 'unordered_list',
        items,
      });
      continue;
    }

    const orderedMatch = line.match(ORDERED_LIST_REGEX);
    if (orderedMatch) {
      const items: string[] = [];
      const startAt = Number(orderedMatch[1]);
      while (index < lines.length) {
        const itemMatch = lines[index].match(ORDERED_LIST_REGEX);
        if (!itemMatch) break;
        items.push(itemMatch[2].trim());
        index += 1;
      }
      blocks.push({
        type: 'ordered_list',
        items,
        startAt: Number.isFinite(startAt) ? startAt : 1,
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const currentLine = lines[index];
      if (!currentLine.trim()) break;
      if (isBlockBoundary(currentLine)) break;
      paragraphLines.push(currentLine.trimEnd());
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paragraphLines.join('\n').trim(),
      });
      continue;
    }

    index += 1;
  }

  setCachedValue(markdownBlockCache, content, blocks, BLOCK_CACHE_LIMIT);
  return blocks;
}

function parseInlineTokens(text: string): InlineToken[] {
  const cached = inlineTokenCache.get(text);
  if (cached) {
    return cached;
  }

  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_TOKEN_REGEX)) {
    const token = match[0];
    const start = match.index ?? 0;
    const end = start + token.length;

    if (start > cursor) {
      tokens.push({ type: 'text', value: text.slice(cursor, start) });
    }

    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      tokens.push({ type: 'strong', value: token.slice(2, -2) });
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      tokens.push({ type: 'emphasis', value: token.slice(1, -1) });
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push({ type: 'code', value: token.slice(1, -1) });
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        tokens.push({
          type: 'link',
          label: linkMatch[1],
          url: linkMatch[2],
        });
      } else {
        tokens.push({ type: 'text', value: token });
      }
    } else {
      tokens.push({ type: 'text', value: token });
    }

    cursor = end;
  }

  if (cursor < text.length) {
    tokens.push({ type: 'text', value: text.slice(cursor) });
  }

  setCachedValue(inlineTokenCache, text, tokens, INLINE_CACHE_LIMIT);
  return tokens;
}

function getHeadingMultiplier(level: HeadingLevel): number {
  switch (level) {
    case 1: return 1.4;
    case 2: return 1.3;
    case 3: return 1.2;
    case 4: return 1.1;
    case 5: return 1.05;
    default: return 1;
  }
}

export function MarkdownText({
  content,
  textStyle,
  containerStyle,
  accentColor,
  mutedColor = 'rgba(0,0,0,0.55)',
}: MarkdownTextProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);
  const resolvedTextStyle = StyleSheet.flatten(textStyle) || {};

  const inlineTextStyle: TextStyle = {
    ...resolvedTextStyle,
    flexShrink: 1,
  };

  const inlineCodeTextStyle: TextStyle = {
    ...inlineTextStyle,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    backgroundColor: 'rgba(0,0,0,0.08)',
  };

  const renderInlineText = (text: string, keyPrefix: string, depth = 0): React.ReactNode[] => {
    const tokens = parseInlineTokens(text);

    return tokens.map((token, tokenIndex) => {
      const key = `${keyPrefix}-${tokenIndex}`;

      switch (token.type) {
        case 'strong':
          return (
            <Text key={key} style={[inlineTextStyle, styles.strongText]}>
              {depth < 4 ? renderInlineText(token.value, `${key}-s`, depth + 1) : token.value}
            </Text>
          );
        case 'emphasis':
          return (
            <Text key={key} style={[inlineTextStyle, styles.emphasisText]}>
              {depth < 4 ? renderInlineText(token.value, `${key}-e`, depth + 1) : token.value}
            </Text>
          );
        case 'code':
          return (
            <Text key={key} style={inlineCodeTextStyle}>
              {token.value}
            </Text>
          );
        case 'link':
          return (
            <Text
              key={key}
              style={[inlineTextStyle, styles.linkText, { color: accentColor }]}
              onPress={() => {
                void Linking.openURL(token.url).catch(() => undefined);
              }}
            >
              {token.label}
            </Text>
          );
        case 'text':
        default:
          return <Text key={key} style={inlineTextStyle}>{token.value}</Text>;
      }
    });
  };

  return (
    <View style={containerStyle}>
      {blocks.map((block, blockIndex) => {
        const isLastBlock = blockIndex === blocks.length - 1;
        const blockSpacing = !isLastBlock ? styles.blockSpacing : null;

        switch (block.type) {
          case 'heading': {
            const multiplier = getHeadingMultiplier(block.level);
            const headingFontSize = typeof inlineTextStyle.fontSize === 'number'
              ? inlineTextStyle.fontSize * multiplier
              : undefined;

            return (
              <Text
                key={`heading-${blockIndex}`}
                style={[
                  inlineTextStyle,
                  styles.strongText,
                  headingFontSize ? { fontSize: headingFontSize } : null,
                  blockSpacing,
                ]}
              >
                {renderInlineText(block.text, `heading-${blockIndex}`)}
              </Text>
            );
          }
          case 'paragraph':
            return (
              <Text key={`paragraph-${blockIndex}`} style={[inlineTextStyle, blockSpacing]}>
                {renderInlineText(block.text, `paragraph-${blockIndex}`)}
              </Text>
            );
          case 'blockquote':
            return (
              <View
                key={`blockquote-${blockIndex}`}
                style={[
                  styles.blockquote,
                  { borderLeftColor: accentColor, backgroundColor: 'rgba(0,0,0,0.04)' },
                  blockSpacing,
                ]}
              >
                <Text style={[inlineTextStyle, { color: mutedColor }]}>
                  {renderInlineText(block.text, `blockquote-${blockIndex}`)}
                </Text>
              </View>
            );
          case 'unordered_list':
            return (
              <View key={`unordered-${blockIndex}`} style={blockSpacing}>
                {block.items.map((item, itemIndex) => (
                  <View key={`unordered-${blockIndex}-${itemIndex}`} style={styles.listRow}>
                    <Text style={[inlineTextStyle, styles.listMarker, { color: accentColor }]}>•</Text>
                    <Text style={[inlineTextStyle, styles.listText]}>
                      {renderInlineText(item, `unordered-${blockIndex}-${itemIndex}`)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'ordered_list':
            return (
              <View key={`ordered-${blockIndex}`} style={blockSpacing}>
                {block.items.map((item, itemIndex) => (
                  <View key={`ordered-${blockIndex}-${itemIndex}`} style={styles.listRow}>
                    <Text style={[inlineTextStyle, styles.listMarker, { color: accentColor }]}>
                      {`${block.startAt + itemIndex}.`}
                    </Text>
                    <Text style={[inlineTextStyle, styles.listText]}>
                      {renderInlineText(item, `ordered-${blockIndex}-${itemIndex}`)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'code':
            return (
              <View key={`code-${blockIndex}`} style={[styles.codeBlock, blockSpacing]}>
                <Text style={[inlineCodeTextStyle, styles.codeBlockText]}>
                  {block.text}
                </Text>
              </View>
            );
          case 'horizontal_rule':
            return (
              <View
                key={`rule-${blockIndex}`}
                style={[styles.horizontalRule, { backgroundColor: 'rgba(0,0,0,0.12)' }, blockSpacing]}
              />
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blockSpacing: {
    marginBottom: 14,
  },
  strongText: {
    fontWeight: '700',
  },
  emphasisText: {
    fontStyle: 'italic',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  listMarker: {
    minWidth: 24,
    textAlign: 'right',
    marginRight: 8,
  },
  listText: {
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  codeBlock: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  codeBlockText: {
    fontSize: 14,
    lineHeight: 20,
  },
  horizontalRule: {
    height: 1,
    width: '100%',
  },
});

export default MarkdownText;
