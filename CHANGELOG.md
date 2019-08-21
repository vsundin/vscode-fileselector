# Change Log

All notable changes to the "systemhelper" extension will be documented in this file.
## [1.1.3]

- Settings are now explicitly fetched from workspace folder, to avoid problems occuring when a .code-workspace is used.
- Also added ability to add label to an external command.

## [1.1.2]

- Refactoring of debugging calls, a named configuration in launch.json depending on file extension is used instead of setting up simplified configurations within the extension itself.

## [1.1.1]

- Added additional variables to be used when running external commands

## [1.1.0]

- Added the ability to execute external commands through configurable parameters in the settings.json (Right-click 'Run External Command')
- Also implemented the ability to start debugging of a file in the explorer or currently viewed (Right-click 'Start Debugging')

## [1.0.1]

- Changed all single backslashes to double backslashes when returning paths

## [1.0.0]

- Initial release
