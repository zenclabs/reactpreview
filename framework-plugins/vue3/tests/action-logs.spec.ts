import test, { expect } from "@playwright/test";
import { previewTest } from "@previewjs/testing";
import path from "path";
import url from "url";
import pluginFactory from "../src/index.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const testApp = path.join(__dirname, "apps", "vue3");

test.describe.parallel("vue3/action logs", () => {
  const test = previewTest(pluginFactory, testApp);

  test("shows action logs on link click", async (preview) => {
    await preview.fileManager.update(
      "src/App.vue",
      `<template>
        <a id="link" href="https://www.google.com">
          Hello, World!
        </a>
      </template>`
    );
    await preview.show("src/App.vue:App");
    const link = await preview.iframe.waitForSelector("#link");
    preview.events.clear();
    await link.click();
    expect(preview.events.get()).toEqual([
      {
        kind: "action",
        path: "https://www.google.com/",
        type: "url",
      },
    ]);
  });
});
