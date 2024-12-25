# Scan Command Documentation

The scan command allows you to inspect and manage email messages across your configured accounts.

## Usage

```bash
mm scan [account] [options]
```

## Arguments

- `account`: (Optional) Specify which account to scan. Defaults to all accounts if not specified.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --folder` | Specify folder to scan | INBOX |
| `-g, --archive` | Use archive folder instead | All Mail/Archive |
| `-l, --limit` | Maximum number of emails to scan | 5 |
| `-q, --quiet` | Output only message sequence numbers | false |
| `-r, --read` | Mark scanned emails as read | false |
| `-s, --skip` | Number of emails to skip | 0 |
| `-u, --unread` | Only show unread emails | false |
| `-v, --verbose` | Show detailed logging | false |
| `-z, --zero` | Mark all messages as read | false |

## Examples

```bash
# Scan all accounts
mm scan

# Scan specific account
mm scan work

# Show only unread messages
mm scan -u

# Scan archive folder
mm scan -g

# Show last 10 messages
mm scan -l 10

# Mark messages as read while scanning
mm scan -r

# Zero out unread count
mm scan -z
```

## Blacklist Handling

When scanning, the command checks messages against account blacklists:
- Full email addresses are matched exactly
- Domain-only entries match any email from that domain
- Blacklisted messages are automatically moved to the "Blacklisted" folder

## Output Format

In normal mode, each message shows:
- Sequence number
- From address
- To address
- Subject
- Date

In quiet mode (-q), only sequence numbers are output.
