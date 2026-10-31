export type Username = "amirrobson" | "juliusomo" | "maxblagun" | "ramsesmiron";

export type Post = {
  id: number;
  username: Username;
  content: string;
  score: number;
  createdAt: number;
};

export type Reply = Post & { replyingTo: Username };

export type Comment = Post & { replies: Reply[] };

export type SeedReply = Omit<Reply, "createdAt"> & { daysAgo: number };

export type SeedComment = Omit<Comment, "createdAt" | "replies"> & {
  daysAgo: number;
  replies: SeedReply[];
};
