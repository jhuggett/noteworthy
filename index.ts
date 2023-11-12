import { BunShell, black, white } from "@jhuggett/terminal";
import { MainMenuPage } from "./pages/main-menu";
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

const debugging = true;

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

debug.renderer = ({ cursor, properties }) => {
  cursor.properties.bold = true;
  cursor.properties.backgroundColor = white(0.1);
  cursor.properties.foregroundColor = white();
  cursor.fill(" ");
  cursor.moveToStart();
  try {
    for (const log of properties.logs) {
      cursor.write(log);
      cursor.carriageReturn();
      cursor.moveDown();
    }
  } catch (error) {}
};

if (debugging) {
  debug.render();
}

export const debugLog = (log: string) => {
  if (!debugging) return;
  debug.reactivelyUpdateProperties(({ logs }) => ({ logs: [log, ...logs] }));
};

content.focus();

let page: Page | null = new MainMenuPage(shell);

while (page) {
  content.clearThisAndEverythingAbove();
  content.destroyChildren();
  page = await page.run(
    content,
    () => shell.userInteraction(),
    () => shell.render()
  );
}
