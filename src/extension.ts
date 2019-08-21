// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let fs = new FileSelector();
	context.subscriptions.push(vscode.commands.registerCommand('fileselector.selectfile', async function (caller) {
		await fs.selectFile();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('fileselector.debugselectedfile', async function (caller) {
		await fs.debugSelectedFile(caller);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('fileselector.runexternalcmdonselectedfile', async function (caller) {
		await fs.runExternalCommandOnSelectedFile(caller);
	}));
}

export class FileSelector {

	workspaceConfig: vscode.WorkspaceConfiguration;
	fileSelectorConfig: vscode.WorkspaceConfiguration;
	workDir: vscode.WorkspaceFolder; 

	constructor(){
		this.workDir = (<vscode.WorkspaceFolder[]>vscode.workspace.workspaceFolders)[0];
		this.workspaceConfig = vscode.workspace.getConfiguration(undefined,this.workDir.uri);
		this.fileSelectorConfig = this.workspaceConfig['fileselector'];
		if (this.fileSelectorConfig === undefined) {
			vscode.window.showErrorMessage("Config for 'fileselector' missing!");
		}
	}

	private async selectFileGeneric(): Promise<string> {
		var returner = "ERROR";
		let exePathArray = this.fileSelectorConfig['file']['path'];
		let filterConfigArray = this.fileSelectorConfig['file']['filter'];

		if (exePathArray.length !== filterConfigArray.length) {
			vscode.window.showErrorMessage(`length(fileselector.file.path) != length(fileselector.file.filter)`);
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
			exePath = path.resolve(this.workDir.uri.fsPath, exePath);
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
	public async selectFile(): Promise<string> {
		return await this.selectFileGeneric();
	}

	public async debugSelectedFile(caller: vscode.Uri) {
		let fileExtension = path.parse(caller.fsPath).ext.replace(".", "");
		
		let extensionConfig = await this.fileSelectorConfig['debug'][fileExtension];
		if (extensionConfig === undefined) {
			vscode.window.showErrorMessage("No debugging alternative available for files of type: [ " + fileExtension + " ]");
			return;
		}
		let debugConfigName: string = extensionConfig['name'];
		//let workspaceDebugConfig = vscode.workspace.getConfiguration(undefined,vscode.Uri.parse("file:///"+path.join(workDir.uri.fsPath,'.vscode','launch.json')));
		function findElement(arr:Object[], propName:string, propValue:string):Object | undefined {
			let elem = undefined;
			arr.forEach(async(element) => {
				if (Object(element)[propName] === propValue){
					elem=element;
					return;
				}
			});
			return elem;
		}
		let debugConfig = await findElement(this.workspaceConfig['launch']['configurations'],'name',debugConfigName);
		if (debugConfig !== undefined) {
			vscode.window.showInformationMessage("Starting debug config: "+debugConfigName);
			let newDebugConfiguration:vscode.DebugConfiguration = <vscode.DebugConfiguration> debugConfig;
			for(var key in newDebugConfiguration){
				newDebugConfiguration[key] = await this.replaceEnvironmentVariables(newDebugConfiguration[key],caller);
			}
			vscode.debug.startDebugging(this.workDir,newDebugConfiguration);
		}else{
			vscode.window.showErrorMessage("Debug config named: "+debugConfigName+" does not exist!");
		}
	}

	public async runExternalCommandOnSelectedFile(caller: vscode.Uri) {
		let fileselectorConfig = vscode.workspace.getConfiguration('fileselector');
		let commands:string[] = [];
		(<Object[]> fileselectorConfig.get('externalCommands')).forEach(async (command) =>{
			if(Object(command)['label']!== undefined) {
				commands.push(<string>Object(command)['label']);
			} else {
				let cmd = await this.replaceEnvironmentVariables(Object(command)['command'],caller);
				commands.push(<string>cmd);
			}
		});

		let selectedItem = 0;
		let commandToExecute="";
		await vscode.window.showQuickPick(commands,{ 
			placeHolder: 'Select the directory to search',
			onDidSelectItem: async (item) => {
				selectedItem = commands.indexOf(item.toString());
				commandToExecute=<string> await this.replaceEnvironmentVariables(fileselectorConfig['externalCommands'][selectedItem]['command'],caller);		
			}
		});
		if (commandToExecute !== undefined) {
			if (commandToExecute.split(" ").length > 1) {
				vscode.window.showErrorMessage("Args in " + commandToExecute + " should be added through 'fileselector.externalCommand.args'");
				return;
			}
			let replacedArgs: string[] = [];
			let args:String[] = (Object(fileselectorConfig.get('externalCommands'))[selectedItem])['args'];
			let label:string = fileselectorConfig['externalCommands'][selectedItem]['label'];
			if (label === undefined){
				label = commandToExecute;
			}
			let argsString = args.join(" ");
			let newArgs = await this.replaceEnvironmentVariables(argsString,caller);
			let termFunc = function () {
				let fullCommandToExecute = commandToExecute + " " + caller.fsPath + " " + newArgs;
				let newTerm: vscode.Terminal;
				let terminals = vscode.window.terminals;
				let termNames:string[] = [];
				let termInstances: vscode.Terminal[] = [];
				terminals.forEach(term => {
					if (term.name === label){
						termInstances.push(term);
						return;
					}
				});
				if(termInstances.length !== 0){
					newTerm=termInstances[0];
				} else {
					newTerm = vscode.window.createTerminal({ name: label });
				}
				newTerm.show();
				vscode.window.showInformationMessage("Running command: "+fullCommandToExecute);
				newTerm.sendText(<string>fullCommandToExecute);
			};
			termFunc();

		}



	}

	private async replaceEnvironmentVariables(sentence:string|object, caller: vscode.Uri): Promise<object|string|undefined> {
		if (typeof sentence === 'string'){
			let newSentence:string = sentence
			.replace("${workspaceFolder}", this.workDir.uri.fsPath)
			.replace("${file}", caller.fsPath)
			.replace("${relativeFile}", (caller.fsPath).replace(this.workDir.uri.fsPath,""))
			.replace("${relativeFileDirname}", path.dirname((caller.fsPath)).replace(this.workDir.uri.fsPath,""))
			.replace("${fileBasename}", path.basename(caller.fsPath))
			.replace("${fileBasenameNoExtension}", path.basename(caller.fsPath,path.extname(caller.fsPath)))
			.replace("${fileDirname}", path.dirname(caller.fsPath))
			.replace("${fileExtname}", path.extname(caller.fsPath));
			return newSentence;
		} else if (typeof sentence === 'object') {
			let newObject:Object = Object(sentence);
			for(var key in newObject){
				Object(newObject)[key]= <object> await this.replaceEnvironmentVariables(Object(newObject)[key],caller);	
			}
			return newObject;
		}
		else {
			return sentence;
		}
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
