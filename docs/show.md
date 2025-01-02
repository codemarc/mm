# Show Command

Display configuration and status information.

## Usage

```bash
mm show [account] [options]
```

## Description

The show command displays:
- Account configuration details
- Message counts
- Folder structure and status
- Account list

## Options

- `-c, --counts`: Show message counts
- `-f, --folder`: Show folder or counts
- `-l, --list`: Show all accounts
- `-q, --quiet`: Quiet mode
- `-v, --verbose`: Verbose mode

## Examples

```bash
# Show all accounts
mm show

# Show specific account
mm show work

# Show message counts
mm show --counts

# Show folder structure
mm show --folder

# List all accounts
mm show --list
```

## See Also

- [commands](./commands.md) - Command reference

