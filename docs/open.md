# Open Command

Launches configured email clients or web interfaces.

## Usage

```bash
mm open [what] [options]
```

## Description

The open command provides quick access to email clients:
- Opens default email client if no arguments given
- Supports multiple configured email programs
- Handles web-based email interfaces
- Smart detection of operating system defaults

## Client Selection

- Default client: 
  - **mm open**
  - **mm open [target]**  


## Options

- `-v, --verbose`: Enable detailed logging
  - Shows launch commands
  - Displays environment details
  - Logs client detection

## Supported Clients

- Outlook 
- Gmail (web)
- Other web pages

## Examples

```bash
# Open default email client
mm open

# Launch Outlook specifically
mm open outlook

# Open Gmail in browser
mm open gmail

# Open linkedin in browser
mm open li

# Open github
mm open git

# Open codemarc.net
mm open cm

```

## Exit Status

- Returns 0 on successful launch
- Returns error if client not found
- Returns error if launch fails


## Platform Support

- macOS: Uses open command
- Windows: Uses start command
- Linux: Not Implemented Yet, maybe xdg-open?

## See Also

[commands](./commands.md)

