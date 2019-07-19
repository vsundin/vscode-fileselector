// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('fileselector.selectfile', function (caller) {
		FileSelector.selectFile();
	}));
}

export class FileSelector {

	private static async selectFileGeneric(config: string, option: string): Promise<string> {
		var returner = "ERROR";
		let exePathArray = <string[]>vscode.workspace.getConfiguration(config).get(option);
		let filterConfigArray = <string[]>vscode.workspace.getConfiguration(config).get("filter");

		if (exePathArray.length !== filterConfigArray.length) {
			vscode.window.showErrorMessage(`length(${config}.${option}) != length(${config}.filter)`);
			return returner;
		} 
		let index = 0;
		if (exePathArray.length > 1){
			const tempPath = await vscode.window.showQuickPick(exePathArray,{ placeHolder: 'Select the directory to search' });
			if(tempPath === undefined){
				vscode.window.showErrorMessage(`No directory to search was selected`);
				return returner;
			}
			index = exePathArray.indexOf(<string> tempPath);
		}
		let exePath = exePathArray[index];
		let filterConfig = filterConfigArray[index];
		vscode.window.showInformationMessage(`[Configuration] [${config}.${option}] : ${exePath}`);
		if (!exePath.includes(":")) {
			exePath = path.resolve(<string>vscode.workspace.rootPath, exePath);
		}
		vscode.window.showInformationMessage(`Searching for ${filterConfig}'s in: ${exePath}`);
		if (!fs.existsSync(exePath)) {
			vscode.window.showErrorMessage(`Directory ${exePath} does not exist!`);
			return returner;
		}
		var names = fs.readdirSync(exePath).filter(function (x: String) {
			return x.endsWith(filterConfig);
		});

		let i = 0;
		if (names.length > 0) {
			const result = await vscode.window.showQuickPick(names, {
				placeHolder: 'Select file to run'
			});
			if (result) {
				vscode.window.showInformationMessage(`Selected ${filterConfig}: ${result}`);
				returner = path.join(exePath, `${result}`);
			}
			else {
				vscode.window.showErrorMessage(`No ${filterConfig} selected`);
			}
		}
		else {
			vscode.window.showErrorMessage(`No ${filterConfig}'s exist in: ${exePath}`);
		}
		return returner;
	}

	/**
	 * selectiApplToRun 
	 */
	public static async selectFile(): Promise<string> {
		return FileSelector.selectFileGeneric('fileselector.file', 'path');
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
