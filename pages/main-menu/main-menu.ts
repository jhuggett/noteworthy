import { mergeRBGs, red, white, yellow } from "@jhuggett/terminal";
import { Element } from "@jhuggett/terminal/elements/element";
import { combineXY } from "@jhuggett/terminal/xy";
import { Page } from "../page";
import { BoardPage } from "../board/board";
import { debugLog } from "../..";
import { title } from "process";
import { titleComponent } from "./title";
import { NewBoardPage } from "./new-board";
import { below, within } from "@jhuggett/terminal/bounds/bounds";
import { OutOfBoundsError } from "@jhuggett/terminal/cursors/cursor";
import { Board } from "../../models/boards/board";
import { LoadBoardPage } from "./load-board";

export class MainMenuPage extends Page {
  async run(
    root: Element<null>,
    nextUserInteraction: () => Promise<void>,
    render: () => void
  ) {
    let shouldContinue = true;
    let nextPage: null | Page = null;

    const boards = await Board.loadAll();

    const options = [
      {
        name: "New Board",
        action: () => {
          nextPage = new NewBoardPage(this.shell);
        },
      },
      {
        name: "Quit",
        action: () => {
          shouldContinue = false;
        },
      },
    ];

    if (boards.length > 0) {
      options.unshift({
        name: "Load Board",
        action: () => {
          nextPage = new LoadBoardPage(this.shell, boards);
        },
      });
    }

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

    const menuOptions = menuBox.createChildElement(
      () =>
        below(menuTitle, within(menuBox, { height: options.length }), {
          spacing: 2,
        }),
      {
        selectedOption: 0,
      }
    );
    menuOptions.renderer = ({ cursor, properties }) => {
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
    menuOptions.render();

    menuOptions.on("Arrow Up", () => {
      if (menuOptions.properties.selectedOption > 0) {
        menuOptions.reactivelyUpdateProperties(({ selectedOption }) => ({
          selectedOption: selectedOption - 1,
        }));
      }
    });
    menuOptions.on("Arrow Down", () => {
      if (menuOptions.properties.selectedOption < options.length - 1) {
        menuOptions.reactivelyUpdateProperties(({ selectedOption }) => ({
          selectedOption: selectedOption + 1,
        }));
      }
    });
    menuOptions.on("Enter", () => {
      options[menuOptions.properties.selectedOption].action();
    });

    menuOptions.focus();

    let i = 0;
    while (shouldContinue && !nextPage) {
      i++;
      render();
      await nextUserInteraction();
    }

    return nextPage;
  }
}
