# Clean Command

Clean up mailboxes.

## Usage

```bash
mm clean [account] [options]
```

## Arguments

- `account`: Specify account from config (defaults to all)

## Options

- `-q, --quiet`: Quiet mode
- `-v, --verbose`: Verbose mode

## Examples

```bash
# Clean all accounts
mm clean

# Clean specific account
mm clean work

# Quiet cleanup
mm clean --quiet
```

## See Also

- [delete](./delete.md) - Delete specific messages
- [commands](./commands.md) - Command reference