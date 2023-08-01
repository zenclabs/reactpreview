import type { FrameworkPlugin } from "@previewjs/core";
import { object, string, TRUE } from "@previewjs/serializable-values";
import { objectType, STRING_TYPE } from "@previewjs/type-analyzer";
import type { Reader, Writer } from "@previewjs/vfs";
import {
  createFileSystemReader,
  createMemoryReader,
  createStackedReader,
} from "@previewjs/vfs";
import path from "path";
import createLogger from "pino";
import prettyLogger from "pino-pretty";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import vue2FrameworkPlugin from ".";
import { extractVueComponents } from "./extract-component.js";
import { createVueTypeScriptReader } from "./vue-reader";

const ROOT_DIR = path.join(__dirname, "virtual");
const APP_TSX = path.join(ROOT_DIR, "App.tsx");
const MY_COMPONENT_VUE = path.join(ROOT_DIR, "MyComponent.vue");
const APP_STORIES_TSX = path.join(ROOT_DIR, "App.stories.tsx");

describe("extractVueComponents", () => {
  const logger = createLogger(
    { level: "debug" },
    prettyLogger({ colorize: true })
  );

  let memoryReader: Reader & Writer;
  let frameworkPlugin: FrameworkPlugin;

  beforeEach(async () => {
    memoryReader = createMemoryReader();
    memoryReader.updateFile(
      MY_COMPONENT_VUE,
      `
<template>
  <div>
    {{ label }}
  </div>
</template>

<script>
export default {
  name: "App",
  props: {
    label: {
      type: String,
      required: true
    }
  }
};
</script>
`
    );
    const rootDirPath = path.join(__dirname, "virtual");
    const reader = createStackedReader([
      createVueTypeScriptReader(logger, memoryReader),
      createFileSystemReader({
        mapping: {
          from: path.join(__dirname, "..", "preview", "modules"),
          to: path.join(rootDirPath, "node_modules"),
        },
        watch: false,
      }),
      createFileSystemReader({
        watch: false,
      }), // required for TypeScript libs, e.g. Promise
    ]);
    frameworkPlugin = await vue2FrameworkPlugin.create({
      rootDirPath,
      dependencies: {},
      reader,
      logger,
    });
  });

  afterEach(() => {
    frameworkPlugin.dispose();
  });

  it("detects expected components", async () => {
    memoryReader.updateFile(
      APP_TSX,
      `
const Component1 = () => {
  return <div>Hello, World!</div>;
};

function Component2() {
  return <div>Hello, World!</div>;
};

export const NotAStory = {
  args: {}
};

export default Component1;

`
    );
    expect(extract(APP_TSX)).toMatchObject([
      {
        componentId: "App.tsx:Component1",
        kind: "component",
        exported: true,
      },
      {
        componentId: "App.tsx:Component2",
        kind: "component",
        exported: false,
      },
    ]);
  });

  it("detects components without any Vue import", async () => {
    memoryReader.updateFile(
      APP_TSX,
      `
export function DeclaredFunction() {
  return <div>Hello, World!</div>;
}

const ConstantFunction = () => <div>Hello, World!</div>;
`
    );
    expect(extract(APP_TSX)).toMatchObject([
      {
        componentId: "App.tsx:DeclaredFunction",
        kind: "component",
        exported: true,
      },
      {
        componentId: "App.tsx:ConstantFunction",
        kind: "component",
        exported: false,
      },
    ]);
  });

  it("detects default export component (arrow function)", async () => {
    memoryReader.updateFile(
      APP_TSX,
      `
export default () => {
  return <div>Hello, World!</div>;
}
`
    );
    expect(extract(APP_TSX)).toMatchObject([
      {
        componentId: "App.tsx:default",
        kind: "component",
        exported: true,
      },
    ]);
  });

  it("detects default export component (named function)", async () => {
    memoryReader.updateFile(
      APP_TSX,
      `
export default function test(){
  return <div>Hello, World!</div>;
}
`
    );
    expect(extract(APP_TSX)).toMatchObject([
      {
        componentId: "App.tsx:test",
        kind: "component",
        exported: true,
      },
    ]);
  });

  it("detects default export component (anonymous function)", async () => {
    memoryReader.updateFile(
      APP_TSX,
      `
export default function(){
  return <div>Hello, World!</div>;
}
`
    );
    expect(extract(APP_TSX)).toMatchObject([
      {
        componentId: "App.tsx:default",
        kind: "component",
        exported: true,
      },
    ]);
  });

  it("detects CSF1 stories (exported with component)", async () => {
    memoryReader.updateFile(
      APP_STORIES_TSX,
      `
import Button from "./MyComponent.vue";

export default {
  component: Button
}

export const Primary = () => ({
  components: { Button },
  template: '<Button primary label="Button" />',
});
`
    );

    const extractedStories = extract(APP_STORIES_TSX);
    expect(extractedStories).toMatchObject([
      {
        componentId: "App.stories.tsx:Primary",
        kind: "story",
        args: null,
        associatedComponent: {
          componentId: "MyComponent.vue:MyComponent",
        },
      },
    ]);
    const storyInfo = extractedStories[0];
    if (storyInfo?.kind !== "story" || !storyInfo.associatedComponent) {
      throw new Error();
    }
    expect(await storyInfo.associatedComponent.extractProps()).toEqual({
      props: objectType({
        label: STRING_TYPE,
      }),
      types: {},
    });
  });

  it("detects CSF1 stories (exported with title)", async () => {
    memoryReader.updateFile(
      APP_STORIES_TSX,
      `
import Button from "./MyComponent.vue";

export default {
  title: "Stories"
}

export const Primary = () => ({
  components: { Button },
  template: '<Button primary label="Button" />',
});
`
    );

    const extractedStories = extract(APP_STORIES_TSX);
    expect(extractedStories).toMatchObject([
      {
        componentId: "App.stories.tsx:Primary",
        kind: "story",
        args: null,
        associatedComponent: null,
      },
    ]);
  });

  it("detects CSF2 stories (exported with component)", async () => {
    memoryReader.updateFile(
      APP_STORIES_TSX,
      `
import Button from "./MyComponent.vue";

export default {
  component: Button
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Button },
});

export const Primary = Template.bind({});

Primary.args = {
  primary: true,
  label: 'Button',
};
`
    );

    const extractedStories = extract(APP_STORIES_TSX);
    expect(extractedStories).toMatchObject([
      {
        componentId: "App.stories.tsx:Primary",
        kind: "story",
        args: {
          value: object([
            {
              kind: "key",
              key: string("primary"),
              value: TRUE,
            },
            {
              kind: "key",
              key: string("label"),
              value: string("Button"),
            },
          ]),
        },
        associatedComponent: {
          componentId: "MyComponent.vue:MyComponent",
        },
      },
    ]);
    const storyInfo = extractedStories[0];
    if (storyInfo?.kind !== "story" || !storyInfo.associatedComponent) {
      throw new Error();
    }
    expect(await storyInfo.associatedComponent.extractProps()).toEqual({
      props: objectType({
        label: STRING_TYPE,
      }),
      types: {},
    });
  });

  it("detects CSF2 stories (exported with title)", async () => {
    memoryReader.updateFile(
      APP_STORIES_TSX,
      `
import Button from "./MyComponent.vue";

export default {
  title: "Stories"
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Button },
});

export const Primary = Template.bind({});

Primary.args = {
  primary: true,
  label: 'Button',
};
`
    );

    const extractedStories = extract(APP_STORIES_TSX);
    expect(extractedStories).toMatchObject([
      {
        componentId: "App.stories.tsx:Primary",
        kind: "story",
        args: {
          value: object([
            {
              kind: "key",
              key: string("primary"),
              value: TRUE,
            },
            {
              kind: "key",
              key: string("label"),
              value: string("Button"),
            },
          ]),
        },
        associatedComponent: null,
      },
    ]);
  });

  it("detects CSF3 stories (exported with component)", async () => {
    memoryReader.updateFile(
      APP_STORIES_TSX,
      `
import Button from './MyComponent.vue';

export default {
  component: Button
}

export const Example = {
  args: {
    label: "Hello, World!"
  }
}
export const NoArgs = {}
export function NotStory() {}
`
    );

    const extractedStories = extract(APP_STORIES_TSX);
    expect(extractedStories).toMatchObject([
      {
        componentId: "App.stories.tsx:Example",
        kind: "story",
        args: {
          value: object([
            {
              kind: "key",
              key: string("label"),
              value: string("Hello, World!"),
            },
          ]),
        },
        associatedComponent: {
          componentId: "MyComponent.vue:MyComponent",
        },
      },
      {
        componentId: "App.stories.tsx:NoArgs",
        kind: "story",
        args: null,
        associatedComponent: {
          componentId: "MyComponent.vue:MyComponent",
        },
      },
    ]);
    const storyInfo = extractedStories[0];
    if (storyInfo?.kind !== "story" || !storyInfo.associatedComponent) {
      throw new Error();
    }
    expect(await storyInfo.associatedComponent.extractProps()).toEqual({
      props: objectType({
        label: STRING_TYPE,
      }),
      types: {},
    });
  });

  it("detects CSF3 stories (exported with title)", async () => {
    memoryReader.updateFile(
      APP_STORIES_TSX,
      `
import Button from './MyComponent.vue';

export default {
  title: "Stories"
}

export const Example = {
  args: {
    label: "Hello, World!"
  }
}
export const NoArgs = {}
export function NotStory() {}
`
    );

    const extractedStories = extract(APP_STORIES_TSX);
    expect(extractedStories).toMatchObject([
      {
        componentId: "App.stories.tsx:Example",
        kind: "story",
        args: {
          value: object([
            {
              kind: "key",
              key: string("label"),
              value: string("Hello, World!"),
            },
          ]),
        },
        associatedComponent: null,
      },
      {
        componentId: "App.stories.tsx:NoArgs",
        kind: "story",
        args: null,
        associatedComponent: null,
      },
    ]);
  });

  function extract(absoluteFilePath: string) {
    return extractVueComponents(
      memoryReader,
      frameworkPlugin.typeAnalyzer.analyze([absoluteFilePath]),
      ROOT_DIR,
      absoluteFilePath
    );
  }
});
