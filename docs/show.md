# Show Command

Display detailed information about messages and accounts.

## Usage

```bash
mm show [target] [options]
```

## Description

The show command can display:
- Message contents by index or sequence number
- Account settings and status
- Folder statistics and quotas

## Options

- `-i, --index`: Show message by index position
- `-s, --seqno`: Show message by sequence number
- `-f, --folder`: Select source folder (default: INBOX)
- `-v, --verbose`: Show raw message headers
- `-q, --quiet`: Show only message body

## Examples

```bash
# Show newest message
mm show --index 1

# Show specific message
mm show --seqno 2201

# Show account details
mm show work

# Show folder stats
mm show --folder Archive
```

## Output Format

Message display includes:
- Headers (From, To, Subject, Date)
- Content type and encoding
- Message body (text or HTML)
- Attachments list

## See Also

- [scan](./scan.md) - List messages
- [commands](./commands.md)
