import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { useEffect, useRef, useCallback } from "react";

const COLORS = [
  { label: "Default", value: "" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
];

const HIGHLIGHTS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
];

interface Props {
  content: string;
  onChange: (html: string) => void;
  onSave?: () => void;
  placeholder?: string;
}

export default function RichNoteEditor({ content, onChange, onSave, placeholder }: Props) {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder || "Write your notes here..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes (initial load / migration)
  useEffect(() => {
    if (editor && !isInternalUpdate.current && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
    isInternalUpdate.current = false;
  }, [content, editor]);

  // Ctrl/Cmd+S to save
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave?.();
    }
  }, [onSave]);

  if (!editor) return null;

  return (
    <div className="rich-note-editor" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="rne-toolbar">
        <div className="rne-toolbar-group">
          <button
            type="button"
            className={`rne-btn ${editor.isActive("bold") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          ><strong>B</strong></button>
          <button
            type="button"
            className={`rne-btn ${editor.isActive("italic") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          ><em>I</em></button>
          <button
            type="button"
            className={`rne-btn ${editor.isActive("underline") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          ><u>U</u></button>
          <button
            type="button"
            className={`rne-btn ${editor.isActive("strike") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          ><s>S</s></button>
        </div>

        <div className="rne-separator" />

        <div className="rne-toolbar-group">
          <button
            type="button"
            className={`rne-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading"
          >H</button>
          <button
            type="button"
            className={`rne-btn ${editor.isActive("bulletList") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >•</button>
          <button
            type="button"
            className={`rne-btn ${editor.isActive("orderedList") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >1.</button>
          <button
            type="button"
            className={`rne-btn ${editor.isActive("blockquote") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >"</button>
        </div>

        <div className="rne-separator" />

        {/* Text color picker */}
        <div className="rne-toolbar-group">
          <div className="rne-dropdown">
            <button type="button" className="rne-btn" title="Text color">
              <span style={{ borderBottom: "2px solid var(--accent)" }}>A</span>
            </button>
            <div className="rne-dropdown-panel">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="rne-color-swatch"
                  style={{ background: c.value || "var(--text-p)", color: c.value ? "#fff" : undefined }}
                  onClick={() => {
                    if (c.value) editor.chain().focus().setColor(c.value).run();
                    else editor.chain().focus().unsetColor().run();
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Highlight picker */}
          <div className="rne-dropdown">
            <button type="button" className="rne-btn" title="Highlight">
              <span style={{ background: "#fef08a", padding: "0 3px", borderRadius: 2, color: "#000" }}>H</span>
            </button>
            <div className="rne-dropdown-panel">
              {HIGHLIGHTS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  className="rne-color-swatch"
                  style={{ background: h.value || "var(--surface-solid)", border: h.value ? undefined : "1px solid var(--border)" }}
                  onClick={() => {
                    if (h.value) editor.chain().focus().toggleHighlight({ color: h.value }).run();
                    else editor.chain().focus().unsetHighlight().run();
                  }}
                  title={h.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="rne-content" />
    </div>
  );
}
