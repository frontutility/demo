<?php

declare(strict_types=1);

namespace ConnectNKT\Helpers;

final class HtmlSanitizer
{
    private const TAGS = ['a','b','blockquote','br','code','div','em','h1','h2','h3','h4','hr','i','img','li','mark','ol','p','pre','span','strong','table','tbody','td','th','thead','tr','u','ul'];
    private const ATTRS = ['alt','class','colspan','href','rel','rowspan','src','target','title'];

    public static function clean(string $html): string
    {
        if (!class_exists(\DOMDocument::class)) {
            throw new \RuntimeException('DOMDocument is required for HTML sanitization.');
        }
        $dom = new \DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8"><div>' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        self::cleanChildren($dom->documentElement);
        $result = '';
        foreach ($dom->documentElement->childNodes as $child) {
            $result .= $dom->saveHTML($child);
        }
        return $result;
    }

    private static function cleanChildren(\DOMNode $parent): void
    {
        foreach (iterator_to_array($parent->childNodes) as $node) {
            if ($node->nodeType !== XML_ELEMENT_NODE) continue;
            $tag = strtolower($node->nodeName);
            if (!in_array($tag, self::TAGS, true)) {
                while ($node->firstChild) $parent->insertBefore($node->firstChild, $node);
                $parent->removeChild($node);
                // Promoted children are still untrusted. Walk them after promotion
                // so payloads nested below a disallowed wrapper cannot bypass the
                // attribute and URL checks.
                self::cleanChildren($parent);
                continue;
            }
            foreach (iterator_to_array($node->attributes ?? []) as $attribute) {
                $name = strtolower($attribute->name);
                if (str_starts_with($name, 'on') || $name === 'style' || !in_array($name, self::ATTRS, true) || (in_array($name, ['href','src'], true) && !self::safeUrl($attribute->value, $tag, $name))) {
                    $node->removeAttribute($attribute->name);
                }
            }
            if ($tag === 'a') $node->setAttribute('rel', 'noopener noreferrer');
            self::cleanChildren($node);
        }
    }

    private static function safeUrl(string $value, string $tag, string $attribute): bool
    {
        $value = trim($value);
        if ($attribute === 'src' && $tag === 'img' && preg_match('#^data:image/(?:png|jpe?g|gif|webp);base64,[a-zA-Z0-9+/=]+$#i', $value)) return strlen($value) < 131072;
        // Protocol-relative URLs (//attacker.example) are external URLs, not
        // relative paths, and must not be accepted by the sanitizer.
        return (bool) preg_match('#^(https?:|mailto:|tel:|/(?!/)|#)#i', $value);
    }
}
