import { SetupPreviewEnvironment } from "@previewjs/core";
import { PersistedState } from "@previewjs/core/api/persisted-state";
import { encodeLicense } from "./client/src/state/license-encoding";
import setupEnvironment from "./src";

const TEST_STATE: PersistedState = {
  license: encodeLicense({
    checked: {
      timestamp: Date.now(),
      valid: true,
    },
    maskedKey: "TEST",
    token: "test",
  }),
};

const setupTestEnvironment: SetupPreviewEnvironment = async (options) => ({
  ...(await setupEnvironment(options)),
  persistedStateManager: {
    get: async () => TEST_STATE,
    update: async () => TEST_STATE,
  } as any,
});

export default setupTestEnvironment;
