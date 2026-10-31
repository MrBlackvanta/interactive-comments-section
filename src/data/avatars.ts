import amirrobson from "@/assets/avatars/image-amirrobson.webp";
import juliusomo from "@/assets/avatars/image-juliusomo.webp";
import maxblagun from "@/assets/avatars/image-maxblagun.webp";
import ramsesmiron from "@/assets/avatars/image-ramsesmiron.webp";
import type { StaticImageData } from "next/image";
import type { Username } from "./types";

export const AVATARS: Record<Username, StaticImageData> = {
  amirrobson,
  juliusomo,
  maxblagun,
  ramsesmiron,
};
