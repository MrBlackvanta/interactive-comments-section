import { AVATARS, CURRENT_USER, type Username } from "@/data";
import { type SubmitEvent, useState } from "react";
import DraftField from "./draft-field";
import SubmitButton from "./submit-button";

type CommentFormProps = {
  label: string;
  submit: string;
  mention?: Username;
  autoFocus?: boolean;
  onSend: (content: string) => void;
  onCancel?: () => void;
};

export default function CommentForm({
  label,
  submit,
  mention,
  autoFocus,
  onSend,
  onCancel,
}: CommentFormProps) {
  const initial = mention ? `@${mention} ` : "";
  const [draft, setDraft] = useState(initial);

  const send = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend(draft);
    setDraft(initial);
  };

  return (
    <form
      onSubmit={send}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-lg bg-white p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start md:p-6"
    >
      <DraftField
        label={label}
        value={draft}
        mention={mention}
        placeholder={`${label}…`}
        autoFocus={autoFocus}
        className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-1"
        onChange={setDraft}
        onCancel={onCancel}
      />
      <img
        src={AVATARS[CURRENT_USER].src}
        alt=""
        width={40}
        height={40}
        className="size-8 md:col-start-1 md:row-start-1 md:mt-1 md:size-10"
      />
      <SubmitButton className="justify-self-end md:col-start-3 md:row-start-1">
        {submit}
      </SubmitButton>
    </form>
  );
}
