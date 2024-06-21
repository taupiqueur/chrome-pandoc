# Manual

## Post-installation instructions

Requires [chrome-shell] for running shell commands.

[chrome-shell]: https://github.com/taupiqueur/chrome-shell

### Allow native messaging with the shell application

Copy the extension ID and run the following in your terminal.

```
chrome-shell install [--target=<platform>] [<extension-id>...]
```

Possible targets are `chrome`, `chrome-dev`, `chrome-beta`, `chrome-canary` and `chromium`.

## Usage

`Alt+C` is the main keyboard shortcut.

Use it to copy elements in webpages with Pandoc.

### Configure keyboard shortcuts

Navigate to `chrome://extensions/shortcuts` to configure keyboard shortcuts.

### Configure the document converter program

You can also configure the document converter program by importing and exporting settings
in the “Options” page—Right-click the Pandoc toolbar button and select “Options”.

Example configuration:

``` json
{
  "converters": [
    {
      "name": "Markdown",
      "command": "pandoc",
      "args": ["-f", "html", "-t", "markdown"]
    }
  ]
}
```

Make sure the commands are in your `PATH`.

On macOS, you can set the `PATH` environment variable for all services through [launchctl].

``` sh
sudo launchctl config user path "$PATH"
```

[launchctl]: https://ss64.com/osx/launchctl.html
