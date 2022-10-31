import type { CollectedTypes, ValueType } from "@previewjs/type-analyzer";
import type { RPC } from "./endpoint";
import type { PersistedState } from "./persisted-state";

export const GetInfo: RPC<
  void,
  {
    appInfo: {
      platform: string;
      version: string;
    };
  }
> = {
  path: "get-info",
};

export const GetState: RPC<void, PersistedState> = {
  path: "get-state",
};

export const UpdateState: RPC<Partial<PersistedState>, PersistedState> = {
  path: "update-state",
};

export const ComputeProps: RPC<
  {
    filePath: string;
    componentName: string;
  },
  ComputePropsResponse
> = {
  path: "compute-props",
};

export type ComputePropsResponse = {
  types: {
    props: ValueType;
    all: CollectedTypes;
  };
};

export const AnalyzeProject: RPC<
  {
    filePaths?: string[];
    forceRefresh?: boolean;
  },
  AnalyzeProjectResponse
> = {
  path: "analyze-project",
};

export type AnalyzeProjectResponse = {
  components: {
    [filePath: string]: Component[];
  };
};

export type Component = {
  name: string;
  start: number;
  end: number;
  info:
    | {
        kind: "component";
        exported: boolean;
      }
    | {
        kind: "story";
        associatedComponent: {
          filePath: string;
          name: string;
        } | null;
      };
};
