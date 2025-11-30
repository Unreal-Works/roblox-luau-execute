import fs from "fs";
import { getApiContext } from "./apiContext.js";
import { runCloudLuau, uploadPlace } from "./cloudLuauRunner.js";
import { PlaceRunner } from "./placeRunner.js";

export async function executeLuau(luau, options) {
    let scriptContents;
    if (options.script) {
        scriptContents = fs.readFileSync(options.script, "utf-8");
    } else if (luau) {
        scriptContents = luau;
    } else {
        console.error("No Luau script provided. Use --script or provide inline code.");
        process.exit(1);
    }

    // Local mode doesn't require ROBLOSECURITY
    if (options.local) {
        const code = await new PlaceRunner({ ...options, scriptContents }).run();
        process.exit(code);
    }

    const { ROBLOSECURITY } = process.env;
    if (!ROBLOSECURITY) {
        console.error("ROBLOSECURITY environment variable is not set.");
        process.exit(1);
    }

    const context = await getApiContext(ROBLOSECURITY);

    const placePath = options.place;
    const versionNumber = placePath ? await uploadPlace(context, placePath) : null;
    return await runCloudLuau({
        executionKey: context.apiKey,
        universeId: context.universeId,
        placeId: context.placeId,
        versionNumber,
        scriptContents,
    });
}
