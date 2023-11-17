import { white } from "@jhuggett/terminal";
import { Element } from "@jhuggett/terminal/elements/element";
import { XY } from "@jhuggett/terminal/xy";
import { setHelpContent } from "../../pages/board/help";
import { Note, colors } from "../../models/notes/note";
import { Board } from "../../models/boards/board";
import { debugLog } from "../..";
import { SubscriptionManager } from "@jhuggett/terminal/subscribable-event";

const noteContentComponent = (parent: Element<any>, note: Note) => {
  const component = parent.createChildElement(
    ({}) => {
      return {
        start: {
          x: parent.bounds.globalStart.x + 1,
          y: parent.bounds.globalStart.y + 1,
        },
        end: {
          x: parent.bounds.globalEnd.x - 1,
          y: parent.bounds.globalEnd.y - 1,
        },
      };
    },
    {
      note: note,
    }
  );

  component.renderer = ({ cursor, properties }) => {
    cursor.properties.foregroundColor = white();
    cursor.properties.foregroundColor.a = component.isFocused ? 1 : 0.85;

    cursor.properties.bold = !component.isFocused;

    cursor.autoNewLine = false;
    if (properties.note.content) {
      for (const line of properties.note.content) {
        try {
          cursor.write(line);
          cursor.newLine();
        } catch (error) {
          //debugLog(Bun.inspect(error));
        }
      }
    }
  };

  return component;
};

export const noteBackgroundComponent = (
  parent: Element<any>,
  startingBoardOffset: XY,
  note: Note
) => {
  const component = parent.createChildElement(
    ({ note, boardOffset }) => {
      return {
        start: {
          x: note.position.x - boardOffset.x,
          y: note.position.y - boardOffset.y,
        },
        end: {
          x: note.position.x - boardOffset.x + note.maxLineWidth + 2,
          y:
            note.position.y -
            boardOffset.y +
            Math.max(note.minHeight, note.content.length + 2),
        },
      };
    },
    {
      boardOffset: startingBoardOffset,
      note: note,
    }
  );

  component.renderer = ({ cursor, properties }) => {
    cursor.properties.backgroundColor = properties.note.color;
    cursor.properties.backgroundColor.a = component.isFocused ? 0.95 : 0.75;
    cursor.fill(" ");
  };

  component.on("Arrow Up", () => {
    note.setPosition({ x: note.position.x, y: note.position.y - 1 });
  });
  component.on("Arrow Down", () => {
    note.setPosition({ x: note.position.x, y: note.position.y + 1 });
  });
  component.on("Arrow Left", () => {
    note.setPosition({ x: note.position.x - 1, y: note.position.y });
  });
  component.on("Arrow Right", () => {
    note.setPosition({ x: note.position.x + 1, y: note.position.y });
  });

  return component;
};

export class NoteComponent {
  backgroundElement: ReturnType<typeof noteBackgroundComponent>;
  contentElement: ReturnType<typeof noteContentComponent>;

  subscriptions: SubscriptionManager = new SubscriptionManager();

  updateDecorativeCursorLocation() {
    const x = this.note.content[this.note.content.length - 1]?.length || 0;
    const y = this.note.content.length > 0 ? this.note.content.length - 1 : 0;

    this.root.shell.setDecorativeCursorLocation(
      this.contentElement.bounds.toGlobal({
        x,
        y,
      })
    );
  }

  destroy() {
    this.backgroundElement.destroy();
    this.backgroundElement.clear();
    this.contentElement.clear();

    this.subscriptions.unsubscribeAll();
  }

  constructor(
    private root: Element<any>,
    public note: Note,
    public board: Board
  ) {
    this.backgroundElement = noteBackgroundComponent(root, board.offset, note);
    this.contentElement = noteContentComponent(this.backgroundElement, note);

    this.subscriptions.add(
      board.onOffsetChange.subscribe((offset) => {
        this.backgroundElement.reactivelyUpdateProperties(
          () => ({
            boardOffset: offset,
          }),
          true
        );
      })
    );

    this.backgroundElement.on("Enter", () => {
      this.contentElement.focus();
    });
    this.backgroundElement.on("Any number", (key) => {
      const i = key;
      if (i >= 0 && i < colors.length) {
        this.note.setColor(colors[i]);
      }
    });

    this.subscriptions.addMultiple([
      this.contentElement.onFocus.subscribe(() => {
        this.root.shell.showCursor(true);
        this.updateDecorativeCursorLocation();
        this.contentElement.render();

        setHelpContent([
          {
            info: "Exit edit mode",
            command: "Esc",
          },
        ]);
      }),
      this.contentElement.onBlur.subscribe(() => {
        this.root.shell.showCursor(false);
        this.contentElement.render();
      }),
      this.note.onContentChange.subscribe((content) => {
        this.backgroundElement.recalculateBounds();
        this.contentElement.render();
        this.updateDecorativeCursorLocation();
      }),
      this.note.onColorChange.subscribe((color) => {
        this.backgroundElement.render();
      }),
      this.contentElement.onBlur.subscribe(() => {
        this.root.shell.showCursor(false);
      }),
      this.backgroundElement.onFocus.subscribe(() => {
        setHelpContent([
          {
            info: "Edit mode",
            command: "Enter",
          },
          {
            info: "Change color",
            command: "0-9",
          },
          {
            info: "Delete note",
            command: "-",
          },
          {
            info: "Move note",
            command: "Arrow keys",
          },
          {
            info: "Rotate focus",
            command: "Tab",
          },
          {
            info: "Exit board",
            command: "Escape",
          },
        ]);
        this.backgroundElement.render();
      }),
      this.backgroundElement.onBlur.subscribe(() => {
        this.backgroundElement.render();
      }),
      note.onPositionChange.subscribe(() => {
        this.backgroundElement.recalculateBounds();
      }),
    ]);

    this.contentElement.on("Escape", () => {
      this.backgroundElement.focus();
      return "stop propagation";
    });
    this.contentElement.on("Any character", (key) => {
      this.note.addCharacter(key);
      return "stop propagation";
    });
    this.contentElement.on("Delete", () => {
      this.note.backspace();
      return "stop propagation";
    });
    this.contentElement.on("Space", () => {
      this.note.addCharacter(" ");
      return "stop propagation";
    });
    this.contentElement.on("Enter", () => {
      this.note.newLine();
      return "stop propagation";
    });
    this.contentElement.on("Tab", () => {
      this.note.addCharacter(" ");
      this.note.addCharacter(" ");
      return "stop propagation";
    });
    this.backgroundElement.on("Mouse up", () => {
      return "stop propagation";
    });

    this.backgroundElement.render();
    this.contentElement.render();
  }
}
