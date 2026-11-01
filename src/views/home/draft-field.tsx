import type { Username } from "@/data";
import { toContent } from "@/lib";
import { type KeyboardEvent, useEffect, useId, useRef } from "react";

type DraftFieldProps = {
  label: string;
  value: string;
  mention?: Username;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  onChange: (value: string) => void;
  onCancel?: () => void;
};

const BLANK = "Please fill out this field.";

export default function DraftField({
  label,
  value,
  mention,
  placeholder,
  autoFocus,
  className = "",
  onChange,
  onCancel,
}: DraftFieldProps) {
  const id = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const blank = !toContent(value, mention);

  useEffect(() => {
    fieldRef.current?.setCustomValidity(blank ? BLANK : "");
  }, [blank]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!autoFocus || !field) return;

    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [autoFocus]);

  const cancel = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape" && !event.nativeEvent.isComposing) onCancel?.();
  };

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        ref={fieldRef}
        id={id}
        required
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={cancel}
        placeholder={placeholder}
        className={`field-sizing-content min-h-24 w-full resize-none rounded-lg border border-line px-6 py-3 text-ink caret-accent transition-[border-color] duration-150 ease-out placeholder:text-copy focus:border-accent focus:outline-2 focus:outline-transparent ${className}`}
      />
    </>
  );
}
