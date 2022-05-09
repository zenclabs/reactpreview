import clsx from "clsx";
import React from "react";

export const VariantButton: React.FC<{
  children: React.ReactNode;
  warning?: boolean;
  title?: string;
  onClick(): void;
}> = (props) => (
  <button
    className={clsx([
      "self-stretch flex flex-row items-center bg-blue-100 text-blue-900 hover:bg-blue-200 border-2 border-blue-200 hover:border-blue-500 my-1 ml-2 px-2 py-1 mr-2 text-sm font-semibold rounded whitespace-nowrap",
      props.warning &&
        "bg-orange-300 hover:bg-orange-200 text-orange-900 hover:text-orange-800 border-orange-400 hover:border-orange-500",
    ])}
    onClick={props.onClick}
    title={props.title}
  >
    {props.children}
  </button>
);
