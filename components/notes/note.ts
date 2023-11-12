import {
  blue,
  green,
  red,
  white,
  yellow,
  cyan,
  magenta,
  RGB,
} from "@jhuggett/terminal";
import { Element } from "@jhuggett/terminal/elements/element";
import { XY, subtractXY } from "@jhuggett/terminal/xy";
import { debugLog } from "../..";
import { SubscribableEvent } from "@jhuggett/terminal/subscribable-event";
import { border } from "@jhuggett/terminal/cursors/cursor";

const colorLightness = 0.3;

const colors = [
  yellow(colorLightness),
  red(colorLightness),
  blue(colorLightness),
  green(colorLightness),
  cyan(colorLightness),
  magenta(colorLightness),
];

const noteContentComponent = (parent: Element<any>) => {
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
      contents: [] as string[],
    }
  );

  component.renderer = ({ cursor, properties }) => {
    cursor.properties.foregroundColor = white();

    for (const line of properties.contents) {
      cursor.write(line);
      cursor.carriageReturn();
      if (cursor.location.y >= component.bounds.height) {
        break;
      }
    }
  };

  return component;
};

const noteBackgroundComponent = (
  parent: Element<any>,
  startingHeight: number
) => {
  const component = parent.createChildElement(
    ({ start, height }) => {
      const width = 25;
      return {
        start,
        end: {
          x: start.x + width,
          y: start.y + height,
        },
      };
    },
    {
      start: {
        x: Math.round(
          0.5 * parent.bounds.width + parent.bounds.globalStart.x - 10
        ),
        y: Math.round(
          0.5 * parent.bounds.height + parent.bounds.globalStart.y - 6
        ),
      },
      height: startingHeight,
      color: colors[0],
      focused: false,
    }
  );

  component.renderer = ({ cursor, properties }) => {
    cursor.properties.backgroundColor = properties.color;
    cursor.properties.backgroundColor.a = properties.focused ? 0.9 : 0.5;
    cursor.fill(" ");
  };

  component.on("Arrow Up", () => {
    component.reactivelyUpdateProperties(
      ({ start }) => ({
        start: { x: start.x, y: start.y - 1 },
      }),
      true
    );
  });
  component.on("Arrow Down", () => {
    component.reactivelyUpdateProperties(
      ({ start }) => ({
        start: { x: start.x, y: start.y + 1 },
      }),
      true
    );
  });
  component.on("Arrow Left", () => {
    component.reactivelyUpdateProperties(
      ({ start }) => ({
        start: { x: start.x - 1, y: start.y },
      }),
      true
    );
  });
  component.on("Arrow Right", () => {
    component.reactivelyUpdateProperties(
      ({ start }) => ({
        start: { x: start.x + 1, y: start.y },
      }),
      true
    );
  });

  return component;
};

export class NoteComponent {
  backgroundElement: ReturnType<typeof noteBackgroundComponent>;
  contentElement: ReturnType<typeof noteContentComponent>;

