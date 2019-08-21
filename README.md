# fileselector README

The extension "fileselector" was written to provide configurable functions which can be executed either through the command palette, 
or as context menus in the file explorer/file window.

GITHUB https://github.com/vsundin/vscode-fileselector.git

## Features

The extension functions can either be called through the command palette (`ctrl+shift+p`) `File Selector: Get full file path`,
or included *json* files, e.g. `${command:fileselector.selectfile}` as illustrated below:

```
{
    "name": "(Windows) Launch iTest",
    "type": "cppvsdbg",
    "request": "launch",
    "program": "${command:fileselector.selectfile}",
    "stopAtEntry": false,
    "externalConsole": false
},
```

## Extension Settings

The functionality of `${command:fileselector.selectfile}` includes a setting `fileselector.file.path` which can be configured through *settings.json* to adjust where files of a certain file extension are searched for. The file extension is adjusted through and `fileselector.file.filter`.
The absolute path of the selected file will be returned as a string. 

This extension contributes the following settings:

* `fileselector.debug.[file-extension]`: [String] Debugging configuration to select from launch.json, depending on the "name" parameter e.g. `{"py":{"name":"Python: Debug File"}}`. 
* `fileselector.externalCommands.commands`: [Array]  An array of external commands to execute on the selected file where the syntax is `{"label":"someLabel","command":"someCommand","args":["arg2","arg3","arg4"}`. The selected filename will be inserted as `arg1`.
* `fileselector.file.path`: [Array] Path to files (relative or absolute) to search (defaults to `["C:\\","./"]` if not set)
* `fileselector.file.filter`: [Array] Filter to file types (defaults to `["exe","exe"]` if not set)

Example: 
```
    "fileselector": {
        "debug": {
            "py": {
                "name":"Pyhon: Debug File"
            }
        },
        "externalCommands": {
            "commands": [
                {"label":"ECHO", "command":"echo","args":["Hello, World!"]}
            ]
        },
        "file": {
            "path": [
                "C:\\",
                "./"
            ],
            "filter": [
                "exe",
                "exe"
            ]
        }
    }
```

NOTE!: The lenght of both arrays need to be the same i.e. each path added needs its own filter


## Release Notes

Release notes and updates are presented below

### [1.1.4]

- Label of external command is used to name the terminal it executes in (if it exists). Otherwise the command will be used as name of the terminal.

### [1.1.3]

- Settings are now explicitly fetched from workspace folder, to avoid problems occuring when a .code-workspace is used.
- Ability to add label to external command was added.

### 1.1.2

Refactoring of debugging calls. Start of debugging process will now call the configuration in launch.json by name, depending on file extension. The name of the debugging configuration is adjustable depending on file-extension. For instance, in order to call the debugging configuration named 'Python: Debug File', the following configuration needs to be configured.
```
    "fileselector": {
        "debug": {
            "py": {
                "name":"Pyhon: Debug File"
            }
        }
    }
```
The program in the corresponding debugging configuration will be parsed and it is possible to use parameters such as `${workspaceFolder}`, `${file}`, `${relativeFile}`, `${relativeFileDirname}`, `${fileBasename}`, `${fileBasenameNoExtension}`, `${fileDirname}` and `${fileExtname}` as parameters.
This means that the same behaviour should be expected when right-clicking and "Start Debugging" as when the debugger is opened and a configuration is manually selected, with the exception that the file-extension will automatically adjust the debugging configuration selected.


### 1.1.1

Added ability to use `${workspaceFolder}`, `${file}`, `${relativeFile}`, `${relativeFileDirname}`, `${fileBasename}`, `${fileBasenameNoExtension}`, `${fileDirname}` and `${fileExtname}` as parameters when calling external commands.

### 1.1.0

Added the ability to start debugging of a selected file through right-clicking its filename in the explorer, or through right-clicking the file window and selecting `Start Debugging`. The ability to execute external commands on a selected file was also added through `Run External Command`.
Settings for which debugger to start when a file with a certain file extension is selected can be adjusted through settings in e.g. 
```
    "fileselector": {
        "debug": {
            "type": {
                "py": "python",
                "exe": "cppvsdbg"
            }
        }
    }
```
whilst settings for what external command to run are made through .e.g.
```
    "fileselector": {
        "externalCommands": [
            {
                "command": "echo",
                "args": [
                    "Hello, World!"
                ]
            }
        ]
	}


```
### 1.0.1

Changed all single backslashes to double backslashes when returning paths through `${command:fileselector.selectfile}`

### 1.0.0

Initial release of System Helper



-----------------------------------------------------------------------------------------------------------