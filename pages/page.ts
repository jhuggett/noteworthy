import { Element } from "@jhuggett/terminal/elements/element";
import { Shell } from "@jhuggett/terminal/shells/shell";

export abstract class Page {
  constructor(public shell: Shell) {}
  abstract run(
    root: Element<null>,
    nextUserInteraction: () => Promise<void>,
    render: () => void
  ): Promise<Page | null>;
}
