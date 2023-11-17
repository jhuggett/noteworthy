import { Element } from "@jhuggett/terminal/elements/element";
import { Page } from "../page";
import { titleComponent } from "./title";
import { MainMenuPage } from "./main-menu";
import { red } from "@jhuggett/terminal";
import { below, within } from "@jhuggett/terminal/bounds/bounds";
import { BoardPage } from "../board/board";
import { Board } from "../../models/boards/board";

export class NewBoardPage extends Page {
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

    const boardNameInput = menuBox.createChildElement(
      () => {
        return below(menuTitle, within(menuBox, { height: 1 }), {
          spacing: 2,
        });
      },
      {
        name: "",
      }
    );
    boardNameInput.renderer = ({ cursor, properties }) => {
      cursor.write("Board name: ");
      cursor.write(properties.name);
    };
    boardNameInput.on("Any character", (character) => {
      boardNameInput.reactivelyUpdateProperties(({ name }) => ({
        name: name + character,
      }));
    });
    boardNameInput.on("Delete", () => {
      boardNameInput.reactivelyUpdateProperties(({ name }) => ({
        name: name.slice(0, -1),
      }));
    });
    boardNameInput.on("Enter", () => {
      if (!boardNameInput.properties.name) return;

      const boardName = boardNameInput.properties.name;
      const board = new Board([], boardName, { x: 0, y: 0 });

      nextPage = new BoardPage(this.shell, board);
    });

    boardNameInput.render();

    boardNameInput.focus();

    let i = 0;
    while (shouldContinue && !nextPage) {
      i++;
      render();
      await nextUserInteraction();
    }

    return nextPage || new MainMenuPage(this.shell);
  }
}
