import { join } from "path";
import { debugLog } from "../..";
import { Note, colors } from "../notes/note";
import { mkdirSync, readdirSync } from "fs";
import { yellow } from "@jhuggett/terminal";
import { XY } from "@jhuggett/terminal/xy";
import { SubscribableEvent } from "@jhuggett/terminal/subscribable-event";

export const dataPath = join(
  process.env.APPDATA ||
    (process.platform == "darwin"
      ? process.env.HOME + "/Library/Application Support"
      : process.env.HOME + "/.local/share"),
  "com.jhuggett.noteworthy"
);

export class Board {
  constructor(
    public notes: Note[] = [],
    public name: string,
    public offset: XY
  ) {}

  setOffset(offset: XY) {
    this.offset = offset;
    this.onOffsetChange.emit(offset);
  }

  onOffsetChange = new SubscribableEvent<XY>();

  newNote() {
    const note = new Note(
      [],
      { x: 0, y: 0 },
      colors[Math.floor(Math.random() * (colors.length - 1))]
    );
    this.notes.push(note);
    return note;
  }

  removeNote(note: Note) {
    this.notes = this.notes.filter((n) => n !== note);
  }

  data() {
    return {
      notes: this.notes.map((note) => note.data()),
      name: this.name,
      offset: this.offset,
    };
  }

  static load(data: ReturnType<Board["data"]>) {
    return new Board(
      data.notes.map((note) => Note.load(note)),
      data.name,
      data.offset
    );
  }

  async save() {
    const dir = join(dataPath, "boards");
    const filename = `${this.name}.json`;

    const filePath = join(dir, filename);

    mkdirSync(dir, { recursive: true });

    const json = JSON.stringify(this.data());

    await Bun.write(filePath, json);
  }

  static async loadAll() {
    const dir = join(dataPath, "boards");

    const files = readdirSync(dir);

    const boards: Board[] = [];

    for (const file of files) {
      const filePath = join(dir, file);
      const json = await Bun.file(filePath).text();
      boards.push(Board.load(JSON.parse(json)));
    }

    return boards;
  }
}
