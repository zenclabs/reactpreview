import type { AppToPreviewMessage, RenderMessage } from "../../src/messages";
import { overrideCopyCutPaste } from "./copy-cut-paste";
import { setUpLinkInterception } from "./links";
import { sendMessageFromPreview } from "./messages";
import { detach, load as rendererLoad } from "./renderer/index";
import { setState } from "./state";
import { updateComponent } from "./update-component";

// setUpLogInterception();
setUpLinkInterception();
overrideCopyCutPaste();

// TODO: Remove, just for testing.
async function test() {
  // TODO: Load conditionally.
  // TODO: Load global detected CSS otherwise.
  const wrapperModule = await import(
    // @ts-ignore
    "../__previewjs__/Wrapper.tsx"
  );
  const componentModule = await import(
    // @ts-ignore
    "../design/RestaurantHeader/RestaurantHeader.stories.tsx"
  );
  setState({
    filePath: "design/RestaurantHeader/RestaurantHeader.stories.tsx",
    componentName: "Example",
    defaultPropsSource: "{}",
    customVariantPropsSource: "properties = {}",
    variantKey: null,
  });
  await updateComponent({
    wrapperModule: wrapperModule,
    wrapperName: "Wrapper",
    componentModule,
    componentFilePath: "design/RestaurantHeader/RestaurantHeader.stories.tsx",
    componentName: "Example",
    loadingError: null,
    load: rendererLoad,
  });
}
test().catch(console.error);

async function load({
  filePath,
  componentName,
  variantKey,
  defaultPropsSource,
  customVariantPropsSource,
}: RenderMessage) {
  try {
    const componentLoaderModuleId = `/@component-loader.js?p=${encodeURIComponent(
      filePath
    )}&c=${encodeURIComponent(componentName)}`;
    setState({
      filePath,
      componentName,
      defaultPropsSource,
      customVariantPropsSource,
      variantKey,
    });
    const { refresh } = await import(
      /* @vite-ignore */
      `/preview${componentLoaderModuleId}`
    );
    await refresh();
  } catch (error: any) {
    sendMessageFromPreview({
      kind: "rendering-error",
      message: error.stack || error.message,
    });
  }
}

const root = document.getElementById("root");
if (!root) {
  throw new Error(`Unable to find #root!`);
}
const rootLoadingHtml = root.innerHTML;
let loading = false;
window.addEventListener(
  "message",
  (event: MessageEvent<AppToPreviewMessage>) => {
    const data = event.data;
    switch (data.kind) {
      case "show-loading":
        loading = true;
        detach()
          .then(() => {
            if (!loading || !root) {
              return;
            }
            root.innerHTML = rootLoadingHtml;
          })
          .catch(console.error);
        break;
      case "render":
        loading = false;
        load(data).catch(console.error);
        break;
    }
  }
);

sendMessageFromPreview({
  kind: "bootstrapped",
});
