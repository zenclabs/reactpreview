import { setupPreviews } from "@previewjs/plugin-react/setup";
import clsx from "clsx";
import { rCrop } from "ranges-crop";
import { Ranges, rMerge } from "ranges-merge";
import { rOffset } from "ranges-offset";
import React, { ReactNode, useEffect, useRef, useState } from "react";

export const SearchBox = ({
  items,
  onItemSelected,
}: {
  items: Array<{ name: string; filePath: string }>;
  onItemSelected(index: number): void;
}) => {
  const [rawSearch, setRawSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const highlightedItemRef = useRef<HTMLLIElement | null>(null);
  const filteredItems = items
    .map((item) => {
      const search = rawSearch.trim();
      if (!search) {
        return {
          item,
          nameRanges: [],
          filePathRanges: [],
        };
      }
      // Search through both item name and path in a single combined search.
      const ranges = match(`${item.name} ${item.filePath}`, rawSearch);
      const filePathPosition = item.name.length + 1;
      if (!ranges) {
        return null!;
      }
      return {
        item,
        nameRanges: rCrop(ranges, item.name.length),
        filePathRanges: rCrop(
          rOffset(
            ranges.filter((r) => r[0] >= filePathPosition),
            -filePathPosition
          ),
          item.filePath.length
        ),
      };
    })
    .filter(Boolean);
  const onFilteredItemSelected = (index = highlightedIndex) => {
    setHighlightedIndex(index);
    const selectedItemIndex = items.findIndex(
      (item) => item === filteredItems[index]?.item
    );
    if (selectedItemIndex > -1) {
      onItemSelected(selectedItemIndex);
    }
  };
  useEffect(() => {
    if (
      !containerRef.current ||
      !listRef.current ||
      !highlightedItemRef.current
    ) {
      return;
    }
    const minTop =
      highlightedItemRef.current.offsetTop - listRef.current.offsetTop;
    const maxTop =
      minTop -
      containerRef.current.offsetHeight +
      highlightedItemRef.current.offsetHeight;
    console.error(minTop, maxTop, containerRef.current.scrollTop);
    if (containerRef.current.scrollTop > minTop) {
      containerRef.current.scroll({
        behavior: "auto",
        top: minTop,
      });
    } else if (containerRef.current.scrollTop < maxTop) {
      containerRef.current.scroll({
        behavior: "auto",
        top: maxTop,
      });
    }
  }, [highlightedIndex]);
  return (
    <div className="w-96 flex flex-col">
      <input
        className="m-2 rounded-md font-mono p-2 font-semibold outline-none border-2 border-blue-100 focus:border-blue-500"
        autoComplete="off"
        placeholder="Button"
        value={rawSearch}
        onKeyDown={(e) => {
          switch (e.key) {
            case "ArrowDown":
              setHighlightedIndex(
                Math.min(filteredItems.length - 1, highlightedIndex + 1)
              );
              break;
            case "ArrowUp":
              setHighlightedIndex(Math.max(-1, highlightedIndex - 1));
              break;
            case "Enter":
              onFilteredItemSelected();
              break;
          }
        }}
        onChange={(e) => {
          setRawSearch(e.target.value);
          setHighlightedIndex(-1);
        }}
      />
      <div className="h-60 overflow-auto" ref={containerRef}>
        {filteredItems.length === 0 ? (
          <div className="p-2 text-gray-700 text-center">No results</div>
        ) : (
          <ul ref={listRef}>
            {filteredItems.map(({ item, nameRanges, filePathRanges }, i) => (
              <li
                key={i}
                className={clsx([
                  "flex flex-row px-3 py-2 cursor-pointer",
                  i === highlightedIndex
                    ? "bg-blue-200 font-bold"
                    : "hover:bg-blue-100 hover:font-semibold",
                ])}
                onClick={() => onFilteredItemSelected(i)}
                ref={i === highlightedIndex ? highlightedItemRef : null}
              >
                <div className="flex-grow mr-4 text-gray-900">
                  {bold(item.name, nameRanges)}
                </div>
                <div
                  className="truncate text-gray-400 font-medium"
                  style={{ direction: "rtl" }}
                >
                  {bold(item.filePath, filePathRanges)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

function match(text: string, search: string) {
  const words = search.split(" ").filter(Boolean);
  const matchedPortions: [number, number][] = [];
  for (const word of words) {
    // Exact matching, e.g. "test" will match "TeSt".
    const lowerCaseText = text.toLowerCase();
    const lowerCaseWord = word.toLowerCase();
    let foundMatch = false;
    let caseInsensitiveExactMatchPosition = -1;
    while (
      (caseInsensitiveExactMatchPosition = lowerCaseText.indexOf(
        lowerCaseWord,
        caseInsensitiveExactMatchPosition + 1
      )) !== -1
    ) {
      foundMatch = true;
      matchedPortions.push([
        caseInsensitiveExactMatchPosition,
        caseInsensitiveExactMatchPosition + word.length,
      ]);
    }
    if (foundMatch) {
      continue;
    }
    // Capital-based matching, e.g. "LCN" will match "LongComponentName".
    const wordCapitalParts = word.toUpperCase().split("");
    const regex = new RegExp(
      wordCapitalParts
        .map((wordPartStart) => `${escapeRegex(wordPartStart)}[a-z0-9_]*`)
        .join("")
    );
    const match = regex.exec(text);
    if (!match) {
      return null;
    }
    for (const m of match) {
      const position = text.indexOf(m);
      matchedPortions.push([position, position + m.length]);
    }
  }
  return rMerge(matchedPortions);
}

// https://stackoverflow.com/a/3561711/911298
function escapeRegex(string: string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function bold(text: string, ranges: Ranges) {
  if (!ranges?.length) {
    return text;
  }
  const parts: ReactNode[] = [];
  parts.push(text.slice(0, ranges[0]![0]));
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]!;
    parts.push(<b>{text.slice(range[0], range[1])}</b>);
    parts.push(
      text.slice(
        range[1],
        i === ranges.length - 1 ? text.length : ranges[i + 1]![0]
      )
    );
  }
  return parts;
}

setupPreviews(SearchBox, {
  example: {
    items: [
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Bar",
        filePath: "src/foo/Bar.tsx",
      },
      {
        name: "LongComponentName",
        filePath: "src/app/scripts/foo/bar/baz/qux/Bar.tsx",
      },
    ],
  },
  empty: {
    items: [],
  },
  many: {
    items: [
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
      {
        name: "Foo",
        filePath: "src/foo/Foo.tsx",
      },
    ],
  },
});
