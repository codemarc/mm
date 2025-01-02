# Delete Command

Delete email.

## Usage

```bash
mm delete <account> [options]
```

## Description

The delete command removes messages using one of these methods:
- Moving folder contents to trash
- Deleting specific messages by index
- Deleting specific messages by sequence number

## Arguments

- `account`: Required - specify account from config

## Options

- `-f, --folder`: Move content of the named folder to trash
- `-i, --index`: Index(s) of email to delete, comma separated, ':' for a range
- `-s, --seqno`: Seqno(s) of email to delete, comma separated, ':' for a range
- `-q, --quiet`: Quiet mode
- `-v, --verbose`: Verbose mode

## Examples

```bash
# Delete from folder
mm delete work --folder "Spam"

# Delete specific messages
mm delete personal --index 1,2,3

# Delete sequence range
mm delete gmail --seqno 1:10

# Quiet deletion
mm delete work --index 1 --quiet
```

## Notes

- Account argument is required
- Messages are moved to Trash folder
- Use verbose mode to preview actions

## See Also

- [clean](./clean.md) - Cleanup operations
- [commands](./commands.md) - Command reference

