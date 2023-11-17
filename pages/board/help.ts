import { gray, white, green, mergeRBGs, red, yellow } from "@jhuggett/terminal";
import { Cursor } from "@jhuggett/terminal/cursors/cursor";
import { Element } from "@jhuggett/terminal/elements/element";
import { SubscribableEvent } from "@jhuggett/terminal/subscribable-event";

export type Instruction = {
  info: string;
  command: string;
};

let helpContent: Instruction[] | undefined = undefined;
const onHelpContentChange = new SubscribableEvent<Instruction[]>();

export const setHelpContent = (content: Instruction[]) => {
  helpContent = content;
  onHelpContentChange.emit(content);
};

export const helpComponent = (parent: Element<any>) => {
  const component = parent.createChildElement(() => {
    return {
      start: {
        x: parent.bounds.globalStart.x + 2,
        y: parent.bounds.globalEnd.y - 4,
      },
      end: {
        x: parent.bounds.globalEnd.x - 2,
        y: parent.bounds.globalEnd.y - 1,
      },
    };
  }, {});

  component.setConstantZ(1000);

  component.renderer = ({ cursor }) => {
    if (!helpContent) {
      return;
    }
    cursor.properties.backgroundColor = gray(0.2, 0.95);
    cursor.fill(" ");

    cursor.moveTo({ x: 2, y: 1 });

    const commandColor = mergeRBGs(red(1, 0.25), yellow());
    const infoColor = gray(0.75);

    for (const { info, command } of helpContent) {
      if (
        cursor.location.x + info.length + command.length + 5 <
        component.bounds.width
      ) {
        if (command !== helpContent[0].command) {
          cursor.write(" / ", { foregroundColor: infoColor });
        }

        cursor.write(info, { foregroundColor: infoColor });
        cursor.write(" " + command + " ", {
          foregroundColor: commandColor,
          bold: true,
        });
      }
    }
  };

  onHelpContentChange.subscribe(() => {
    component.render();
  });

  return component;
};
