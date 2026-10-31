export type Username = "amirrobson" | "juliusomo" | "maxblagun" | "ramsesmiron";

export type Direction = 1 | -1;

export type Vote = Direction | 0;

export type Post = {
  id: number;
  username: Username;
  content: string;
  score: number;
  createdAt: number;
  vote: Vote;
};

export type Reply = Post & { replyingTo: Username };

export type Comment = Post & { replies: Reply[] };

export type SeedReply = Omit<Reply, "createdAt" | "vote"> & { daysAgo: number };

export type SeedComment = Omit<Comment, "createdAt" | "vote" | "replies"> & {
  daysAgo: number;
  replies: SeedReply[];
};
