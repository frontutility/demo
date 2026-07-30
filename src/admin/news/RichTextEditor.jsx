import { useEffect, useRef, useState } from "react";
import { 
  FiBold, FiCode, FiImage, FiItalic, FiLink, FiList, 
  FiMessageSquare, FiMinus, FiRotateCcw, FiRotateCw, 
  FiUnderline, FiAlignLeft, FiAlignCenter, 
  FiAlignRight, FiAlignJustify, FiChevronDown,
  FiCheck, FiX
} from "react-icons/fi";

function execCommand(command, value = null) {
  try {
    document.execCommand(command, false, value);
    return true;
  } catch {
    return false;
  }
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  readOnly = false, 
  placeholder = "Write content here...",
  minHeight = "280px"
}) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [fontSize, setFontSize] = useState("16px");
  const [textColor, setTextColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#ffeb3b");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const isUpdatingFromProps = useRef(false);

  // Initialize editor content - ONLY ONCE on mount
  useEffect(() => {
    if (editorRef.current && value !== undefined && value !== null) {
      const currentHtml = editorRef.current.innerHTML;
      const newHtml = String(value || "");
      
      // Only update if content actually changed and editor is not focused
      if (currentHtml !== newHtml && !isFocused) {
        isUpdatingFromProps.current = true;
        editorRef.current.innerHTML = newHtml || '';
        setInternalValue(newHtml || '');
        isUpdatingFromProps.current = false;
      }
    }
  }, [value]); // Only depend on value

  // Ensure editor has content when empty
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const currentHtml = editorRef.current.innerHTML;
      if (currentHtml === '' || currentHtml === '<br>') {
        editorRef.current.innerHTML = '';
      }
    }
  }, []);

  function emitChange() {
    if (!editorRef.current || isUpdatingFromProps.current) return;
    const html = editorRef.current.innerHTML;
    // Don't update if it's just an empty paragraph or line break
    if (html === '<br>' || html === '<div><br></div>' || html === '') {
      setInternalValue('');
      onChange?.('');
      return;
    }
    setInternalValue(html);
    onChange?.(html);
  }

  function handleCommand(command, commandValue = null) {
    if (readOnly) return;
    editorRef.current?.focus();
    execCommand(command, commandValue);
    // Small delay to let execCommand complete
    setTimeout(emitChange, 10);
  }

  function handleFontSize(size) {
    if (readOnly) return;
    editorRef.current?.focus();
    
    try {
      // Try using execCommand first
      if (size === "12px") {
        document.execCommand('fontSize', false, '1');
      } else if (size === "16px") {
        document.execCommand('fontSize', false, '3');
      } else if (size === "20px") {
        document.execCommand('fontSize', false, '5');
      } else {
        // For custom sizes
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        if (range.collapsed) {
          const span = document.createElement('span');
          span.style.fontSize = size;
          span.textContent = ' ';
          range.insertNode(span);
          range.setStartAfter(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          const span = document.createElement('span');
          span.style.fontSize = size;
          const fragment = range.extractContents();
          span.appendChild(fragment);
          range.insertNode(span);
          range.selectNodeContents(span);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } catch (error) {
      console.warn('Font size command failed:', error);
    }
    setTimeout(emitChange, 10);
  }

  function handleTextColor(color) {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand('foreColor', false, color);
    setTextColor(color);
    setShowColorPicker(false);
    setTimeout(emitChange, 10);
  }

  function handleHighlight(color) {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand('hiliteColor', false, color);
    setHighlightColor(color);
    setShowHighlightPicker(false);
    setTimeout(emitChange, 10);
  }

  function handleLinkInsert() {
    if (readOnly || !linkUrl) return;
    editorRef.current?.focus();
    
    let url = linkUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    document.execCommand('createLink', false, url);
    setLinkUrl("");
    setShowLinkInput(false);
    setTimeout(emitChange, 10);
  }

  function handleImage() {
    if (readOnly) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      const files = input.files;
      if (!files || !files.length) return;
      
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          if (result) {
            editorRef.current?.focus();
            document.execCommand('insertImage', false, result);
            setTimeout(emitChange, 10);
          }
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  }

  function handleClearFormatting() {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand('removeFormat', false, null);
    setTimeout(emitChange, 10);
  }

  function handleKeyDown(e) {
    // Handle Enter key
    if (e.key === 'Enter') {
      setTimeout(emitChange, 10);
    }
  }

 const fontSizeOptions = [
  { label: "Small", value: "12px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "Heading 1", value: "32px" },
  { label: "Heading 2", value: "24px" },
  { label: "Heading 3", value: "22px" }, // Changed from 20px to 22px
  { label: "Heading 4", value: "18px" },
];

  const colorPresets = [
    "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef",
    "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff",
    "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3",
    "#c9daf8", "#d5a6bd", "#b6d7a8", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8",
  ];

  const highlightPresets = [
    "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", 
    "#4caf50", "#2196f3", "#9c27b0", "#e91e63",
    "#fce4ec", "#f3e5f5", "#e8f5e9", "#e3f2fd",
    "#fff3e0", "#fbe9e7", "#e0f7fa", "#f1f8e9",
  ];

  return (
    <div className={`rich-text-editor-wrapper ${readOnly ? "read-only" : ""}`}>
      <style>{`
        .rich-text-editor-wrapper {
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-solid, #ffffff);
          transition: all 0.2s ease;
        }

        .rich-text-editor-wrapper:focus-within {
          border-color: rgba(var(--brand-2-rgb, 59, 130, 246), 0.4);
          box-shadow: 0 0 0 4px rgba(var(--brand-2-rgb, 59, 130, 246), 0.08);
        }

        .rich-text-editor-wrapper.read-only {
          border-color: var(--line, #e2e8f0);
          box-shadow: none;
        }

        .rich-text-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: var(--bg-secondary, #f8fafc);
          border-bottom: 1px solid var(--line, #e2e8f0);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0 4px;
          border-right: 1px solid var(--line, #e2e8f0);
        }

        .toolbar-group:last-child {
          border-right: none;
        }

        .toolbar-group-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-right: 4px;
          padding: 0 4px;
        }

        .rich-text-toolbar button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--text-secondary, #475569);
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 14px;
          min-width: 32px;
          min-height: 32px;
        }

        .rich-text-toolbar button:hover {
          background: rgba(var(--brand-2-rgb, 59, 130, 246), 0.08);
          color: var(--brand-2, #3b82f6);
        }

        .rich-text-toolbar button:active {
          transform: scale(0.95);
        }

        .rich-text-toolbar button.active {
          background: rgba(var(--brand-2-rgb, 59, 130, 246), 0.12);
          color: var(--brand-2, #3b82f6);
        }

        .rich-text-toolbar select {
          padding: 4px 28px 4px 10px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 6px;
          background: var(--bg-solid, #ffffff);
          color: var(--text, #0f172a);
          font-size: 13px;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
        }

        .rich-text-toolbar select:focus {
          outline: none;
          border-color: rgba(var(--brand-2-rgb, 59, 130, 246), 0.4);
        }

        .color-picker-wrapper {
          position: relative;
          display: inline-flex;
        }

        .color-picker-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: var(--bg-solid, #ffffff);
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          z-index: 100;
          min-width: 200px;
          max-width: 220px;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 4px;
        }

        .color-picker-dropdown .color-option {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .color-picker-dropdown .color-option:hover {
          transform: scale(1.1);
          border-color: var(--text, #0f172a);
        }

        .color-picker-dropdown .color-option.selected {
          border-color: var(--text, #0f172a);
          box-shadow: 0 0 0 2px var(--bg-solid, #ffffff), 0 0 0 4px var(--brand-2, #3b82f6);
        }

        .color-picker-trigger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px 4px 4px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 6px;
          background: var(--bg-solid, #ffffff);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .color-picker-trigger:hover {
          border-color: rgba(var(--brand-2-rgb, 59, 130, 246), 0.3);
        }

        .color-picker-trigger .color-preview {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 1px solid var(--line, #e2e8f0);
        }

        .link-input-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: var(--bg-solid, #ffffff);
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 6px;
        }

        .link-input-wrapper input {
          border: none;
          background: transparent;
          padding: 4px 8px;
          font-size: 13px;
          color: var(--text, #0f172a);
          min-width: 180px;
          outline: none;
        }

        .link-input-wrapper input:focus {
          outline: none;
        }

        .link-input-wrapper button {
          padding: 4px 8px;
        }

        .rich-text-editor {
          padding: 16px 20px;
          min-height: ${minHeight};
          max-height: 600px;
          overflow-y: auto;
          outline: none;
          color: var(--text, #0f172a);
          font-size: 16px;
          line-height: 1.8;
          background: var(--bg-solid, #ffffff);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          cursor: text;
        }

        .rich-text-editor:empty::before {
          content: attr(data-placeholder);
          color: var(--text-secondary, #94a3b8);
          pointer-events: none;
        }

        .rich-text-editor:focus {
          outline: none;
        }

        .rich-text-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .rich-text-editor h2 {
          font-size: 28px;
          font-weight: 700;
          margin: 16px 0 8px;
        }

        .rich-text-editor h3 {
          font-size: 22px;
          font-weight: 600;
          margin: 14px 0 6px;
        }

        .rich-text-editor blockquote {
          border-left: 4px solid var(--brand-2, #3b82f6);
          padding: 8px 16px;
          margin: 12px 0;
          background: rgba(var(--brand-2-rgb, 59, 130, 246), 0.04);
          border-radius: 0 8px 8px 0;
          color: var(--text-secondary, #475569);
        }

        .rich-text-editor ul,
        .rich-text-editor ol {
          margin: 8px 0;
          padding-left: 24px;
        }

        .rich-text-editor li {
          margin: 4px 0;
        }

        .rich-text-editor pre {
          background: var(--bg-secondary, #f1f5f9);
          padding: 12px 16px;
          border-radius: 8px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          border: 1px solid var(--line, #e2e8f0);
        }

        .rich-text-editor a {
          color: var(--brand-2, #3b82f6);
          text-decoration: underline;
          cursor: pointer;
        }

        .rich-text-editor a:hover {
          text-decoration: none;
        }

        .rich-text-editor hr {
          border: none;
          border-top: 2px solid var(--line, #e2e8f0);
          margin: 16px 0;
        }

        .rich-text-editor::-webkit-scrollbar {
          width: 6px;
        }

        .rich-text-editor::-webkit-scrollbar-track {
          background: var(--bg-secondary, #f8fafc);
        }

        .rich-text-editor::-webkit-scrollbar-thumb {
          background: var(--line, #e2e8f0);
          border-radius: 10px;
        }

        .rich-text-editor::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary, #94a3b8);
        }

        @media (max-width: 768px) {
          .rich-text-toolbar {
            padding: 6px 8px;
            gap: 2px;
          }

          .toolbar-group {
            padding: 0 2px;
          }

          .rich-text-toolbar button {
            padding: 4px 6px;
            font-size: 12px;
            min-width: 28px;
            min-height: 28px;
          }

          .rich-text-editor {
            padding: 12px 14px;
            min-height: 200px;
            font-size: 14px;
          }

          .rich-text-editor h2 {
            font-size: 22px;
          }

          .rich-text-editor h3 {
            font-size: 18px;
          }

          .color-picker-dropdown {
            min-width: 160px;
            max-width: 180px;
            grid-template-columns: repeat(7, 1fr);
          }

          .color-picker-dropdown .color-option {
            width: 20px;
            height: 20px;
          }

          .link-input-wrapper input {
            min-width: 120px;
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .rich-text-toolbar {
            padding: 4px 6px;
          }

          .rich-text-toolbar button {
            padding: 3px 5px;
            font-size: 11px;
            min-width: 24px;
            min-height: 24px;
          }

          .rich-text-editor {
            padding: 10px 12px;
            min-height: 160px;
            font-size: 13px;
          }

          .toolbar-group-label {
            font-size: 8px;
          }

          .rich-text-toolbar select {
            font-size: 11px;
            padding: 2px 20px 2px 6px;
          }
        }
      `}</style>

      {!readOnly && (
        <div className="rich-text-toolbar" role="toolbar" aria-label="Rich text formatting">
          {/* Font Size */}
          <div className="toolbar-group">
            <span className="toolbar-group-label">Size</span>
            <select 
              value={fontSize} 
              onChange={(e) => {
                setFontSize(e.target.value);
                handleFontSize(e.target.value);
              }}
              title="Font size"
            >
              {fontSizeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Text Color */}
          <div className="toolbar-group">
            <span className="toolbar-group-label">Color</span>
            <div className="color-picker-wrapper">
              <button
                type="button"
                className="color-picker-trigger"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Text color"
              >
                <span className="color-preview" style={{ backgroundColor: textColor }} />
                <FiChevronDown size={12} />
              </button>
              {showColorPicker && (
                <div className="color-picker-dropdown">
                  {colorPresets.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${color === textColor ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleTextColor(color)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Highlight */}
          <div className="toolbar-group">
            <span className="toolbar-group-label">Highlight</span>
            <div className="color-picker-wrapper">
              <button
                type="button"
                className="color-picker-trigger"
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                title="Highlight text"
              >
                <span className="color-preview" style={{ backgroundColor: highlightColor }} />
                <FiChevronDown size={12} />
              </button>
              {showHighlightPicker && (
                <div className="color-picker-dropdown">
                  {highlightPresets.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="color-option"
                      style={{ backgroundColor: color }}
                      onClick={() => handleHighlight(color)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Formatting */}
          <div className="toolbar-group">
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('bold')}
              title="Bold (Ctrl+B)"
            >
              <FiBold />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('italic')}
              title="Italic (Ctrl+I)"
            >
              <FiItalic />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('underline')}
              title="Underline (Ctrl+U)"
            >
              <FiUnderline />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('strikeThrough')}
              title="Strikethrough"
            >
              <span style={{ textDecoration: "line-through", fontWeight: "bold" }}>S</span>
            </button>
          </div>

          {/* Alignment */}
          <div className="toolbar-group">
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('justifyLeft')}
              title="Align left"
            >
              <FiAlignLeft />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('justifyCenter')}
              title="Align center"
            >
              <FiAlignCenter />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('justifyRight')}
              title="Align right"
            >
              <FiAlignRight />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('justifyFull')}
              title="Justify"
            >
              <FiAlignJustify />
            </button>
          </div>

          {/* Lists */}
          <div className="toolbar-group">
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('insertUnorderedList')}
              title="Bullet list"
            >
              <FiList />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('insertOrderedList')}
              title="Numbered list"
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>1.</span>
            </button>
          </div>

          {/* Insert */}
          <div className="toolbar-group">
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowLinkInput(!showLinkInput)} 
              title="Insert link"
            >
              <FiLink />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleImage} 
              title="Insert image"
            >
              <FiImage />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('insertHorizontalRule')}
              title="Divider"
            >
              <FiMinus />
            </button>
          </div>

          {/* Block formatting */}
          <div className="toolbar-group">
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('formatBlock', '<h2>')}
              title="Heading 2"
            >
              H2
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('formatBlock', '<h3>')}
              title="Heading 3"
            >
              H3
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('formatBlock', '<blockquote>')}
              title="Quote"
            >
              <FiMessageSquare />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('formatBlock', '<pre>')}
              title="Code block"
            >
              <FiCode />
            </button>
          </div>

          {/* Actions */}
          <div className="toolbar-group" style={{ marginLeft: "auto" }}>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearFormatting} 
              title="Clear formatting"
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>Tx</span>
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('undo')}
              title="Undo (Ctrl+Z)"
            >
              <FiRotateCcw />
            </button>
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCommand('redo')}
              title="Redo (Ctrl+Y)"
            >
              <FiRotateCw />
            </button>
          </div>
        </div>
      )}

      {/* Link Input */}
      {showLinkInput && !readOnly && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line, #e2e8f0)", background: "var(--bg-secondary, #f8fafc)" }}>
          <div className="link-input-wrapper">
            <FiLink size={16} />
            <input
              type="url"
              placeholder="Enter URL (e.g., example.com)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLinkInsert();
                if (e.key === "Escape") setShowLinkInput(false);
              }}
              autoFocus
            />
            <button type="button" onClick={handleLinkInsert}>
              <FiCheck />
            </button>
            <button type="button" onClick={() => setShowLinkInput(false)}>
              <FiX />
            </button>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="rich-text-editor"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={() => {
          setIsFocused(false);
          emitChange();
        }}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}