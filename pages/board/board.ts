import { Element } from "@jhuggett/terminal/elements/element";
import { Page } from "../page";
import { black, gray, green, white } from "@jhuggett/terminal";
import {
  NoteComponent,
  noteBackgroundComponent,
} from "../../components/notes/note";
import { XY, subtractXY } from "@jhuggett/terminal/xy";
import {
  SubscribableEvent,
  SubscriptionManager,
} from "@jhuggett/terminal/subscribable-event";
import { helpComponent, setHelpContent } from "./help";
import { MainMenuPage } from "../main-menu/main-menu";
import { Board } from "../../models/boards/board";
import { Shell } from "@jhuggett/terminal/shells/shell";
import { Note } from "../../models/notes/note";
import { within } from "@jhuggett/terminal/bounds/bounds";
import { debugLog } from "../..";

export class BoardPage extends Page {
  notes: NoteComponent[] = [];

  board: Board;

  constructor(shell: Shell, board: Board) {
    super(shell);
    this.board = board;
  }

  subscriptions = new SubscriptionManager();

  lastFocusedNote: NoteComponent | null = null;
  rotateFocus() {
    if (this.notes.length === 0) return;
    if (this.lastFocusedNote === null || this.notes.length === 1) {
      this.focusOnNote(this.notes[0]);
      return;
    }
    for (const [index, note] of this.notes.entries()) {
      if (note === this.lastFocusedNote) {
        const nextIndex = index + 1;
        if (nextIndex < this.notes.length) {
          this.focusOnNote(this.notes[nextIndex]);
        } else {
          this.focusOnNote(this.notes[0]);
        }
        return;
      }
    }
  }

  destroy() {
    this.subscriptions.unsubscribeAll();
    for (const note of this.notes) {
      note.destroy();
    }
  }

  focusOnNote(note: NoteComponent) {
    this.lastFocusedNote = note;
    note.backgroundElement.focus();
  }

  draggingElement: ReturnType<typeof noteBackgroundComponent> | null = null;
  lastDragLocation: XY | null = null;

  addNoteComponent(root: Element<null>, note: Note) {
    const component = new NoteComponent(root, note, this.board);
    component.backgroundElement.on("Mouse down", () => {
      this.draggingElement = component.backgroundElement;
      this.lastDragLocation = null;

      if (component.backgroundElement.isFocused) {
        component.contentElement.focus();
      } else {
        this.focusOnNote(component);
      }

      return "stop propagation";
    });

    component.backgroundElement.on("-", () => {
      this.board.removeNote(note);
      component.destroy();
    });

    component.subscriptions.addMultiple([
      component.backgroundElement.onFocus.subscribe(() => {
        component.backgroundElement.moveInFrontOf(this.foregroundElement!);
      }),
      component.backgroundElement.onBlur.subscribe(() => {
        component.backgroundElement.moveInFrontOf(this.backgroundElement!);
      }),
    ]);

    this.focusOnNote(component);

    this.notes.push(component);
  }

  root: Element<null> | null = null;

  foregroundElement?: Element<null>;
  backgroundElement?: Element<null>;
  async run(
    root: Element<null>,
    nextUserInteraction: () => Promise<void>,
    render: () => void
  ): Promise<Page | null> {
    let shouldContinue = true;

    this.root = root;

    this.backgroundElement = root.createChildElement(() => within(root), null);
    this.foregroundElement = this.backgroundElement!.createChildElement(
      () => within(this.backgroundElement!),
      null
    );

    for (const note of this.board.notes) {
      this.addNoteComponent(root, note);
    }

    root.on("Escape", () => {
      shouldContinue = false;
    });
    root.on("+", () => {
      const note = this.board.newNote();
      note.position = {
        x: Math.floor(
          this.board.offset.x + root.bounds.width / 2 - note.maxLineWidth / 2
        ),
        y: Math.floor(
          this.board.offset.y + root.bounds.height / 2 - note.minHeight / 2
        ),
      };
      this.addNoteComponent(root, note);
    });
    root.on("Mouse down", (xy) => {
      this.lastDragLocation = null;
      this.draggingElement = null;
      root.focus();
    });
    root.on("Mouse up", () => {
      this.lastDragLocation = null;
      this.draggingElement = null;
      root.focus();
    });
    root.on("Tab", () => {
      this.rotateFocus();
    });
    root.on("Mouse drag", (location) => {
      const globalLocation = root.bounds.toGlobal(location);
      if (!this.draggingElement) {
        if (this.lastDragLocation) {
          const delta = subtractXY([globalLocation, this.lastDragLocation]);
          this.board.setOffset({
            x: this.board.offset.x - delta.x,
            y: this.board.offset.y - delta.y,
          });
        }
        this.lastDragLocation = globalLocation;
        return;
      }

      if (this.lastDragLocation) {
        const delta = subtractXY([globalLocation, this.lastDragLocation]);
        this.draggingElement.properties.note.setPosition({
          x: this.draggingElement.properties.note.position.x + delta.x,
          y: this.draggingElement.properties.note.position.y + delta.y,
        });

        if (this.draggingElement.isFocused === false) {
          this.draggingElement.focus();
        }
      }
      this.lastDragLocation = globalLocation;

      return "stop propagation";
    });
    root.renderer = ({ cursor }) => {
      cursor.properties.bold = true;
      cursor.properties.backgroundColor = black();
      cursor.properties.foregroundColor = gray(0.1);
      cursor.fill("•");
    };
    root.render();

    this.subscriptions.add(
      root.onFocus.subscribe(() => {
        setHelpContent([
          {
            info: "New note",
            command: "+",
          },
          {
            info: "Focus note",
            command: "Mouse Click",
          },
          {
            info: "Rotate focus",
            command: "Tab",
          },
          {
            info: "Move board",
            command: "Mouse Drag",
          },
          {
            info: "Exit board",
            command: "Esc",
          },
        ]);
      })
    );

    root.focus();

    const help = helpComponent(root);
    help.render();

    while (shouldContinue) {
      render();
      await nextUserInteraction();
    }

    this.destroy();
    this.board.save();

    return new MainMenuPage(root.shell);
  }
}
