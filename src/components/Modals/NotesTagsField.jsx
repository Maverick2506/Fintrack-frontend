import { useState } from "react";
import { Tag, X, StickyNote, ChevronDown } from "lucide-react";
import { addTags, MAX_TAGS, MAX_NOTES_LENGTH } from "../../utils/transactionTags";

/**
 * Notes and tags for Add/Edit Transaction. Folded away until used, so the form stays short on a phone.
 * A tag is added with Enter, a comma, or by leaving the box (so Save never drops a typed tag).
 */
const NotesTagsField = ({ notes, onNotesChange, tags, onTagsChange }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    if (!draft.trim()) return;
    onTagsChange(addTags(tags, draft));
    setDraft("");
  };

  // An edit that already has notes or tags opens with them showing
  if (!open && !notes && tags.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-h-[40px] flex items-center justify-between bg-zinc-950/60 hover:bg-zinc-950 border border-white/[0.07] hover:border-white/[0.14] rounded-xl px-3 py-2 text-left transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <StickyNote size={13} />
          Add notes or tags
        </span>
        <ChevronDown size={13} className="text-zinc-500" />
      </button>
    );
  }

  return (
    <div className="bg-zinc-950/60 border border-white/[0.07] rounded-xl px-3 py-2.5 space-y-2.5">
      <div>
        <label
          htmlFor="txTags"
          className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
        >
          <Tag size={11} />
          <span>Tags</span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
              className="inline-flex items-center gap-1 max-w-full min-h-[40px] px-3 rounded-full bg-sky-500/10 border border-sky-500/25 text-[11px] text-sky-200 hover:bg-sky-500/20 cursor-pointer"
              aria-label={`Remove tag ${tag}`}
            >
              <span className="truncate">#{tag}</span>
              <X size={11} className="shrink-0 text-sky-300/80" />
            </button>
          ))}
          {tags.length < MAX_TAGS && (
            <input
              id="txTags"
              type="text"
              value={draft}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes(",")) {
                  onTagsChange(addTags(tags, value));
                  setDraft("");
                } else {
                  setDraft(value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDraft();
                } else if (e.key === "Backspace" && !draft && tags.length > 0) {
                  onTagsChange(tags.slice(0, -1));
                }
              }}
              onBlur={commitDraft}
              maxLength={60}
              placeholder={tags.length ? "Add another" : "e.g. work, trip"}
              className="flex-1 min-w-[7rem] min-h-[40px] bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor="txNotes"
          className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
        >
          <StickyNote size={11} />
          <span>Notes</span>
        </label>
        <textarea
          id="txNotes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          maxLength={MAX_NOTES_LENGTH}
          rows={2}
          placeholder="Anything to remember about this one"
          className="w-full resize-y bg-zinc-900/60 border border-white/[0.06] rounded-lg px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.16]"
        />
      </div>
    </div>
  );
};

export default NotesTagsField;
