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
      className={`v-button w-26 bg-accent hover:bg-accent-soft ${className}`}
    >
      {children}
    </button>
  );
}
