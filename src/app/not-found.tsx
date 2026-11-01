import { ErrorPanel } from "@/components/layout";
import { SITE_NAME } from "@/data";
import type { Metadata } from "next";
import Link from "next/link";

const description =
  "There’s nothing at this address. The comments are on the home page.";

export const metadata: Metadata = {
  title: `${SITE_NAME} | Page not found`,
  description,
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <ErrorPanel title="Page not found" description={description}>
      <Link
        href="/"
        className="grid v-button place-items-center bg-accent hover:bg-accent-soft"
      >
        Back to comments
      </Link>
    </ErrorPanel>
  );
}
