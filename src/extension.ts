// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { isUndefined } from 'util';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('fileselector.selectfile', async function (caller) {
		await FileSelector.selectFile();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('fileselector.debugselectedfile', async function (caller) {
		await FileSelector.debugSelectedFile(caller);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('fileselector.runexternalcmdonselectedfile', async function (caller) {
		await FileSelector.runExternalCommandOnSelectedFile(caller);
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
		if (exePathArray.length > 1) {
			const tempPath = await vscode.window.showQuickPick(exePathArray, { placeHolder: 'Select the directory to search' });
			if (tempPath === undefined) {
				vscode.window.showErrorMessage(`No directory to search was selected`);
				return returner;
			}
			index = exePathArray.indexOf(<string>tempPath);
		}
		let exePath = exePathArray[index];
		let filterConfig = filterConfigArray[index];
		//vscode.window.showInformationMessage(`[Configuration] [${config}.${option}] : ${exePath}`);
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
				vscode.window.showInformationMessage(`Selected: ${result}`);
				returner = path.join(exePath, `${result}`);
				//Replace all backslashes with double backslashes to be printable
				returner = returner.replace("\\", "\\\\");
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
		return await FileSelector.selectFileGeneric('fileselector.file', 'path');
	}

	public static async debugSelectedFile(caller: vscode.Uri) {
		let workDir: vscode.WorkspaceFolder = (<vscode.WorkspaceFolder[]>vscode.workspace.workspaceFolders)[0];
		let fileExtension = path.parse(caller.fsPath).ext.replace(".", "");
		let debugTypeConfigs = vscode.workspace.getConfiguration('fileselector.debug');
		
		let extensionConfig = debugTypeConfigs[fileExtension];
		if (extensionConfig === undefined) {
			vscode.window.showErrorMessage("No debugging alternative available for files of type: [ " + fileExtension + " ]");
			return;
		}
		let debugConfig: vscode.DebugConfiguration = {
			name: "Generic Debug",
			type: extensionConfig["type"],
			request: "launch",
			program: await FileSelector.replaceEnvironmentVariables(extensionConfig["program"],caller),
			stopAtEntry: true
		};
		let cwd = await FileSelector.replaceEnvironmentVariables(extensionConfig["cwd"],caller);
		let env = await FileSelector.replaceEnvironmentVariables(extensionConfig["env"],caller);
		let envFile = await FileSelector.replaceEnvironmentVariables(extensionConfig["envFile"],caller);
		if (cwd !== undefined) {debugConfig.cwd = cwd;}
		if (env !== undefined && env !== "") {debugConfig.env = env;}
		if (envFile !== undefined && env !== "") {debugConfig.envFile = envFile;}
		vscode.window.showInformationMessage("Starting debugging of: "+caller.fsPath);
		vscode.debug.startDebugging(workDir, debugConfig);
	}

	public static async runExternalCommandOnSelectedFile(caller: vscode.Uri) {
		let fileselectorConfig = vscode.workspace.getConfiguration('fileselector');
		let commands:string[] = [];
		(<Object[]> fileselectorConfig.get('externalCommands')).forEach(async (command) =>{
			let cmd = await FileSelector.replaceEnvironmentVariables(Object(command)['command'],caller);
			commands.push(cmd);
		});

		let selectedItem = 0;
		let commandToExecute = await vscode.window.showQuickPick(commands,{ 
			placeHolder: 'Select the directory to search',
			onDidSelectItem: (item) => {
				selectedItem = commands.indexOf(item.toString());
			}
		});
		if (commandToExecute !== undefined) {
			if (commandToExecute.split(" ").length > 1) {
				vscode.window.showErrorMessage("Args in " + commandToExecute + " should be added through 'fileselector.externalCommand.args'");
				return;
			}
			let replacedArgs: string[] = [];
			let args:String[] = (Object(fileselectorConfig.get('externalCommands'))[selectedItem])['args'];
			let argsString = args.join(" ");
			let newArgs = await FileSelector.replaceEnvironmentVariables(argsString,caller);
			let termFunc = function () {
				let fullCommandToExecute = commandToExecute + " " + caller.fsPath + " " + newArgs;
				let newTerm: vscode.Terminal;
				let terminals = vscode.window.terminals;
				let termNames:string[] = [];
				let termInstances: vscode.Terminal[] = [];
				terminals.forEach(term => {
					if (term.name === commandToExecute){
						termInstances.push(term);
						return;
					}
				});
				if(termInstances.length !== 0){
					newTerm=termInstances[0];
				} else {
					newTerm = vscode.window.createTerminal({ name: commandToExecute });
				}
				newTerm.show();
				vscode.window.showInformationMessage("Running command: "+fullCommandToExecute);
				newTerm.sendText(<string>fullCommandToExecute);
			};
			termFunc();

		}



	}

	private static async replaceEnvironmentVariables(sentence: string,caller: vscode.Uri): Promise<string> {
		if (typeof sentence === 'string'){
			let newSentence:string = sentence
			.replace("${workspaceFolder}", <string>vscode.workspace.rootPath)
			.replace("${file}", caller.fsPath)
			.replace("${relativeFile}", (caller.fsPath).replace(<string>vscode.workspace.rootPath,""))
			.replace("${relativeFileDirname}", path.dirname((caller.fsPath)).replace(<string>vscode.workspace.rootPath,""))
			.replace("${fileBasename}", path.basename(caller.fsPath))
			.replace("${fileBasenameNoExtension}", path.basename(caller.fsPath,path.extname(caller.fsPath)))
			.replace("${fileDirname}", path.dirname(caller.fsPath))
			.replace("${fileExtname}", path.extname(caller.fsPath));
			return newSentence;
		} else {
			return "";
		}


	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
