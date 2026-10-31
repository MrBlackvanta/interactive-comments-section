import type { SeedComment, Username } from "./types";

export const CURRENT_USER: Username = "juliusomo";

export const SEED: SeedComment[] = [
  {
    id: 1,
    username: "amirrobson",
    content:
      "Impressive! Though it seems the drag feature could be improved. But overall it looks incredible. You've nailed the design and the responsiveness at various breakpoints works really well.",
    score: 12,
    daysAgo: 30,
    replies: [],
  },
  {
    id: 2,
    username: "maxblagun",
    content:
      "Woah, your project looks awesome! How long have you been coding for? I'm still new, but think I want to dive into React as well soon. Perhaps you can give me an insight on where I can learn React? Thanks!",
    score: 5,
    daysAgo: 14,
    replies: [
      {
        id: 3,
        username: "ramsesmiron",
        content:
          "If you're still new, I'd recommend focusing on the fundamentals of HTML, CSS, and JS before considering React. It's very tempting to jump ahead but lay a solid foundation first.",
        score: 4,
        daysAgo: 7,
        replyingTo: "maxblagun",
      },
      {
        id: 4,
        username: "juliusomo",
        content:
          "I couldn't agree more with this. Everything moves so fast and it always seems like everyone knows the newest library/framework. But the fundamentals are what stay constant.",
        score: 2,
        daysAgo: 2,
        replyingTo: "ramsesmiron",
      },
    ],
  },
];
