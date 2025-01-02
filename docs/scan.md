# Scan Command

Scan email folders.

## Usage

```bash
mm scan [account] [limit] [options]
```

## Arguments

- `account`: Specify account from config (defaults to MM_DEFAULT_ACCOUNT)
- `limit`: Limit number of emails to scan (default: MM_SCAN_LIMIT)

## Options

- `-b, --brief`: Brief/minimal output
- `-f, --folder`: Specify folder to scan (default: INBOX)
- `-l, --limit`: Limit number of emails to scan
- `-q, --quiet`: Quiet mode
- `-r, --read`: Mark emails as read
- `-s, --skip`: Skip number of emails to scan (default: 0)
- `-u, --unread`: Only show unread emails
- `-v, --verbose`: Verbose mode

## Examples

```bash
# Scan default account
mm scan

# Scan with limit
mm scan 10

# Scan specific account
mm scan work 5

# Show unread messages only
mm scan --unread

# Mark messages as read
mm scan --read

# Brief output format
mm scan --brief
```

## Output Format

In normal mode, each message shows:
- From address
- Subject
- Date

In brief mode (-b), output is condensed to one line per message.
In quiet mode (-q), only essential information is displayed.

## See Also

- [commands](./commands.md) - Command reference
