import type { Post, Username } from "@/data";
import { type SubmitEvent, useState } from "react";
import DraftField from "./draft-field";
import SubmitButton from "./submit-button";

type EditFormProps = {
  post: Post & { replyingTo?: Username };
  className: string;
  onSave: (content: string) => void;
  onCancel: () => void;
};

export default function EditForm({
  post: { content, replyingTo },
  className,
  onSave,
  onCancel,
}: EditFormProps) {
  const [draft, setDraft] = useState(
    replyingTo ? `@${replyingTo} ${content}` : content,
  );

  const save = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <form onSubmit={save} className={`flex flex-col gap-4 ${className}`}>
      <DraftField
        label={
          replyingTo ? `Edit your reply to @${replyingTo}` : "Edit your comment"
        }
        value={draft}
        mention={replyingTo}
        autoFocus
        onChange={setDraft}
        onCancel={onCancel}
      />
      <SubmitButton className="self-end">Update</SubmitButton>
    </form>
  );
}
