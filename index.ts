import {
  BunShell,
  UnknownKeyCodeError,
  black,
  green,
  white,
} from "@jhuggett/terminal";
import { MainMenuPage } from "./pages/main-menu/main-menu";
import { Page } from "./pages/page";

const shell = new BunShell();
shell.showCursor(false);
shell.clear();

const root = shell.rootElement;

shell.onWindowResize(() => {
  shell.invalidateCachedSize();
  shell.clear();
  root.recalculateBounds();
  shell.render();
});

const debugging = false;

const content = root.createChildElement(() => {
  if (!debugging) {
    return {
      start: { x: 0, y: 0 },
      end: { x: Math.round(root.bounds.width), y: root.bounds.height },
    };
  }

  return {
    start: { x: 0, y: 0 },
    end: { x: Math.round(root.bounds.width * 0.5), y: root.bounds.height },
  };
}, null);

const debug = root.createChildElement(
  () => {
    if (!debugging) {
      return { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    }

    return {
      start: { x: Math.round(root.bounds.width * 0.5), y: 0 },
      end: { x: root.bounds.width, y: root.bounds.height },
    };
  },
  {
    logs: ["Debug here"],
  }
);

debug.setConstantZ(9999);

debug.renderer = ({ cursor, properties }) => {
  cursor.properties.foregroundColor = white();
  //cursor.fill(" ");
  cursor.moveToStart();

  let brightness = 0;

  cursor.autoNewLine = false;
  try {
    for (const log of properties.logs) {
      cursor.properties.foregroundColor = white(
        Math.max(1 - brightness || 0, 0.25)
      );
      cursor.write(log);
      cursor.carriageReturn();
      cursor.moveDown();
      brightness += 1 / debug.bounds.height;
    }
  } catch (error) {}
};

if (debugging) {
  debug.render();
}

export const debugLog = (log: any) => {
  if (!debugging) return;

  log = Bun.inspect(log);

  log = [`${new Date().toLocaleTimeString()}: `, ...log].join("");
  log = log.split(`\n`) as string[];

  debug.reactivelyUpdateProperties(({ logs }) => {
    const logParts = [];
    for (const line of log) {
      const splitLogs = [];
      for (let i = 0; i < line.length; i += debug.bounds.width) {
        splitLogs.push(line.slice(i, i + debug.bounds.width));
      }
      logParts.push(...splitLogs);
    }
    logs.unshift(...logParts);

    const maxHeight = debug.bounds.height;

    if (logs.length >= maxHeight) {
      return { logs: logs.slice(0, maxHeight - 1) };
    }
    return { logs };
  });
};

content.focus();

let page: Page | null = new MainMenuPage(shell);

while (page) {
  content.clearThisAndEverythingAbove();
  content.destroyChildren();
  try {
    page = await page.run(
      content,
      () => shell.userInteraction(),
      () => shell.render()
    );
  } catch (e) {
    if (e instanceof UnknownKeyCodeError) {
      debugLog(e);
    } else {
      throw e;
    }
  }
}

shell.clear();
shell.showCursor(true);

// _   _       _                          _   _
// | \ | |     | |                        | | | |
// |  \| | ___ | |_ _____      _____  _ __| |_| |__  _   _
// | . ` |/ _ \| __/ _ \ \ /\ / / _ \| '__| __| '_ \| | | |
// | |\  | (_) | ||  __/\ V  V / (_) | |  | |_| | | | |_| |
// |_| \_|\___/ \__\___| \_/\_/ \___/|_|   \__|_| |_|\__, |
//                                                    __/ |
//                                                   |___/
