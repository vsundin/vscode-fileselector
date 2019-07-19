# systemhelper README

The extension "systemhelper" was written to provide a function to list executables to be run when debugging.

## Features

The extension functions can either be called through *ctrl+shift+p* `File Selector: Get full file path` or through the *json* files,
e.g. `${command:fileselector.selectfile}`.

## Extension Settings

A setting `fileselector.file.path` can be configured in *settings.json* (Workspace or User) to adjust where executables are searched for.  
For instance, a task can be created which is calling the command: `${command:fileselector.selectfile}`. 
A string of a selected file at the `file.path` will be returned, which can be used for other purposes e.g. when debugging, as illustrated below.

For example:
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

This extension contributes the following settings:

* `fileselector.file.path`: [Array] Path to files (relative or absolute) to search (defaults to `["C:\\","./"]` if not set)
* `fileselector.file.filter`: [Array] Filter to file types (defaults to `["exe","exe"]` if not set)

Example: 
```
{
    "fileselector.file.path": [
        "C:\\",
        "./"
    ],
    "fileselector.file.filter": [
        "exe",
        "o"
    ]
}

NOTE!: The lenght of both arrays need to be the same i.e. each path added needs its own filter


## Release Notes

Release notes and updates are presented below

### 1.0.0

Initial release of System Helper

-----------------------------------------------------------------------------------------------------------