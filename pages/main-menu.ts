import { red } from "@jhuggett/terminal";
import { Element } from "@jhuggett/terminal/elements/element";
import { debugLog } from "..";
import { combineXY } from "@jhuggett/terminal/xy";
import { Page } from "./page";
import { BoardPage } from "./board";

export class MainMenuPage extends Page {
  async run(
    root: Element<null>,
    nextUserInteraction: () => Promise<void>,
    render: () => void
  ) {
    let shouldContinue = true;
    let nextPage: null | Page = null;

    const options = [
      {
        name: "New Board",
        action: () => {
          nextPage = new BoardPage(this.shell);
        },
      },
      {
        name: "Quit",
        action: () => {
          shouldContinue = false;
        },
      },
    ];

    root.on("Escape", () => {
      shouldContinue = false;
    });

    const menuBox = root.createChildElement(() => {
      return {
        start: { x: 5, y: 2 },
        end: { x: root.bounds.width - 20, y: root.bounds.height - 10 },
      };
    }, {});
    menuBox.renderer = ({ cursor }) => {
      cursor.fill(" ");
    };
    menuBox.render();

    const menuTitle = menuBox.createChildElement(() => {
      return {
        start: combineXY([menuBox.bounds.globalStart, { x: 2, y: 1 }]),
        end: {
          x: menuBox.bounds.globalEnd.x - 2,
          y: menuBox.bounds.globalStart.y + 3,
        },
      };
    }, {});
    menuTitle.renderer = ({ cursor }) => {
      cursor.properties.bold = true;
      cursor.properties.underline = true;

      cursor.write("Notes:");

      cursor.properties.bold = false;
      cursor.properties.underline = false;
      cursor.properties.italic = true;

      cursor.write(" A note taking app for the terminal");
    };
    menuTitle.render();

    const menuOptions = menuBox.createChildElement(
      () => {
        return {
          start: {
            x: menuTitle.bounds.globalStart.x,
            y: menuTitle.bounds.globalEnd.y,
          },
          end: {
            x: menuTitle.bounds.globalEnd.x,
            y: menuBox.bounds.globalEnd.y,
          },
        };
      },
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
          cursor.write("> ");
        } else {
          cursor.write("  ");
        }
        cursor.write(option.name);
        cursor.moveDown();
        cursor.carriageReturn();
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
