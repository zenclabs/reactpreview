import { test } from "@playwright/test";
import type { PreviewServer, Workspace } from "@previewjs/core";
import { createWorkspace, setupFrameworkPlugin } from "@previewjs/core";
import "@previewjs/iframe";
import frameworkPluginFactory from "@previewjs/plugin-react";
import { createFileSystemReader } from "@previewjs/vfs";
import path from "path";
import createLogger from "pino";
import prettyLogger from "pino-pretty";
import url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

test.describe("navigation", () => {
  let workspace: Workspace;
  let previewServer: PreviewServer;

  test.beforeAll(async () => {
    // TODO: Simplify syntax drastically.
    const rootDir = path.join(__dirname, "..");
    const logger = createLogger(
      { level: "debug" },
      prettyLogger({ colorize: true })
    );
    const reader = createFileSystemReader();
    const frameworkPlugin = await setupFrameworkPlugin({
      rootDir,
      frameworkPlugins: [frameworkPluginFactory],
      logger,
      reader,
    });
    if (!frameworkPlugin) {
      throw new Error(`Unable to initialize framework plugin`);
    }
    workspace = await createWorkspace({
      rootDir,
      frameworkPlugin,
      logger,
      reader,
      onServerStart: () =>
        Promise.resolve({
          middlewares: [
            (req, res, next) => {
              if (req.path === "/") {
                res.end();
              } else {
                next();
              }
            },
          ],
        }),
    });
    previewServer = await workspace.startServer();
  });

  test.afterAll(async () => {
    await previewServer.stop();
    await workspace.dispose();
  });

  // TODO: Check if the page may reload itself if a new dependency is discovered by Vite.

  test("foo", async ({ page }) => {
    await page.goto(getUrl(workspace, __dirname));
    await page.evaluate(async () => {
      const { default: App } = await import("./App");
      const { Foo } = await import("./Foo");

      await mount(<App title={<Foo />} />);
    });
    await page.screenshot({
      path: "src/example.spec.output.png",
    });
  });

  function getUrl(workspace: Workspace, currentDir: string) {
    const currentPath = path
      .relative(workspace.rootDir, currentDir)
      .replaceAll(path.delimiter, "/");
    return `${previewServer.url()}/${currentPath}/`;
  }
});
