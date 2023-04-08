#!/usr/bin/env node

import { decodeComponentId } from "@previewjs/api";
import { createChromelessWorkspace } from "@previewjs/chromeless";
import { load } from "@previewjs/loader";
import reactPlugin from "@previewjs/plugin-react";
import chalk from "chalk";
import { program } from "commander";
import { readFileSync } from "fs";
import open from "open";
import path from "path";
import playwright from "playwright";
import url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const { version } = JSON.parse(
  readFileSync(`${__dirname}/../package.json`, "utf8")
);

program.version(version);

const PORT_OPTION = [
  "-p, --port <port>",
  "Port number on which to run the Preview.js server",
  "8120",
] as const;

interface SharedOptions {
  port: string;
}

program
  .arguments("[dir-path]")
  .option(...PORT_OPTION)
  .action(async (dirPath: string | undefined, options: SharedOptions) => {
    if ("test") {
      const browser = await playwright.chromium.launch();
      const page = await browser.newPage();
      const rootDirPath = dirPath || process.cwd();
      const workspace = await createChromelessWorkspace({
        // TODO: Auto-pass framework plugin factories, or get them from config.
        frameworkPlugins: [reactPlugin],
        rootDirPath,
      });
      const preview = await workspace.preview.start(page);
      const { components } = await workspace.detectComponents();
      for (const component of components) {
        const { filePath, name } = decodeComponentId(component.componentId);
        try {
          await preview.show(component.componentId);
          const dirPath = path.dirname(filePath);
          await preview.iframe.takeScreenshot(
            path.join(rootDirPath, dirPath, "__screenshots__", name + ".png")
          );
          console.log(`✅ ${component.componentId}`);
        } catch (e: any) {
          console.log(`❌ ${component.componentId}`);
          // TODO: Show if verbose on.
          // console.warn(e.message);
        }
      }
      await preview.stop();
      console.log("Done!");
      process.exit(0);
    }

    const packageName = process.env.PREVIEWJS_PACKAGE_NAME;
    if (!packageName) {
      throw new Error(`Missing environment variable: PREVIEWJS_PACKAGE_NAME`);
    }
    const previewjs = await load({
      installDir: process.env.PREVIEWJS_MODULES_DIR || __dirname,
      packageName,
    });
    const workspace = await previewjs.getWorkspace({
      versionCode: `cli-${version}`,
      absoluteFilePath: dirPath || process.cwd(),
    });
    if (!workspace) {
      console.error(chalk.red(`No workspace detected.`));
      process.exit(1);
    }

    const port = parseInt(options.port);
    await workspace!.preview.start(async () => port);
    await open(`http://localhost:${port}`);
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
