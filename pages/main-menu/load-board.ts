import { Element, OutOfBoundsError } from "@jhuggett/terminal/elements/element";
import { Page } from "../page";
import { titleComponent } from "./title";
import { MainMenuPage } from "./main-menu";
import { mergeRBGs, red, white, yellow } from "@jhuggett/terminal";
import { below, within } from "@jhuggett/terminal/bounds/bounds";
import { BoardPage } from "../board/board";
import { Board } from "../../models/boards/board";
import { Shell } from "@jhuggett/terminal/shells/shell";

export class LoadBoardPage extends Page {
  boards: Board[];

  constructor(shell: Shell, boards: Board[]) {
    super(shell);
    this.boards = boards;
  }

  async run(
    root: Element<null>,
    nextUserInteraction: () => Promise<void>,
    render: () => void
  ) {
    let shouldContinue = true;
    let nextPage: null | Page = null;

    root.on("Escape", () => {
      shouldContinue = false;
    });

    const menuWidth = 75;
    const menuHeight = 25;

    const menuBox = root.createChildElement(() => {
      const rootMiddle = {
        x: Math.round(root.bounds.width / 2),
        y: Math.round(root.bounds.height / 2),
      };

      return {
        start: {
          x: rootMiddle.x - Math.round(menuWidth / 2),
          y: rootMiddle.y - Math.round(menuHeight / 2),
        },
        end: {
          x: rootMiddle.x + Math.round(menuWidth / 2),
          y: rootMiddle.y + Math.round(menuHeight / 2),
        },
      };
    }, {});
    menuBox.renderer = ({ cursor }) => {};
    menuBox.render();

    const menuTitle = titleComponent(menuBox);

    menuTitle.render();

    const options = this.boards.map((board) => {
      return {
        name: board.name,
        action: () => {
          nextPage = new BoardPage(this.shell, board);
        },
      };
    });

    const boardSelector = menuBox.createChildElement(
      () =>
        below(menuTitle, within(menuBox, { height: options.length + 19 }), {
          spacing: 2,
        }),
      {
        selectedOption: 0,
      }
    );
    boardSelector.renderer = ({ cursor, properties }) => {
      cursor.moveToStart();
      for (const [i, option] of options.entries()) {
        const selected = properties.selectedOption === i;
        cursor.properties.bold = selected;
        if (selected) {
          cursor.properties.foregroundColor = mergeRBGs(
            white(1, 0.8),
            mergeRBGs(red(1, 0.25), yellow(1, 0.5))
          );
          cursor.write("-> ");
        } else {
          cursor.properties.foregroundColor = white(0.75);
          cursor.write("   ");
        }
        cursor.write(option.name);
        try {
          cursor.newLine();
        } catch (error) {
          if (error instanceof OutOfBoundsError) {
            break;
          } else {
            throw error;
          }
        }
      }
    };

    boardSelector.on("Arrow Up", () => {
      if (boardSelector.properties.selectedOption > 0) {
        boardSelector.reactivelyUpdateProperties(({ selectedOption }) => ({
          selectedOption: selectedOption - 1,
        }));
      }
    });
    boardSelector.on("Arrow Down", () => {
      if (boardSelector.properties.selectedOption < options.length - 1) {
        boardSelector.reactivelyUpdateProperties(({ selectedOption }) => ({
          selectedOption: selectedOption + 1,
        }));
      }
    });
    boardSelector.on("Enter", () => {
      options[boardSelector.properties.selectedOption].action();
    });

    boardSelector.render();
    boardSelector.focus();

    let i = 0;
    while (shouldContinue && !nextPage) {
      i++;
      render();
      await nextUserInteraction();
    }

    return nextPage || new MainMenuPage(this.shell);
  }
}
