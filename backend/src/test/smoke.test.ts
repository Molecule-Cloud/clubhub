import { describe, it, expect } from 'vitest';

describe("vitest smoke test", () => {
    it("runs TypeScript test files correctly", () => expect(1 + 1).toBe(2))
})

describe("test environmental loading", () => {
    it("loads .env,test before the env.ts validates, without crashing the process", async () => {
        const { env } = await import("../lib/env");
        expect(env.NODE_ENV).toBe("test");
        expect(env.JWT_PRIVATE_KEY).toContain("BEGIN PRIVATE KEY");
    });
});