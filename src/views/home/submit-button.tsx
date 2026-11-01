type SubmitButtonProps = {
  children: string;
  className?: string;
};

export default function SubmitButton({
  children,
  className = "",
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      className={`h-12 w-26 rounded-lg bg-accent text-body-m-bold text-white uppercase v-focus transition-[background-color] duration-150 ease-out hover:bg-accent-soft ${className}`}
    >
      {children}
    </button>
  );
}
