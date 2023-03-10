import fs from "fs";
import { createRequire } from "module";
import path from "path";
import url from "url";
import type { PreviewConfig } from "./config";

const require = createRequire(import.meta.url);

export const PREVIEW_CONFIG_NAME = "preview.config.js";

export async function readConfig(rootDirPath: string): Promise<PreviewConfig> {
  const rpConfigPath = path.join(rootDirPath, PREVIEW_CONFIG_NAME);
  let config: Partial<PreviewConfig> = {};
  const configFileExists = fs.existsSync(rpConfigPath);
  if (configFileExists) {
    let isModule = false;
    const packageJsonPath = path.join(rootDirPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const { type } = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      isModule = type === "module";
    }
    try {
      if (isModule) {
        const module = await import(
          url.pathToFileURL(rpConfigPath).toString() + `?t=${Date.now()}`
        );
        return module.default;
      } else {
        // Delete any existing cache so we reload the config fresh.
        delete require.cache[require.resolve(rpConfigPath)];
        const required = require(rpConfigPath);
        return required.module || required;
      }
    } catch (e) {
      throw new Error(`Unable to read preview.config.js:\n${e}`);
    }
  }
  return {
    alias: {},
    publicDir: "public",
    ...config,
  };
}