  content: string = "";
  wordWrappedContent() {
    const words = this.content.split(" ");

    const partedWords = words.map((word) => {
      let parts = [];
      for (
        let i = 0;
        i < word.length;
        i += this.contentElement.bounds.width - 1
      ) {
        parts.push(word.slice(i, i + this.contentElement.bounds.width - 1));
      }

      return parts;
    });

    const lines: string[] = [];

    let currentLine = "";
    for (const word of partedWords) {
      for (const part of word) {
        if (currentLine.length >= this.contentElement.bounds.width) {
          lines.push(currentLine);
          currentLine = "";
        }
        currentLine += part + " ";
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }
  onContentChange = new SubscribableEvent<string>();

  cursorLocationX = 0;
  onCursorLocationXChange = new SubscribableEvent<number>();

  moveCursorLeft() {
    if (this.cursorLocationX > 0) {
      this.cursorLocationX -= 1;
      this.onCursorLocationXChange.emit(this.cursorLocationX);
    }
  }

  moveCursorRight() {
    if (this.cursorLocationX < this.content.length) {
      this.cursorLocationX += 1;
      this.onCursorLocationXChange.emit(this.cursorLocationX);
    }
  }

  moveCursorUp() {
    if (this.cursorLocationX >= this.contentElement.bounds.width) {
      this.cursorLocationX -= this.contentElement.bounds.width;
    } else {
      this.cursorLocationX = 0;
    }
    this.onCursorLocationXChange.emit(this.cursorLocationX);
  }

  moveCursorDown() {
    if (
      this.cursorLocationX + this.contentElement.bounds.width <
      this.content.length
    ) {
      this.cursorLocationX += this.contentElement.bounds.width;
    } else {
      this.cursorLocationX = this.content.length;
    }
    this.onCursorLocationXChange.emit(this.cursorLocationX);
  }

  addCharacter(character: string) {
    this.content =
      this.content.slice(0, this.cursorLocationX) +
      character +
      this.content.slice(this.cursorLocationX);
    this.moveCursorRight();
    this.onContentChange.emit(this.content);
  }

  removeCharacter() {
    this.content =
      this.content.slice(0, this.cursorLocationX - 1) +
      this.content.slice(this.cursorLocationX);
    this.moveCursorLeft();
    this.onContentChange.emit(this.content);
  }

  lastDragLocation: XY | null = null;

  constructor(private root: Element<any>) {
    this.backgroundElement = noteBackgroundComponent(root, 3);
    this.contentElement = noteContentComponent(this.backgroundElement);

    this.contentElement.onFocus.subscribe(() => {
      this.root.shell.showCursor(true);
      this.onCursorLocationXChange.emit(this.cursorLocationX);
    });
    this.contentElement.onBlur.subscribe(() => {
      this.root.shell.showCursor(false);
    });

    this.onContentChange.subscribe((content) => {
      const wrappedContent = this.wordWrappedContent();

      const backgroundHeight = wrappedContent.length + 3;

      this.contentElement.properties.contents = wrappedContent;

      if (backgroundHeight !== this.backgroundElement.properties.height) {
        this.backgroundElement.reactivelyUpdateProperties(
          ({ height }) => ({
            height: backgroundHeight,
          }),
          true
        );
      } else {
        this.contentElement.render();
      }
    });

    this.onCursorLocationXChange.subscribe((cursorLocationX) => {
      const y = Math.floor(
        this.cursorLocationX / this.contentElement.bounds.width
      );
      const x = this.cursorLocationX % this.contentElement.bounds.width;

      this.root.shell.setDecorativeCursorLocation(
        this.contentElement.bounds.toGlobal({
          x,
          y,
        })
      );
    });

    this.backgroundElement.on("Enter", () => {
      debugLog("Enter");
      this.contentElement.focus();
    });
    this.backgroundElement.on("Any number", (key) => {
      const i = key;
      if (i >= 0 && i < colors.length) {
        this.backgroundElement.reactivelyUpdateProperties(() => ({
          color: colors[i],
        }));
      }
    });

    this.backgroundElement.onFocus.subscribe(() => {
      this.backgroundElement.reactivelyUpdateProperties(() => ({
        focused: true,
      }));
    });
    this.backgroundElement.onBlur.subscribe(() => {
      this.backgroundElement.reactivelyUpdateProperties(() => ({
        focused: false,
      }));
    });

    this.contentElement.on("Escape", () => {
      debugLog("Escape");
      this.backgroundElement.focus();
      return "stop propagation";
    });
    this.contentElement.on("Any character", (key) => {
      this.addCharacter(key);
      return "stop propagation";
    });
    this.contentElement.on("Delete", () => {
      this.removeCharacter();
      return "stop propagation";
    });
    this.contentElement.on("Space", () => {
      this.addCharacter(" ");
      return "stop propagation";
    });
    this.contentElement.on("Arrow Left", () => {
      this.moveCursorLeft();
      return "stop propagation";
    });
    this.contentElement.on("Arrow Right", () => {
      this.moveCursorRight();
      return "stop propagation";
    });
    this.contentElement.on("Arrow Up", () => {
      this.moveCursorUp();
      return "stop propagation";
    });
    this.contentElement.on("Arrow Down", () => {
      this.moveCursorDown();
      return "stop propagation";
    });

    this.backgroundElement.render();
    this.contentElement.render();
  }
}

/*
Word wrapping

Persisting boards

There's some rendering issues
*/
