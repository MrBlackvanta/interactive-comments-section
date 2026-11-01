"use client";

import { ErrorPanel } from "@/components/layout";
import { clearSavedThread } from "@/lib";

type HomeErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function HomeError({ reset }: HomeErrorProps) {
  const startOver = () => {
    clearSavedThread();
    reset();
  };

  return (
    <ErrorPanel
      title="Something went wrong"
      description="The comments couldn’t be shown. Try again, or start over to clear your changes and bring back the original thread."
    >
      <div className="grid grid-cols-2 gap-3 md:gap-3.5">
        <button
          type="button"
          onClick={reset}
          className="v-button bg-accent hover:bg-accent-soft"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={startOver}
          className="v-button bg-danger hover:bg-danger-soft"
        >
          Start over
        </button>
      </div>
    </ErrorPanel>
  );
}
