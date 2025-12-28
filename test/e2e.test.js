import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vitest } from "vitest";
import * as rbxluau from "../src/index.js";

dotenv.config({ quiet: true });

describe("luau execution", () => {
    let originalExit;

    beforeEach(() => {
        originalExit = process.exit;
        process.exit = vitest.fn();
    });

    afterEach(() => {
        process.exit = originalExit;
    });

    const createOutputPath = () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const outputPath = path.join(process.cwd(), "test", `output_${randomSuffix}.log`);
        return outputPath;
    };

    it("should run locally", async () => {
        const outputPath = createOutputPath();

        await rbxluau.executeLuau(`print("Hello world!")`, {
            local: true,
            out: outputPath,
        });

        const output = fs.readFileSync(outputPath, "utf-8");
        expect(output).toContain("Hello world!");

        fs.unlinkSync(outputPath);
    }, 30000);

    it("should run on the cloud", async () => {
        const outputPath = createOutputPath();

        await rbxluau.executeLuau(`print("Hello world!")`, {
            local: false,
            out: outputPath,
        });

        const output = fs.readFileSync(outputPath, "utf-8");
        expect(output).toContain("Hello world!");

        fs.unlinkSync(outputPath);
    }, 30000);

    it("should handle non-number return values locally", async () => {
        const outputPath = createOutputPath();

        const exitCode = await rbxluau.executeLuau(`print("hi"); return "test output"`, {
            local: true,
            out: outputPath,
            exit: false,
        });

        expect(exitCode).toBe(0);
        const output = fs.readFileSync(outputPath, "utf-8");
        expect(output).toContain("test output");

        fs.unlinkSync(outputPath);
    }, 30000);

    it("should handle non-number return values on the cloud", async () => {
        const outputPath = createOutputPath();

        const exitCode = await rbxluau.executeLuau(`print("hi"); return "test output"`, {
            local: false,
            out: outputPath,
            exit: false,
        });

        expect(exitCode).toBe(0);
        const output = fs.readFileSync(outputPath, "utf-8");
        expect(output).toContain("test output");

        fs.unlinkSync(outputPath);
    }, 30000);
});
