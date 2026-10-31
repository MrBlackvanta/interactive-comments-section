import { MinusIcon, PlusIcon } from "@/components/icons";
import type { Direction, Vote } from "@/data";

type VotePillProps = {
  score: number;
  vote: Vote;
  onVote: (direction: Direction) => void;
};

const voteButton =
  "grid place-items-center place-self-stretch rounded-vote text-accent-soft v-focus transition-[color] duration-150 ease-out hover:text-accent";

export default function VotePill({ score, vote, onVote }: VotePillProps) {
  return (
    <div className="row-start-3 grid h-10 w-25 grid-cols-3 place-items-center rounded-vote bg-page md:col-start-1 md:row-span-2 md:row-start-1 md:h-25 md:w-10 md:grid-cols-1 md:grid-rows-3">
      <button
        type="button"
        aria-pressed={vote === 1}
        onClick={() => onVote(1)}
        className={`${voteButton} aria-pressed:text-accent`}
      >
        <PlusIcon />
        <span className="sr-only">Upvote</span>
      </button>
      <p
        className={
          vote === -1
            ? "text-heading-m text-danger"
            : "text-heading-m text-accent"
        }
      >
        <span className="sr-only">Score </span>
        {score}
      </p>
      <button
        type="button"
        aria-pressed={vote === -1}
        onClick={() => onVote(-1)}
        className={`${voteButton} aria-pressed:text-danger`}
      >
        <MinusIcon />
        <span className="sr-only">Downvote</span>
      </button>
    </div>
  );
}
