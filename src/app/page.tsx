import { CommentThread } from "@/views/home";

export default function Home() {
  return (
    <main className="grow px-4 py-8 md:py-16">
      <h1 className="sr-only">Project feedback</h1>
      <CommentThread />
    </main>
  );
}
