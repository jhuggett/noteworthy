import {
  RGB,
  blue,
  cyan,
  green,
  magenta,
  mergeRBGs,
  red,
  yellow,
} from "@jhuggett/terminal";
import { SubscribableEvent } from "@jhuggett/terminal/subscribable-event";
import { XY } from "@jhuggett/terminal/xy";
import { debugLog } from "../..";

const colorLightness = 0.5;

export const colors = [
  yellow(colorLightness),
  red(colorLightness),
  blue(colorLightness),
  green(colorLightness),
  cyan(colorLightness),
  magenta(colorLightness),
  mergeRBGs(yellow(colorLightness, 0.5), red(colorLightness)),
  mergeRBGs(yellow(colorLightness, 0.5), blue(colorLightness)),
  mergeRBGs(red(colorLightness, 0.5), green(colorLightness)),
  mergeRBGs(blue(colorLightness, 0.5), cyan(colorLightness)),
];

export class Note {
  maxLineWidth: number = 20;
  minHeight: number = 10;

  constructor(
    public content: string[],
    public position: XY,
    public color: RGB
  ) {}

  onContentChange = new SubscribableEvent<string[]>();

  addCharacter(character: string) {
    let lastLine = this.content[this.content.length - 1];
    if (lastLine === undefined) {
      this.content.push(character);
    } else {
      lastLine = lastLine + character;
      if (lastLine.length > this.maxLineWidth) {
        const words = lastLine.split(" ");
        lastLine = words[words.length - 1];
        if (words.length === 1) {
          this.content.push(character);
        } else {
          const nextLine = words.pop();
          this.content[this.content.length - 1] = words.join(" ");
          const isSpace = character === " ";
          this.content.push(isSpace ? "" : nextLine || character);
        }
      } else {
        this.content[this.content.length - 1] = lastLine;
      }
    }

    this.onContentChange.emit(this.content);
  }

  newLine() {
    this.content.push("");
    this.onContentChange.emit(this.content);
  }

  backspace() {
    if (this.content.length === 0) {
      return;
    }
    let lastLine = this.content[this.content.length - 1];
    if (lastLine.length === 0) {
      this.content.pop();
    } else {
      lastLine = lastLine.slice(0, -1);
      this.content[this.content.length - 1] = lastLine;
    }
    this.onContentChange.emit(this.content);
  }

  setPosition(position: XY) {
    this.position = position;
    this.onPositionChange.emit(position);
  }
  onPositionChange = new SubscribableEvent<XY>();

  setColor(color: RGB) {
    this.color = color;
    this.onColorChange.emit(color);
  }
  onColorChange = new SubscribableEvent<RGB>();

  data() {
    return {
      content: this.content,
      position: this.position,
      color: this.color,
    };
  }

  static load(data: ReturnType<Note["data"]>) {
    return new Note(
      data.content,
      { x: data.position.x, y: data.position.y },
      { r: data.color.r, g: data.color.g, b: data.color.b, a: data.color.a }
    );
  }
}
