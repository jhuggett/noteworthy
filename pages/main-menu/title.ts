import { mergeRBGs, red, yellow, white } from "@jhuggett/terminal";
import { within } from "@jhuggett/terminal/bounds/bounds";
import { Element } from "@jhuggett/terminal/elements/element";

// __ ___   ___                    ___ ___
// | \| |___| |_ _____ __ _____ _ _| |_| |_ _  _
// | .` / _ \  _/ -_) V  V / _ \ '_|  _| ' \ || |
// |_|\_\___/\__\___|\_/\_/\___/_|  \__|_||_\_, |
//                                          |__/
// A note taking app for the terminal

export const titleComponent = (root: Element<any>) => {
  const menuTitle = root.createChildElement(() => {
    return within(root, { height: 6 });
  }, {});
  menuTitle.renderer = ({ cursor }) => {
    cursor.write("__ ___   ___                    ___ ___", {
      foregroundColor: mergeRBGs(red(1, 0.25), yellow()),
      bold: true,
    });
    cursor.newLine();
    cursor.write(`| \\| |___| |_ _____ __ _____ _ _| |_| |_ _  _`, {
      foregroundColor: mergeRBGs(red(1, 0.25), yellow()),
      bold: true,
    });
    cursor.newLine();
    cursor.write("| .` / _ \\  _/ -_) V  V / _ \\ '_|  _| ' \\ || |", {
      foregroundColor: mergeRBGs(red(1, 0.25), yellow()),
      bold: true,
    });
    cursor.newLine();
    cursor.write("|_|\\_\\___/\\__\\___|\\_/\\_/\\___/_|  \\__|_||_\\_, |", {
      foregroundColor: mergeRBGs(red(1, 0.25), yellow()),
      bold: true,
    });
    cursor.newLine();
    cursor.write("                                         |__/ ", {
      foregroundColor: mergeRBGs(red(1, 0.25), yellow()),
      bold: true,
    });
    cursor.newLine();
    cursor.write("A note taking app for the terminal", {
      foregroundColor: white(0.75),
      italic: true,
    });
  };

  return menuTitle;
};
