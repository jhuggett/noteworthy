import { Element } from "@jhuggett/terminal/elements/element";
import { Page } from "./page";
import { blue, gray, green, red, white, yellow } from "@jhuggett/terminal";
import { debugLog } from "..";
import { Note } from "../models/notes/note";
import { NoteComponent } from "../components/notes/note";
import { XY, subtractXY } from "@jhuggett/terminal/xy";

const helpComponent = (parent: Element<any>) => {
  const component = parent.createChildElement(() => {
    return {
      start: {
        x: parent.bounds.globalStart.x + 2,
        y: parent.bounds.globalStart.y + 1,
      },
      end: {
        x: parent.bounds.globalEnd.x - 2,
        y: parent.bounds.globalStart.y + 4,
      },
    };
  }, {});

  component.renderer = ({ cursor }) => {
    cursor.properties.backgroundColor = gray(0.2);
    cursor.fill(" ");

    cursor.moveTo({ x: 2, y: 1 });

    cursor.properties.foregroundColor = white();
    cursor.write("Press ");
    cursor.write("+", {
      bold: true,
      foregroundColor: green(),
    });
    cursor.write(" to create a new note.");
  };

  return component;
};

export class BoardPage extends Page {
  notes: NoteComponent[] = [];

  unfocusedNoteZ: number = -1;

  lastFocusedNote = -1;
  rotateFocus() {
    const previouslyFocusedNote = this.notes[this.lastFocusedNote];
    this.lastFocusedNote++;
    if (this.lastFocusedNote >= this.notes.length) {
      this.lastFocusedNote = 0;
    }
    if (this.notes.length === 0) {
      return;
    }
    const note = this.notes[this.lastFocusedNote];
    if (
      previouslyFocusedNote &&
      previouslyFocusedNote.backgroundElement.parent
    ) {
      previouslyFocusedNote.backgroundElement.moveInFrontOf(
        previouslyFocusedNote.backgroundElement.parent
      );
    }
    if (note) {
      if (previouslyFocusedNote) {
        note.backgroundElement.moveInFrontOf(
          previouslyFocusedNote.contentElement
        );
      }
      note.backgroundElement.focus();
    }
  }

  draggingElement: Element<any> | null = null;
  lastDragLocation: XY | null = null;

  async run(
    root: Element<null>,
    nextUserInteraction: () => Promise<void>,
    render: () => void
  ): Promise<Page | null> {
    let shouldContinue = true;

    root.on("Escape", () => {
      shouldContinue = false;
    });
    root.on("+", () => {
      const newNote = new NoteComponent(root);
      newNote.backgroundElement.on("Mouse down", () => {
        this.lastDragLocation = null;
        this.draggingElement = newNote.backgroundElement;

        newNote.backgroundElement.focus();

        return "stop propagation";
      });
      this.notes.push(newNote);
    });
    root.on("Mouse down", () => {
      this.lastDragLocation = null;
      if (this.draggingElement) {
        root.focus();
      }
      this.draggingElement = null;
    });
    root.on("Tab", () => {
      this.rotateFocus();
    });
    root.on("Mouse drag", (location) => {
      if (!this.draggingElement) return;

      const globalLocation = root.bounds.toGlobal(location);

      if (this.lastDragLocation) {
        const delta = subtractXY([globalLocation, this.lastDragLocation]);

        this.draggingElement.reactivelyUpdateProperties(
          ({ start }) => ({
            start: {
              x: start.x + delta.x,
              y: start.y + delta.y,
            },
          }),
          true
        );
      }
      this.lastDragLocation = globalLocation;

      return "stop propagation";
    });
    root.renderer = ({ cursor }) => {
      cursor.properties.bold = true;
      cursor.properties.backgroundColor = gray(0.03);
      cursor.properties.foregroundColor = gray(0.2);
      cursor.fill("•"); // using ┼ slows it down a lot, don't understand why
    };
    root.render();

    root.focus();

    const help = helpComponent(root);
    help.render();

    while (shouldContinue) {
      render();
      await nextUserInteraction();
    }

    return null;
  }
}
