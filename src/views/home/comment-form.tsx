import { AVATARS, CURRENT_USER } from "@/data";
import { type ChangeEvent, type SubmitEvent, useId, useState } from "react";

type CommentFormProps = {
  onSend: (content: string) => void;
};

const BLANK = "Please fill out this field.";

export default function CommentForm({ onSend }: CommentFormProps) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const edit = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.currentTarget;
    event.currentTarget.setCustomValidity(value.trim() ? "" : BLANK);
    setDraft(value);
  };

  const send = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend(draft);
    setDraft("");
  };

  return (
    <form
      onSubmit={send}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-lg bg-white p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start md:p-6"
    >
      <label htmlFor={id} className="sr-only">
        Add a comment
      </label>
      <textarea
        id={id}
        required
        value={draft}
        onChange={edit}
        placeholder="Add a comment…"
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
        Send
      </button>
    </form>
  );
}
