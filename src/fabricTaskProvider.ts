import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as vscode from 'vscode';

export class FabricTaskProvider implements vscode.TaskProvider {

    static fabricType = 'fabric';

	private fabricPromise: Thenable<vscode.Task[]> | undefined = undefined;

	constructor(workspaceRoot: string) {
		const pattern = path.join(workspaceRoot, 'fabfile.py');
		const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
		fileWatcher.onDidChange(() => this.fabricPromise = undefined);
		fileWatcher.onDidCreate(() => this.fabricPromise = undefined);
		fileWatcher.onDidDelete(() => this.fabricPromise = undefined);
	}

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		if (!this.fabricPromise) {
			this.fabricPromise = getFabricTasks();
		}
		return this.fabricPromise;
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const task = _task.definition.task;
		// A Fabric task consists of a task and an optional file as specified in FabricTaskDefinition
		// Make sure that this looks like a Fabric task by checking that there is a task.
		if (task) {
			// resolveTask requires that the same definition object be used.
			const definition: FabricTaskDefinition = <any>_task.definition;
			return new vscode.Task(
                definition,
                _task.scope ?? vscode.TaskScope.Workspace,
                definition.name,
                'fabric',
                new vscode.ShellExecution(`fab ${definition.name}`)
            );
		}
		return undefined;
	}
}

function exists(file: string): Promise<boolean> {
	return new Promise<boolean>((resolve, _reject) => {
		fs.exists(file, (value) => {
			resolve(value);
		});
	});
}

function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		cp.exec(command, options, (error, stdout, stderr) => {
			if (error) {
				reject({ error, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
}

let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
	if (!_channel) {
		_channel = vscode.window.createOutputChannel('Fabric Auto Detection');
	}
	return _channel;
}

interface FabricTaskDefinition extends vscode.TaskDefinition {
	/**
	 * The task name
	 */
	name: string;

	/**
	 * The fabfile containing the task
	 */
	file?: string;

    description?: string;
}

async function getFabricTasks(): Promise<vscode.Task[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const result: vscode.Task[] = [];
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return result;
	}
	for (const workspaceFolder of workspaceFolders) {
		const folderString = workspaceFolder.uri.fsPath;
		if (!folderString) {
			continue;
		}
		const fabricFile = path.join(folderString, 'fabfile.py');
		if (!await exists(fabricFile)) {
			continue;
		}

		const commandLine = 'fab -l -F json';
		try {
			const { stdout, stderr } = await exec(commandLine, { cwd: folderString });
			if (stderr && stderr.length > 0) {
				getOutputChannel().appendLine(stderr);
				getOutputChannel().show(true);
			}
			if (stdout) {
                let tasks = JSON.parse(stdout);
				for (const taskInfo of tasks.tasks) {
                    const kind: FabricTaskDefinition = {
                        type: 'fabric',
                        name: taskInfo.name,
                        description: taskInfo.help ?? ''
                    };
                    const task = new vscode.Task(
                        kind,
                        workspaceFolder,
                        taskInfo.name,
                        'fabric',
                        new vscode.ShellExecution(`fab ${taskInfo.name}`)
                    );
                    result.push(task);
				}
			}
		} catch (err) {
			const channel = getOutputChannel();
			if (err.stderr) {
				channel.appendLine(err.stderr);
			}
			if (err.stdout) {
				channel.appendLine(err.stdout);
			}
			channel.appendLine('Auto detecting fabric tasks failed.');
			channel.show(true);
		}
	}
	return result;
}
