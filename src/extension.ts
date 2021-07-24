// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { FabricTaskProvider } from "./fabricTaskProvider";

let fabricTaskProvider: vscode.Disposable | undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.rootPath;
  if (!workspaceRoot) {
    return;
  }

  fabricTaskProvider = vscode.tasks.registerTaskProvider(
    FabricTaskProvider.fabricType,
    new FabricTaskProvider(workspaceRoot)
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
  if (fabricTaskProvider) {
    fabricTaskProvider.dispose();
  }
}
