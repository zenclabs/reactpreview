import fs from "fs-extra";
import path from "path";
import { testSuite } from "../testing";

const smokeTestAppsDir = path.join(__dirname, "..", "..", "smoke-test-apps");
export const smokeTests = fs
  .readdirSync(smokeTestAppsDir)
  .filter(
    (appName) =>
      !appName.startsWith("_tmp_") &&
      fs.pathExistsSync(path.join(smokeTestAppsDir, appName, "package.json"))
  )
  .map((appName) =>
    testSuite(
      `smoke test: ${appName}`,
      async (test) => {
        test(
          appName,
          `../smoke-test-apps/${appName}`,
          async ({ outputDirPath, appDir, controller }) => {
            let time = Date.now();
            const candidates = [
              "src/App.tsx:App",
              "src/App.jsx:App",
              "src/App.js:App",
              "src/App.vue:App",
              "pages/index.tsx:App",
              "pages/index.vue:index",
              "app.vue:app",
            ];
            let filePath: string | null = null;
            let componentName: string | null = null;
            for (const candidate of candidates) {
              const colonPosition = candidate.indexOf(":");
              const candidatePath = candidate.substr(0, colonPosition);
              if (
                await fs.pathExists(path.join(appDir.rootPath, candidatePath))
              ) {
                filePath = path.join(appDir.rootPath, candidatePath);
                componentName = candidate.substr(colonPosition + 1);
                break;
              }
            }
            if (!filePath || !componentName) {
              throw new Error(`Unable to find an entry point for ${appName}`);
            }
            console.log(
              `smoke-test find component: ${(Date.now() - time) / 1000}`
            );
            time = Date.now();
            await controller.show(
              `${path
                .relative(appDir.rootPath, filePath)
                .replace(/\\/g, "/")}:${componentName}`
            );
            console.log(`smoke-test show: ${(Date.now() - time) / 1000}`);
            time = Date.now();
            const iframe = await controller.previewIframe();
            await iframe.waitForSelector("#ready");
            console.log(
              `smoke-test wait #ready: ${(Date.now() - time) / 1000}`
            );
            time = Date.now();
            if (await controller.props.editor.visible()) {
              await controller.props.editor.isReady();
            }
            console.log(
              `smoke-test wait editor: ${(Date.now() - time) / 1000}`
            );
            time = Date.now();
            await controller.takeScreenshot(
              "#ready",
              path.join(
                outputDirPath,
                "__screenshots__",
                process.platform,
                `${appName}.png`
              )
            );
            console.log(`smoke-test screenshot: ${(Date.now() - time) / 1000}`);
          }
        );
      },
      path.join(smokeTestAppsDir, appName)
    )
  );
