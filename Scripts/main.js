const packageFileName = nova.path.join(nova.workspace.path, "package.json");
let quoteConfig = nova.workspace.config.get(
  "mockadillo.npmimports.quote-configuration"
);
let timer = null;

nova.workspace.config.onDidChange(
  "mockadillo.npmimports.quote-configuration",
  (curr, prev) => {
    quoteConfig = curr;
  }
);

const loadPackages = (fileContents) => {
  const packageContents = JSON.parse(fileContents);
  const dependencies = packageContents.dependencies
    ? packageContents.dependencies
    : [];
  const devDependencies = packageContents.devDependencies
    ? packageContents.devDependencies
    : [];
  const allDeps = [
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
  ];

  const quoteSymbol = quoteConfig === "Single Quote" ? "'" : '"';

  const items = new Set();
  for (let i = 0; i < allDeps.length; i++) {
    const pckg = allDeps[i];

    let item = new CompletionItem(pckg, CompletionItemKind.Package);

    item.insertText = `${quoteSymbol}${pckg}${quoteSymbol}`;

    item.insertTextFormat = InsertTextFormat.Snippet;

    items.add(item);
  }

  return items;
};

exports.activate = function () {
  timer = setInterval(() => {
    if (!nova.fs.stat(packageFileName)) {
      console.log("No package.json found in workspace");
      return;
    }

    clearInterval(timer);
    timer = null;
  }, 2000);

  const fileHandle = nova.fs.open(packageFileName, "r");
  const contents = fileHandle.read();
  let packageList = loadPackages(contents);

  watcher = nova.fs.watch(packageFileName, (filename) => {
    console.log("Package.json change detected");
    try {
      const updated = fileHandle.read();

      if (updated) {
        packageList = loadPackages(updated);
      }
    } catch (e) {
      console.error(`Error while parsing package.json at ${filename}: ${e}`);
    }
  });

  nova.assistants.registerCompletionAssistant(
    "*",
    new CompletionProvider(packageList)
  );
};

exports.deactivate = function () {
  if (timer) {
    clearInterval(timer);
  }
};

class CompletionProvider {
  constructor(packages) {
    this.packages = [...packages];
  }

  packages = [];

  importRegex = /(^import[\w\s\{\}]+from [\w\-\"]+)/;
  requireRegex = /(require[\(\"\w]+)/;

  provideCompletionItems(editor, context) {
    const tstr = Date.now();
    const line = context.line.trim();
    const words = line.split(" ");
    const text = words[words.length - 1];
    let items = [];
    if (this.importRegex.test(line) || this.requireRegex.test(line)) {
      items = this.packages;
    }

    return items;
  }
}
