import type { FrameworkPluginFactory, Workspace } from "@previewjs/core";
import { createWorkspace, setupFrameworkPlugin } from "@previewjs/core";
import type { Reader } from "@previewjs/vfs";
import { createFileSystemReader } from "@previewjs/vfs";
import express from "express";
import path from "path";
import type { Logger } from "pino";
import createLogger from "pino";
import prettyLogger from "pino-pretty";
import type { Page } from "playwright";
import url from "url";
import { startPreview } from "./preview";

export async function createChromelessWorkspace({
  rootDirPath,
  frameworkPlugins,
  reader = createFileSystemReader(),
  logger = createLogger(
    { level: process.env["PREVIEWJS_LOG_LEVEL"]?.toLowerCase() },
    prettyLogger({ colorize: true, destination: process.stdout })
  ),
}: {
  rootDirPath: string;
  frameworkPlugins: FrameworkPluginFactory[];
  logger?: Logger;
  reader?: Reader;
  port?: number;
}): Promise<
  Omit<Workspace, "preview"> & {
    preview: {
      start: (
        page: Page,
        options?: { port?: number }
      ) => ReturnType<typeof startPreview>;
    };
  }
> {
  const frameworkPlugin = await setupFrameworkPlugin({
    rootDirPath,
    frameworkPlugins,
    logger,
  });
  if (!frameworkPlugin) {
    throw new Error(
      `No compatible framework plugin found for directory: ${rootDirPath}`
    );
  }
  const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
  const clientDirPath = path.join(__dirname, "..", "client", "dist");
  const workspace = await createWorkspace({
    rootDirPath,
    frameworkPlugin,
    logger,
    reader,
    setupEnvironment: async () => ({
      middlewares: [express.static(clientDirPath)],
    }),
  });
  if (!workspace) {
    throw new Error(
      `No workspace could be created for directory: ${rootDirPath}`
    );
  }
  return {
    ...workspace,
    preview: {
      start: (page: Page, options: { port?: number } = {}) =>
        startPreview({ workspace, page, ...options }),
    },
  };
}
