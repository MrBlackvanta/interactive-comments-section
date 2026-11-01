import { AVATARS, CURRENT_USER, type Username } from "@/data";
import { toContent } from "@/lib";
import {
  type KeyboardEvent,
  type SubmitEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type CommentFormProps = {
  label: string;
  submit: string;
  mention?: Username;
  autoFocus?: boolean;
  onSend: (content: string) => void;
  onCancel?: () => void;
};

const BLANK = "Please fill out this field.";

export default function CommentForm({
  label,
  submit,
  mention,
  autoFocus,
  onSend,
  onCancel,
}: CommentFormProps) {
  const id = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const initial = mention ? `@${mention} ` : "";
  const [draft, setDraft] = useState(initial);
  const blank = !toContent(draft, mention);

  useEffect(() => {
    fieldRef.current?.setCustomValidity(blank ? BLANK : "");
  }, [blank]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!autoFocus || !field) return;

    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [autoFocus]);

  const send = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend(draft);
    setDraft(initial);
  };

  const cancel = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape" && !event.nativeEvent.isComposing) onCancel?.();
  };

  return (
    <form
      onSubmit={send}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-lg bg-white p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start md:p-6"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        ref={fieldRef}
        id={id}
        required
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={cancel}
        placeholder={`${label}…`}
        className="col-span-2 field-sizing-content min-h-24 w-full resize-none rounded-lg border border-line px-6 py-3 text-ink caret-accent transition-[border-color] duration-150 ease-out placeholder:text-copy focus:border-accent focus:outline-2 focus:outline-transparent md:col-span-1 md:col-start-2 md:row-start-1"
      />
      <img
        src={AVATARS[CURRENT_USER].src}
        alt=""
        width={40}
        height={40}
        className="size-8 md:col-start-1 md:row-start-1 md:mt-1 md:size-10"
      />
      <button
        type="submit"
        className="h-12 w-26 justify-self-end rounded-lg bg-accent text-body-m-bold text-white uppercase v-focus transition-[background-color] duration-150 ease-out hover:bg-accent-soft md:col-start-3 md:row-start-1"
      >
        {submit}
      </button>
    </form>
  );
}
