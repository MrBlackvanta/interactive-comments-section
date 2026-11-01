import { type Ref, useId } from "react";

type DeleteDialogProps = {
  ref: Ref<HTMLDialogElement>;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteDialog({
  ref,
  onCancel,
  onConfirm,
}: DeleteDialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const textId = `${id}-text`;

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      className="m-auto w-[calc(100%-2rem)] max-w-85.75 translate-y-2 scale-96 gap-4 rounded-lg bg-white px-7 py-6 text-copy transition-[translate,scale,display,overlay] transition-discrete duration-150 ease-in backdrop:bg-black/0 backdrop:transition-[background-color] backdrop:duration-150 backdrop:ease-in open:grid open:translate-y-0 open:scale-100 open:duration-200 open:ease-out open:backdrop:bg-black/50 open:backdrop:duration-200 open:backdrop:ease-out motion-reduce:transition-none md:max-w-100 md:gap-5 md:p-8 starting:open:translate-y-2 starting:open:scale-96 starting:open:backdrop:bg-black/0"
    >
      <h2
        id={titleId}
        className="text-heading-l-mobile text-ink md:text-heading-l"
      >
        Delete comment
      </h2>
      <p id={textId}>
        Are you sure you want to delete this comment? This will remove the
        comment and can’t be undone.
      </p>
      <div className="grid grid-cols-2 gap-3 md:gap-3.5">
        <button
          type="button"
          onClick={onCancel}
          className="v-button bg-copy hover:bg-copy/50"
        >
          No, cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="v-button bg-danger hover:bg-danger-soft"
        >
          Yes, delete
        </button>
      </div>
    </dialog>
  );
}
