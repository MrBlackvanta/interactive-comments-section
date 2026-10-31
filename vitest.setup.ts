import { installMatchMedia } from "@/test/media";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vite-plus/test";

beforeEach(() => installMatchMedia());

afterEach(cleanup);
