import type { ReactNode } from "react";

type ErrorPanelProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function ErrorPanel({
  title,
  description,
  children,
}: ErrorPanelProps) {
  return (
    <main className="grid grow place-items-center px-4 py-8 md:py-16">
      <div className="grid w-full max-w-85.75 gap-4 rounded-lg bg-white px-7 py-6 md:max-w-100 md:gap-5 md:p-8">
        <h1 className="text-heading-l-mobile text-ink md:text-heading-l">
          {title}
        </h1>
        <p>{description}</p>
        {children}
      </div>
    </main>
  );
}
