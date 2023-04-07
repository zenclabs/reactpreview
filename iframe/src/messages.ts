import type { ErrorPayload, UpdatePayload } from "vite/types/hmrPayload";
import type { Action, LogMessage } from "./index";

export type PreviewToAppMessage =
  | Bootstrapped
  | BeforeRender
  | Action
  | LogMessage
  | RenderingSetup
  | RenderingSuccess
  | RenderingError
  | FileChanged
  | ViteErrorMessage
  | ViteBeforeUpdateMessage;

export interface Bootstrapped {
  kind: "bootstrapped";
}

export interface BeforeRender {
  kind: "before-render";
}

export interface RenderingSetup {
  kind: "rendering-setup";
  componentId: string;
}

export interface RenderingSuccess {
  kind: "rendering-success";
}

export interface RenderingError {
  kind: "rendering-error";
  message: string;
}

export interface FileChanged {
  kind: "file-changed";
  path: string;
}

export interface ViteErrorMessage {
  kind: "vite-error";
  payload: ErrorPayload;
}

export interface ViteBeforeUpdateMessage {
  kind: "vite-before-update";
  payload: UpdatePayload;
}

export type AppToPreviewMessage = RenderMessage;

export interface RenderMessage {
  kind: "render";
  componentId: string;
  autogenCallbackPropsSource: string;
  propsAssignmentSource: string;
}
